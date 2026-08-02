-- ═══════════════════════════════════════════════════════════════════════════
-- Clopotelul si emailul Adminului, aliniate la §21.1 si §24.5
--
-- Trei lucruri pe care analiza pe spec le-a gasit lipsa:
--
--   1. §21.1 — la o rezervare noua din widget, Adminul primea DOAR push-ul
--      din aplicatie (notificarea Realtime). Emailul — celalalt canal cerut,
--      gratuit si nelimitat — nu exista: functia trimite-email stia sa scrie
--      doar clientului. Trigger-ul de aici trimite acum si {tip:
--      'rezervare_noua_admin'}, pe acelasi drum pg_net + secret din vault.
--
--   2. §24.5 — „un restaurant a ramas fara credite" aparea DOAR in clopotelul
--      echipei TableX (destinatie super_admin). Spec-ul o cere si la Admin —
--      el e cel care poate reincarca. anunta_credite_epuizate scrie acum in
--      ambele clopotele, fiecare cu deduplicarea lui pe necitite.
--
--   3. §24.5 — tipul 'masa_expirare' exista in enum de la inceput, dar nimic
--      nu-l genera vreodata. Un job pg_cron la 5 minute anunta mesele care se
--      elibereaza in urmatoarele 20 de minute (§7.4), o singura data per
--      rezervare — dedup pe reservation_id, coloana exista deja.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Emailul catre Admin, din acelasi trigger ────────────────────────────
-- Semnatura neschimbata: create or replace pastreaza trigger-ul si drepturile.
create or replace function public.email_cerere_widget()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url    text;
  v_anon   text;
  v_secret text;
begin
  -- Doar cererile venite din widget: personalul care introduce o rezervare in
  -- panou nu are nevoie de email despre propria actiune.
  if new.sursa <> 'widget' then
    return null;
  end if;

  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'tablex_url_functii';
  select decrypted_secret into v_anon   from vault.decrypted_secrets where name = 'tablex_cheie_anon';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'tablex_secret_webhook';

  if v_url is null or v_anon is null or v_secret is null then
    return null;
  end if;

  -- Confirmarea de primire catre CLIENT — doar daca si-a lasat emailul.
  if new.email is not null then
    perform net.http_post(
      url     := rtrim(v_url, '/') || '/trimite-email',
      headers := jsonb_build_object(
                   'Content-Type',     'application/json',
                   'Authorization',    'Bearer ' || v_anon,
                   'x-tablex-webhook', v_secret
                 ),
      body    := jsonb_build_object('tip', 'rezervare_noua', 'id', new.id),
      timeout_milliseconds := 5000
    );
  end if;

  -- §21.1 — anuntul catre ADMIN pleaca intotdeauna, indiferent de client.
  perform net.http_post(
    url     := rtrim(v_url, '/') || '/trimite-email',
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'Authorization',    'Bearer ' || v_anon,
                 'x-tablex-webhook', v_secret
               ),
    body    := jsonb_build_object('tip', 'rezervare_noua_admin', 'id', new.id),
    timeout_milliseconds := 5000
  );

  return null;
exception when others then
  -- Best-effort, ca peste tot la emailuri.
  raise warning 'Emailul de primire nu a putut fi programat: %', sqlerrm;
  return null;
end;
$$;

-- ── 2. Creditele epuizate anunta si Adminul ────────────────────────────────
create or replace function public.anunta_credite_epuizate(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nume text;
begin
  select r.nume into v_nume from public.restaurants r where r.id = p_restaurant_id;

  -- Clopotelul echipei TableX — o singura notificare necitita per restaurant.
  if not exists (
    select 1 from public.notificari n
    where n.destinatie = 'super_admin'
      and n.tip = 'credite_epuizate'
      and n.restaurant_id = p_restaurant_id
      and n.citita_la is null
  ) then
    insert into public.notificari (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
    values (
      p_restaurant_id, 'super_admin', 'credite_epuizate', 'galben',
      'Fara credite WhatsApp: ' || coalesce(v_nume, 'restaurant'),
      'Mesajele automate nu se mai trimit pana la reincarcare.'
    );
  end if;

  -- Clopotelul ADMINULUI (§24.5) — el e cel care poate reincarca.
  if not exists (
    select 1 from public.notificari n
    where n.destinatie = 'admin'
      and n.tip = 'credite_epuizate'
      and n.restaurant_id = p_restaurant_id
      and n.citita_la is null
  ) then
    insert into public.notificari (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
    values (
      p_restaurant_id, 'admin', 'credite_epuizate', 'galben',
      'Creditele WhatsApp s-au terminat',
      'Confirmarile si reminderele WhatsApp nu se mai trimit. Reincarca din Setari.'
    );
  end if;
end;
$$;

revoke execute on function public.anunta_credite_epuizate(uuid) from public, anon, authenticated;

-- ── 3. Mesele care se elibereaza in curand (§24.5, pragul din §7.4) ────────
create or replace function public.anunta_mese_in_expirare()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rez record;
  v_anuntate integer := 0;
begin
  for v_rez in
    select r.id, r.restaurant_id, r.client_nume, r.se_termina_la, t.numar_masa,
           rest.fus_orar
      from public.reservations r
      join public.tables t on t.id = r.table_id
      join public.restaurants rest on rest.id = r.restaurant_id
     where r.status = 'sosita'
       and rest.status = 'activ'
       and r.se_termina_la >  now()
       and r.se_termina_la <= now() + interval '20 minutes'
       and not exists (
         select 1 from public.notificari n
          where n.reservation_id = r.id and n.tip = 'masa_expirare'
       )
  loop
    insert into public.notificari
      (restaurant_id, destinatie, tip, urgenta, titlu, mesaj, reservation_id)
    values (
      v_rez.restaurant_id, 'admin', 'masa_expirare', 'galben',
      'Masa ' || v_rez.numar_masa || ' se elibereaza in curand',
      v_rez.client_nume || ' termina la ' ||
        to_char(v_rez.se_termina_la at time zone coalesce(v_rez.fus_orar, 'Europe/Bucharest'), 'HH24:MI') || '.',
      v_rez.id
    );
    v_anuntate := v_anuntate + 1;
  end loop;

  return v_anuntate;
end;
$$;

revoke execute on function public.anunta_mese_in_expirare() from public, anon, authenticated;

select cron.schedule(
  'mese-in-expirare',
  '*/5 * * * *',
  $$select public.anunta_mese_in_expirare()$$
);
