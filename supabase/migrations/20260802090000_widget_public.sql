-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 10. Widget public de rezervare + realtime
--
-- Problema: RLS interzice (corect) unui vizitator anonim sa citeasca zones,
-- tables sau floor_plan_layers. Dar widgetul de pe /r/<slug> are nevoie de
-- exact trei lucruri: identitatea restaurantului, geometria salii si un mod de
-- a trimite o cerere de rezervare.
--
-- Soluția, pe acelasi model ca restaurante_publice din migratia 05: vederi cu
-- coloane alese explicit (fara cui, discount, note interne) plus un RPC care
-- valideaza singur ce accepta. Nicio politica noua pe tabelele de baza.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Geometria publica a salii ────────────────────────────────────────────
create view public.zone_publice as
  select z.id, z.restaurant_id, z.nume, z.ordine_afisare,
         z.canvas_latime, z.canvas_inaltime, z.grid_marime
    from public.zones z
    join public.restaurants r on r.id = z.restaurant_id
   where z.activa
     and r.status = 'activ';

comment on view public.zone_publice is
  'Zonele active ale restaurantelor active, pentru widgetul public.';

create view public.mese_publice as
  select t.id, t.restaurant_id, t.zone_id, t.numar_masa, t.capacitate, t.forma,
         t.pozitie_x, t.pozitie_y, t.latime, t.inaltime, t.rotatie,
         t.grup_unire_id
    from public.tables t
    join public.restaurants r on r.id = t.restaurant_id
   where t.activa
     and not t.indisponibila
     and r.status = 'activ';

comment on view public.mese_publice is
  'Mesele vizibile in widget. Fara "activa"/"indisponibila": ce nu se poate
   rezerva nu se arata deloc.';

-- Layer 1 (pereti, bar, zone speciale) doar daca a fost publicat.
create view public.structura_publica as
  select l.zone_id, l.restaurant_id, l.continut
    from public.floor_plan_layers l
    join public.restaurants r on r.id = l.restaurant_id
   where l.tip = 'layer1'
     and l.publicat
     and l.vizibil
     and r.status = 'activ';

grant select on public.zone_publice       to anon, authenticated;
grant select on public.mese_publice       to anon, authenticated;
grant select on public.structura_publica  to anon, authenticated;

-- ── Programul de functionare ─────────────────────────────────────────────
-- Necesar in baza, nu doar in client: altfel o cerere trimisa direct catre API
-- ar putea aseza o rezervare la 04:00.
create or replace function public.este_deschis(p_restaurant_id uuid, p_instant timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_fus      text;
  v_program  jsonb;
  v_local    timestamp;
  v_zi       date;
  v_ora      time;
  v_cheie    text;
  v_exceptie public.program_exceptii;
  v_de_la    time;
  v_pana_la  time;
begin
  select r.fus_orar, r.program_standard
    into v_fus, v_program
    from public.restaurants r
   where r.id = p_restaurant_id and r.status = 'activ';

  if v_fus is null then
    return false;
  end if;

  v_local := p_instant at time zone v_fus;
  v_zi    := v_local::date;
  v_ora   := v_local::time;

  -- Excepțiile (sarbatori, evenimente private) bat programul standard (§30.2).
  select * into v_exceptie
    from public.program_exceptii e
   where e.restaurant_id = p_restaurant_id and e.data = v_zi;

  if found then
    if v_exceptie.inchis then
      return false;
    end if;
    return v_ora >= v_exceptie.ora_deschidere and v_ora < v_exceptie.ora_inchidere;
  end if;

  v_cheie := case extract(isodow from v_zi)
               when 1 then 'luni'
               when 2 then 'marti'
               when 3 then 'miercuri'
               when 4 then 'joi'
               when 5 then 'vineri'
               when 6 then 'sambata'
               else        'duminica'
             end;

  if coalesce((v_program -> v_cheie ->> 'deschis')::boolean, true) is not true then
    return false;
  end if;

  v_de_la   := coalesce((v_program -> v_cheie ->> 'de_la')::time,   time '10:00');
  v_pana_la := coalesce((v_program -> v_cheie ->> 'pana_la')::time, time '23:59');

  return v_ora >= v_de_la and v_ora <= v_pana_la;
end;
$$;

revoke execute on function public.este_deschis(uuid, timestamptz) from public;
grant  execute on function public.este_deschis(uuid, timestamptz) to anon, authenticated;

-- ── Cererea de rezervare din widget ──────────────────────────────────────
-- SECURITY DEFINER, dar cu suprafata minima: primeste un slug, nu un
-- restaurant_id, si NU accepta table_id, status sau note interne. Alocarea
-- mesei rămâne decizia personalului.
create or replace function public.rezerva_public(
  p_slug        text,
  p_client_nume text,
  p_telefon     text,
  p_nr_persoane integer,
  p_data_ora    timestamptz,
  p_zone_id     uuid    default null,
  p_email       text    default null,
  p_note_client text    default null,
  p_gdpr        boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rest      public.restaurants;
  v_nume      text := nullif(btrim(p_client_nume), '');
  v_telefon   text := nullif(btrim(p_telefon), '');
  v_customer  uuid;
  v_status    public.rezervare_status;
  v_id        uuid;
  v_recente   integer;
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

  -- §22.1: consimtamantul GDPR e o conditie, nu o caseta decorativa.
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

  -- Limita anti-spam: acelasi numar de telefon nu poate deschide oricate
  -- cereri intr-o zi. Fara ea, endpoint-ul public e o invitatie la abuz.
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

  -- §7.1: aprobarea automata e o setare a restaurantului.
  v_status := case when v_rest.aprobare_automata then 'confirmata' else 'pending' end;

  insert into public.reservations (
    restaurant_id, zone_id, customer_id, client_nume, telefon, email,
    nr_persoane, data_ora, durata_minute, buffer_minute, se_termina_la,
    blocat_pana_la, status, sursa, note_client, gdpr_consimtamant
  )
  values (
    v_rest.id, p_zone_id, v_customer, v_nume, v_telefon, p_email,
    p_nr_persoane, p_data_ora, null, null, null,
    null, v_status, 'widget', p_note_client, p_gdpr
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'status', v_status, 'restaurant', v_rest.nume);
end;
$$;

revoke execute on function public.rezerva_public(
  text, text, text, integer, timestamptz, uuid, text, text, boolean
) from public;
grant execute on function public.rezerva_public(
  text, text, text, integer, timestamptz, uuid, text, text, boolean
) to anon, authenticated;

-- ── Realtime ─────────────────────────────────────────────────────────────
-- reservations are deja "replica identity full" (migratia 04), tocmai pentru
-- ca UI-ul sa poata face diff la UPDATE. Mai lipsea publicatia.
-- Postgres Changes respecta RLS, deci fiecare restaurant primeste numai
-- evenimentele lui.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
end $$;
