-- ═══════════════════════════════════════════════════════════════════════════
-- Evenimente & Bilete (§8.5, §18, §29) — cel mai mare modul lipsa
--
-- Enum-urile `event_status` si `ticket_plata_status` exista din prima zi, iar
-- `table_allocations` are din migratia 04 coloana `ticket_id`, cu
-- `check (num_nonnulls(reservation_id, ticket_id) = 1)` si comentariul „FK
-- adaugat in migratia evenimentelor". Migratia asta e aceea.
--
-- Castigul arhitectural, gandit atunci: biletele si rezervarile scriu in
-- ACEEASI tabela de alocari, deci constrangerea EXCLUDE anti-suprapunere le
-- arbitreaza pe amandoua fara nicio logica noua. O masa vanduta la un eveniment
-- nu mai poate primi o rezervare obisnuita in acelasi interval, iar refuzul
-- vine din baza, nu din vreo verificare pe care cineva ar putea s-o uite.
--
-- Trei reguli din spec, impuse aici si nu in interfata:
--
-- 1. §10.4 — locul se blocheaza DOAR la plata efectiva. Un bilet neplatit nu
--    tine masa ocupata; altfel oricine ar putea bloca sala fara sa dea un leu.
-- 2. §18.1 — capacitatea unui eveniment NU se stocheaza. Se calculeaza din
--    scaunele meselor alocate; un numar scris de mana ar diverge de sala in
--    momentul in care cineva schimba capacitatea unei mese.
-- 3. §18.2 — neprezentarea la un eveniment NU atinge `customers.nr_no_show` si
--    nu declanseaza Red Flag-ul din CRM. Sunt doua logici separate, cu doua
--    contoare separate.
--
-- Acces: TOT personalul, inclusiv ospatarul (§29.7 — exceptie explicita de la
-- matricea din §31, fiindca el vinde si scaneaza biletele la intrare).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Evenimentul ────────────────────────────────────────────────────────────
create table if not exists public.events (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null references public.restaurants(id) on delete cascade,
  nume                     text not null,
  descriere                text,
  data_ora                 timestamptz not null,
  durata_minute            integer not null default 240 check (durata_minute between 30 and 1440),
  afis_url                 text,
  status                   public.event_status not null default 'draft',
  -- §8.5: pop-up pe widgetul public, cu fereastra configurabila inainte.
  popup_activ              boolean not null default false,
  popup_zile_inainte       integer not null default 7 check (popup_zile_inainte between 1 and 60),
  -- §18.2: contor propriu, fara nicio legatura cu CRM-ul.
  nr_no_show_eveniment     integer not null default 0,
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists events_restaurant_data_idx
  on public.events (restaurant_id, data_ora desc);

drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated
  before update on public.events
  for each row execute function public.set_updated_at();

-- ── Mesele alocate evenimentului (pasul 2 din wizard, §29.2) ───────────────
create table if not exists public.event_tables (
  event_id uuid not null references public.events(id) on delete cascade,
  table_id uuid not null references public.tables(id) on delete cascade,
  primary key (event_id, table_id)
);

-- ── Preturi pe zona sau pe forma de masa (§29.3) ───────────────────────────
-- Pretul NU e unic global: o masa VIP costa altfel decat una din salon. Cheia
-- e ori zona, ori forma; `check` impune exact una dintre ele, ca sa nu existe
-- doua preturi aplicabile aceleiasi mese prin doua reguli diferite.
create table if not exists public.event_ticket_pricing (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  zone_id     uuid references public.zones(id) on delete cascade,
  masa_forma  public.masa_forma,
  pret_eur    numeric(10,2) not null check (pret_eur >= 0),
  check (num_nonnulls(zone_id, masa_forma) = 1)
);

create unique index if not exists event_pricing_zona_idx
  on public.event_ticket_pricing (event_id, zone_id) where zone_id is not null;
create unique index if not exists event_pricing_forma_idx
  on public.event_ticket_pricing (event_id, masa_forma) where masa_forma is not null;

-- ── Biletul ────────────────────────────────────────────────────────────────
create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  event_id          uuid not null references public.events(id) on delete cascade,
  table_id          uuid references public.tables(id) on delete set null,
  client_nume       text not null,
  telefon           text,
  email             text,
  nr_persoane       integer not null default 1 check (nr_persoane between 1 and 50),
  -- Codul e scurt si citibil cu ochiul: pe o tableta fara camera buna, sau cu
  -- un ecran de telefon crapat, se introduce de mana. QR-ul il doar contine.
  cod               text not null unique default upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8)),
  pret_eur          numeric(10,2) not null default 0 check (pret_eur >= 0),
  comision_eur      numeric(10,2) not null default 0,
  status_plata      public.ticket_plata_status not null default 'neplatit',
  platit_la         timestamptz,
  scanat_la         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists tickets_event_idx on public.tickets (event_id);

drop trigger if exists trg_tickets_updated on public.tickets;
create trigger trg_tickets_updated
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- FK-ul promis in migratia 04.
alter table public.table_allocations
  drop constraint if exists table_allocations_ticket_id_fkey;
alter table public.table_allocations
  add constraint table_allocations_ticket_id_fkey
  foreign key (ticket_id) references public.tickets(id) on delete cascade;

-- Legatura anuntata tot acolo: o rezervare poate apartine unui eveniment.
alter table public.reservations
  add column if not exists event_id uuid references public.events(id) on delete set null;

