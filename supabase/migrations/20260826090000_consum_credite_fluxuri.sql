-- ═══════════════════════════════════════════════════════════════════════════
-- Consumul de credite WhatsApp, legat in sfarsit de fluxuri (§16.2, §21.2)
--
-- GAURA GASITA de analiza pe spec: consuma_credit exista, era aparat corect,
-- dar nu-l apela nimeni. Contabilitatea creditelor era un mecanism perfect
-- care nu se invartea niciodata.
--
-- Ce cere spec-ul:
--   §16.2 — la TRIMITEREA cererii din widget si la ACCEPTARE/RESPINGERE,
--     sistemul incearca si WhatsApp: mesajul pleaca DOAR daca exista credite
--     (1 credit/mesaj); fara credite, nu pleaca si nu e eroare pentru client.
--   §21.2 — reminder cu 2h inainte, EXCLUSIV WhatsApp, doar pe credite,
--     fara fallback pe email/push.
--
-- Cum se leaga:
--   1. Miezul devine consuma_credit_intern(restaurant, ...) — apelabil din
--      alte functii ale bazei, nu din REST. rezerva_public il cheama la
--      cererea din widget (apelantul e ANON, deci consumul TREBUIE sa se
--      intample in baza — current_restaurant_id() e null pentru el).
--   2. consuma_credit (RPC-ul clientului) devine o coaja peste miez si
--      primeste si reservation_id — lista de parametri se schimba, deci
--      DROP + CREATE + grant-uri reasezate (lectia din CLAUDE.md, regula 7).
--   3. Reminder-ul de 2h ruleaza din pg_cron, la 5 minute: fereastra
--      [1h50m, 2h10m) inainte de rezervare, deduplicat pe reservation_id —
--      de-asta whatsapp_mesaje primeste coloana asta acum.
--
-- §14 ramane in vigoare: nimic nu pleaca REAL spre Meta. „Trimis" inseamna
-- credit consumat + rand in jurnal — exact ce va face si integrarea reala,
-- minus apelul HTTP.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Jurnalul cunoaste rezervarea care a declansat mesajul ──────────────────
alter table public.whatsapp_mesaje
  add column if not exists reservation_id uuid references public.reservations(id) on delete set null;

create index if not exists whatsapp_mesaje_reservation_idx
  on public.whatsapp_mesaje (reservation_id)
  where reservation_id is not null;