-- ── Comisionul (§10.4): 3-5% per bilet, din setarea globala ────────────────
create or replace function public.calculeaza_comision_bilet()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_procent numeric;
begin
  select comision_bilete_procent into v_procent from public.app_settings where id;
  new.comision_eur := round(new.pret_eur * coalesce(v_procent, 0) / 100, 2);
  return new;
end;
$$;

revoke execute on function public.calculeaza_comision_bilet() from public;

drop trigger if exists trg_tickets_comision on public.tickets;
create trigger trg_tickets_comision
  before insert or update of pret_eur on public.tickets
  for each row execute function public.calculeaza_comision_bilet();

-- ── Alocarea mesei, DOAR la plata (§10.4) ──────────────────────────────────
create or replace function public.sincronizeaza_alocari_bilet()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_grup  uuid;
  v_start timestamptz;
  v_final timestamptz;
begin
  delete from public.table_allocations where ticket_id = new.id;

  if new.status_plata <> 'platit' or new.table_id is null then
    return null;
  end if;

  select e.data_ora, e.data_ora + make_interval(mins => e.durata_minute)
    into v_start, v_final
    from public.events e where e.id = new.event_id;

  select t.grup_unire_id into v_grup from public.tables t where t.id = new.table_id;

  -- Simetric cu rezervarile: un bilet pe o masa dintr-un grup ocupa tot grupul.
  insert into public.table_allocations (restaurant_id, table_id, ticket_id, interval_blocat)
  select new.restaurant_id, t.id, new.id, tstzrange(v_start, v_final, '[)')
    from public.tables t
   where t.id = new.table_id
      or (v_grup is not null and t.grup_unire_id = v_grup);

  return null;
end;
$$;

revoke execute on function public.sincronizeaza_alocari_bilet() from public;

drop trigger if exists trg_sync_alocari_bilet on public.tickets;
create trigger trg_sync_alocari_bilet
  after insert or update of status_plata, table_id on public.tickets
  for each row execute function public.sincronizeaza_alocari_bilet();

-- ── Capacitatea, calculata (§18.1) ─────────────────────────────────────────
create or replace function public.capacitate_eveniment(p_event_id uuid)
returns integer
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(sum(t.capacitate), 0)::integer
    from public.event_tables et
    join public.tables t on t.id = et.table_id
   where et.event_id = p_event_id
     and t.activa and not t.indisponibila
$$;

comment on function public.capacitate_eveniment(uuid) is
  'Suma scaunelor meselor alocate (§18.1). Niciodata stocata: un numar scris de '
  'mana ar diverge de sala la prima schimbare de capacitate.';

revoke execute on function public.capacitate_eveniment(uuid) from public;
grant execute on function public.capacitate_eveniment(uuid) to anon, authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.events enable row level security;
alter table public.event_tables enable row level security;
alter table public.event_ticket_pricing enable row level security;
alter table public.tickets enable row level security;

-- §29.7: ospatarul are acces COMPLET la evenimente si bilete — el le vinde si
-- le scaneaza la intrare. Exceptie explicita de la matricea din §31.
create policy events_personal on public.events
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin())
  with check (restaurant_id = public.current_restaurant_id() or public.is_super_admin());

create policy tickets_personal on public.tickets
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin())
  with check (restaurant_id = public.current_restaurant_id() or public.is_super_admin());

-- Tabelele-copil nu au restaurant_id: se leaga prin evenimentul lor.
create policy event_tables_personal on public.event_tables
  for all to authenticated
  using (exists (
    select 1 from public.events e
     where e.id = event_id
       and (e.restaurant_id = public.current_restaurant_id() or public.is_super_admin())
  ))
  with check (exists (
    select 1 from public.events e
     where e.id = event_id
       and (e.restaurant_id = public.current_restaurant_id() or public.is_super_admin())
  ));

create policy event_pricing_personal on public.event_ticket_pricing
  for all to authenticated
  using (exists (
    select 1 from public.events e
     where e.id = event_id
       and (e.restaurant_id = public.current_restaurant_id() or public.is_super_admin())
  ))
  with check (exists (
    select 1 from public.events e
     where e.id = event_id
       and (e.restaurant_id = public.current_restaurant_id() or public.is_super_admin())
  ));

-- ── Vederea publica pentru widget (§8.5 — pop-up de alerta) ────────────────
-- Doar evenimentele PUBLICATE, doar cu pop-up activ, si doar in fereastra
-- configurata: vizitatorul nu are de ce sa vada ciornele restaurantului.
-- FARA security_invoker, ca celelalte vederi publice (migratiile 05 si 11):
-- vizitatorul anonim nu are — si nu trebuie sa aiba — nicio politica pe
-- `events`. Vederea insasi e filtrul, iar coloanele afisate sunt alese una
-- cate una. Prima incercare a fost cu security_invoker si intorcea mereu zero
-- randuri pentru anon, exact fiindca RLS-ul il oprea inaintea filtrului.
create or replace view public.evenimente_publice as
  select
    e.id,
    e.restaurant_id,
    r.slug,
    e.nume,
    e.descriere,
    e.data_ora,
    e.afis_url,
    (select min(p.pret_eur) from public.event_ticket_pricing p where p.event_id = e.id) as pret_de_la
  from public.events e
  join public.restaurante_publice r on r.id = e.restaurant_id
 where e.status = 'publicat'
   and e.popup_activ
   and e.data_ora > now()
   and e.data_ora - make_interval(days => e.popup_zile_inainte) <= now();

grant select on public.evenimente_publice to anon, authenticated;

comment on view public.evenimente_publice is
  'Pop-up-ul de eveniment de pe widget (§8.5): doar publicate, cu pop-up activ, '
  'in fereastra configurata inainte de data.';