-- ── Miezul, pentru apeluri din baza ────────────────────────────────────────
create or replace function public.consuma_credit_intern(
  p_restaurant_id uuid,
  p_telefon text,
  p_sablon  text,
  p_continut text default null,
  p_reservation_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_restaurant_id is null or nullif(btrim(coalesce(p_telefon, '')), '') is null then
    return false;
  end if;

  if public.credite_whatsapp(p_restaurant_id) < 1 then
    insert into public.whatsapp_mesaje
      (restaurant_id, telefon, sablon, continut, status, eroare, reservation_id)
    values
      (p_restaurant_id, p_telefon, p_sablon, p_continut, 'esuat', 'Fara credite disponibile', p_reservation_id);

    perform public.anunta_credite_epuizate(p_restaurant_id);
    return false;
  end if;

  insert into public.whatsapp_tranzactii (restaurant_id, tip, credite, descriere)
  values (p_restaurant_id, 'consum', -1, format('Mesaj: %s', p_sablon));

  insert into public.whatsapp_mesaje
    (restaurant_id, telefon, sablon, continut, status, reservation_id)
  values
    (p_restaurant_id, p_telefon, p_sablon, p_continut, 'trimis', p_reservation_id);

  if public.credite_whatsapp(p_restaurant_id) = 0 then
    perform public.anunta_credite_epuizate(p_restaurant_id);
  end if;

  return true;
end;
$$;

revoke execute on function public.consuma_credit_intern(uuid, text, text, text, uuid)
  from public, anon, authenticated;

-- ── RPC-ul clientului: semnatura se schimba, deci DROP + CREATE ────────────
drop function if exists public.consuma_credit(text, text, text);

create function public.consuma_credit(
  p_telefon text,
  p_sablon  text,
  p_continut text default null,
  p_reservation_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  return public.consuma_credit_intern(v_restaurant, p_telefon, p_sablon, p_continut, p_reservation_id);
end;
$$;

-- Drepturile se pierd la DROP si se reaseaza aici — nu se mostenesc.
revoke execute on function public.consuma_credit(text, text, text, uuid) from public, anon;
grant execute on function public.consuma_credit(text, text, text, uuid) to authenticated;

-- ── rezerva_public consuma la cererea din widget (§16.2) ───────────────────
-- Semnatura ramane identica: create or replace pastreaza grant-urile.
-- Corpul e cel din migratia 23 + un singur adaos, inainte de return.
create or replace function public.rezerva_public(
  p_slug text,
  p_client_nume text,
  p_telefon text,
  p_nr_persoane integer,
  p_data_ora timestamptz,
  p_zone_id uuid default null,
  p_email text default null,
  p_note_client text default null,
  p_gdpr boolean default false,
  p_campuri_custom jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_rest      public.restaurants;
  v_nume      text := nullif(btrim(p_client_nume), '');
  v_telefon   text := nullif(btrim(p_telefon), '');
  v_customer  uuid;
  v_status    public.rezervare_status;
  v_id        uuid;
  v_recente   integer;
  v_camp      public.formular_campuri;
  v_valoare   text;
  v_custom    jsonb := coalesce(p_campuri_custom, '{}'::jsonb);
begin
  select * into v_rest
    from public.restaurants r
   where r.slug = p_slug and r.status = 'activ';

  if not found then
    raise exception 'Restaurantul nu a fost gasit sau nu accepta rezervari.'
      using errcode = 'P0001';
  end if;

  if v_nume is null or v_telefon is null then
    raise exception 'Numele si telefonul sunt obligatorii.' using errcode = 'P0001';
  end if;

  if not p_gdpr then
    raise exception 'Rezervarea necesita acordul pentru prelucrarea datelor.'
      using errcode = 'P0001';
  end if;

  if p_nr_persoane is null or p_nr_persoane < 1 or p_nr_persoane > 50 then
    raise exception 'Numarul de persoane trebuie sa fie intre 1 si 50.'
      using errcode = 'P0001';
  end if;

  if p_data_ora <= now() then
    raise exception 'Alege un interval din viitor.' using errcode = 'P0001';
  end if;

  if p_data_ora > now() + interval '6 months' then
    raise exception 'Rezervarile se accepta cu maximum 6 luni inainte.'
      using errcode = 'P0001';
  end if;

  if not public.este_deschis(v_rest.id, p_data_ora) then
    raise exception 'Restaurantul este inchis in intervalul ales.'
      using errcode = 'P0001';
  end if;

  if v_custom is not null and jsonb_typeof(v_custom) <> 'object' then
    raise exception 'Raspunsurile la campurile suplimentare trebuie sa fie un obiect.'
      using errcode = 'P0001';
  end if;

  for v_camp in
    select * from public.formular_campuri f
     where f.restaurant_id = v_rest.id and f.activ and not f.sistem
  loop
    v_valoare := nullif(btrim(coalesce(v_custom ->> v_camp.cheie, '')), '');

    if v_camp.obligatoriu and v_valoare is null then
      raise exception 'Campul "%" este obligatoriu.', v_camp.eticheta
        using errcode = 'P0001';
    end if;

    if v_valoare is not null and v_camp.tip = 'dropdown'
       and jsonb_typeof(v_camp.optiuni) = 'array'
       and not (v_camp.optiuni ? v_valoare) then
      raise exception 'Valoare invalida pentru campul "%".', v_camp.eticheta
        using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(jsonb_object_agg(f.cheie, v_custom -> f.cheie), '{}'::jsonb)
    into v_custom
    from public.formular_campuri f
   where f.restaurant_id = v_rest.id and f.activ and not f.sistem
     and v_custom ? f.cheie;

  select count(*) into v_recente
    from public.reservations res
   where res.restaurant_id = v_rest.id
     and res.telefon = v_telefon
     and res.created_at > now() - interval '24 hours';

  if v_recente >= 5 then
    raise exception 'Prea multe cereri de la acest numar. Contacteaza restaurantul telefonic.'
      using errcode = 'P0001';
  end if;

  insert into public.customers (restaurant_id, telefon, nume, email, gdpr_consimtamant)
  values (v_rest.id, v_telefon, v_nume, p_email, p_gdpr)
  on conflict (restaurant_id, telefon) do update
     set nume              = coalesce(customers.nume, excluded.nume),
         email             = coalesce(customers.email, excluded.email),
         gdpr_consimtamant = customers.gdpr_consimtamant or excluded.gdpr_consimtamant
  returning id into v_customer;

  v_status := case when v_rest.aprobare_automata then 'confirmata' else 'pending' end;

  insert into public.reservations (
    restaurant_id, zone_id, customer_id, client_nume, telefon, email,
    nr_persoane, data_ora, durata_minute, buffer_minute, se_termina_la,
    blocat_pana_la, status, sursa, note_client, gdpr_consimtamant, campuri_custom
  )
  values (
    v_rest.id, p_zone_id, v_customer, v_nume, v_telefon, p_email,
    p_nr_persoane, p_data_ora, null, null, null,
    null, v_status, 'widget', p_note_client, p_gdpr, v_custom
  )
  returning id into v_id;

  -- §16.2: confirmarea de primire incearca si WhatsApp. Consumul se face AICI,
  -- in baza — apelantul e anonim si nu are (corect) niciun drept pe wallet.
  -- Fara credite, mesajul doar nu pleaca; rezervarea e deja salvata.
  perform public.consuma_credit_intern(
    v_rest.id,
    v_telefon,
    case when v_status = 'confirmata' then 'Confirmare Rezervare' else 'Cerere primita' end,
    format('%s, cererea ta la %s pentru %s persoane a fost inregistrata.',
           v_nume, v_rest.nume, p_nr_persoane),
    v_id
  );

  return jsonb_build_object('id', v_id, 'status', v_status, 'restaurant', v_rest.nume);
end;
$function$;

-- ── Reminder-ul de 2h (§21.2), din pg_cron ─────────────────────────────────
create or replace function public.trimite_remindere_whatsapp()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rez record;
  v_trimise integer := 0;
begin
  -- Fereastra [1h50m, 2h10m) + rulare la 5 minute: fiecare rezervare trece
  -- prin fereastra cel putin o data; dedup-ul pe reservation_id + sablon
  -- garanteaza ca primeste un singur reminder chiar daca trece de doua ori.
  for v_rez in
    select r.id, r.restaurant_id, r.telefon, r.client_nume, r.data_ora, r.nr_persoane,
           rest.nume as restaurant_nume, rest.fus_orar
      from public.reservations r
      join public.restaurants rest on rest.id = r.restaurant_id
     where r.status = 'confirmata'
       and r.telefon is not null
       and rest.status = 'activ'
       and r.data_ora >  now() + interval '1 hour 50 minutes'
       and r.data_ora <= now() + interval '2 hours 10 minutes'
       and not exists (
         select 1 from public.whatsapp_mesaje m
          where m.reservation_id = r.id and m.sablon = 'Reminder 2 ore'
       )
  loop
    if public.consuma_credit_intern(
         v_rez.restaurant_id,
         v_rez.telefon,
         'Reminder 2 ore',
         format('%s, te asteptam la %s la ora %s (%s persoane).',
                v_rez.client_nume,
                v_rez.restaurant_nume,
                to_char(v_rez.data_ora at time zone coalesce(v_rez.fus_orar, 'Europe/Bucharest'), 'HH24:MI'),
                v_rez.nr_persoane),
         v_rez.id
       ) then
      v_trimise := v_trimise + 1;
    end if;
  end loop;

  return v_trimise;
end;
$$;

revoke execute on function public.trimite_remindere_whatsapp() from public, anon, authenticated;

create extension if not exists pg_cron;

-- cron.schedule pe acelasi nume actualizeaza jobul in loc sa-l dubleze
-- (pg_cron >= 1.4); il programam la 5 minute.
select cron.schedule(
  'remindere-whatsapp',
  '*/5 * * * *',
  $$select public.trimite_remindere_whatsapp()$$
);
