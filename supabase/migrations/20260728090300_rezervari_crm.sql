-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 04. CRM + rezervari + constrangerea anti-double-booking (§15.3)
--
-- Cele trei probleme si solutiile lor:
--
-- 1. Buffer-ul e o setare per restaurant, iar "timestamptz + interval" e STABLE,
--    nu IMMUTABLE => o coloana GENERATED e respinsa de Postgres. Solutie: un
--    trigger BEFORE materializeaza durata, buffer-ul si intervalul pe rand.
--    Triggerul RECALCULEAZA mereu, deci clientul nu poate falsifica un interval
--    mai scurt ca sa "incapa" peste altul.
--
-- 2. Mesele unite (§15.4, §28.6): o rezervare acopera 2+ mese, iar pe uuid[] nu
--    exista clasa de operatori gist. Solutie: constrangerea sta pe un tabel de
--    alocari, cu un rand per (masa, interval).
--
-- 3. Anulat / no-show / respins nu trebuie sa blocheze. In loc de un predicat
--    partial care trebuie tinut sincronizat, table_allocations contine DOAR
--    alocari ACTIVE — triggerul insereaza pe activ si sterge pe inactiv.
--    Constrangerea nu are predicat, deci nu poate fi gresita subtil.
-- ═══════════════════════════════════════════════════════════════════════

set local search_path = public, extensions;   -- necesar pentru clasele gist

-- ═══════════════════════════════════════════════════════════════════════
-- customers — CRM (§11, §19)
-- ═══════════════════════════════════════════════════════════════════════
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references public.restaurants(id) on delete cascade,
  telefon            text not null,              -- §16.1 identificatorul unic al Clientului
  nume               text,
  email              text,
  taguri             text[] not null default '{}',
  nr_vizite          integer not null default 0,
  -- §19.1: la 2+ neprezentari se afiseaza Red Flag. STRICT informativ —
  -- nicio auto-blocare a rezervarilor online.
  nr_no_show         integer not null default 0,
  data_ultima_vizita timestamptz,                -- §23, pentru jobul de retentie
  gdpr_consimtamant  boolean not null default false,  -- §22.1
  note               text,
  arhivat            boolean not null default false,  -- §19.2, dupa merge
  merged_into_id     uuid references public.customers(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (restaurant_id, telefon)
);

create index customers_restaurant_idx on public.customers (restaurant_id) where not arhivat;
create index customers_ultima_vizita_idx on public.customers (restaurant_id, data_ultima_vizita);

create trigger trg_customers_updated
  before update on public.customers
  for each row execute function public.set_updated_at();

-- §19.2 / §23: audit pentru unirea clientilor duplicati
create table public.customer_merge_audit (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  principal_id      uuid not null references public.customers(id) on delete cascade,
  duplicat_id       uuid not null,
  snapshot_duplicat jsonb not null,
  efectuat_de       uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index customer_merge_audit_restaurant_idx
  on public.customer_merge_audit (restaurant_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
-- formular_campuri — Form Builder (§8.3, §27)
-- Spec-ul descrie functionalitatea in detaliu, dar nu numeste niciun tabel
-- in §6/§23/§33/§48. Fara el, §27 e neimplementabil.
-- ═══════════════════════════════════════════════════════════════════════
create table public.formular_campuri (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  cheie         text not null,                   -- 'nume', 'telefon', 'alergii', ...
  eticheta      text not null,
  tip           public.camp_formular_tip not null default 'text',
  sistem        boolean not null default false,  -- §27.3, cele 7 campuri standard
  activ         boolean not null default true,
  obligatoriu   boolean not null default false,
  optiuni       jsonb not null default '[]'::jsonb,  -- pentru tip = 'dropdown'
  placeholder   text,
  ordine        integer not null default 0,      -- §27.4, ordine fixa
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, cheie)
);

create index formular_campuri_restaurant_idx
  on public.formular_campuri (restaurant_id, ordine);

create trigger trg_formular_campuri_updated
  before update on public.formular_campuri
  for each row execute function public.set_updated_at();

-- §27.3: Telefon ramane mereu prezent si obligatoriu. Nu poate fi dezactivat.
create or replace function public.protejeaza_camp_telefon()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.cheie = 'telefon' then
      raise exception 'Campul Telefon nu poate fi sters: e identificatorul unic al Clientului (spec §27.3).'
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if new.cheie = 'telefon' and (not new.activ or not new.obligatoriu) then
    raise exception 'Campul Telefon trebuie sa ramana activ si obligatoriu (spec §27.3).'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_formular_telefon
  before insert or update or delete on public.formular_campuri
  for each row execute function public.protejeaza_camp_telefon();

-- ═══════════════════════════════════════════════════════════════════════
-- reservations
-- ═══════════════════════════════════════════════════════════════════════
create table public.reservations (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  table_id          uuid references public.tables(id) on delete set null,
  zone_id           uuid references public.zones(id) on delete set null,
  customer_id       uuid references public.customers(id) on delete set null,
  -- event_id se adauga in migratia evenimentelor (FK circular altfel)

  client_nume       text not null,
  client_prenume    text,
  telefon           text not null,               -- §16.1
  email             text,                        -- optional
  nr_persoane       integer not null check (nr_persoane between 1 and 200),

  data_ora          timestamptz not null,
  durata_minute     integer not null,            -- completat de trigger daca e 0
  buffer_minute     integer not null,            -- SNAPSHOT al setarii la creare
  se_termina_la     timestamptz not null,        -- data_ora + durata          (trigger)
  blocat_pana_la    timestamptz not null,        -- se_termina_la + buffer     (trigger)

  status            public.rezervare_status not null default 'pending',
  sursa             public.rezervare_sursa  not null default 'manual',
  note_interne      text,                        -- §26.4, niciodata vizibil Clientului
  note_client       text,
  campuri_custom    jsonb not null default '{}'::jsonb,  -- raspunsurile din Form Builder
  gdpr_consimtamant boolean not null default false,      -- §22.1
  sosit_la          timestamptz,
  creat_de          uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (blocat_pana_la > data_ora)
);

create index reservations_rest_data_idx    on public.reservations (restaurant_id, data_ora);
create index reservations_rest_status_idx  on public.reservations (restaurant_id, status, data_ora);
create index reservations_customer_idx     on public.reservations (customer_id);
create index reservations_table_data_idx   on public.reservations (table_id, data_ora);

create trigger trg_reservations_updated
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Realtime are nevoie de randul vechi la UPDATE/DELETE ca sa poata face
-- diff corect in UI (§8.4, §24.6).
alter table public.reservations replica identity full;

-- ── Materializarea intervalului blocat ───────────────────────────────────
create or replace function public.rezervare_calculeaza_interval()
returns trigger
language plpgsql
as $$
declare
  v_durata_default integer;
  v_buffer         integer;
begin
  select r.durata_implicita_minute, r.buffer_minute
    into v_durata_default, v_buffer
    from public.restaurants r
   where r.id = new.restaurant_id;

  if v_durata_default is null then
    raise exception 'Restaurantul % nu exista.', new.restaurant_id using errcode = 'P0001';
  end if;

  -- Durata: cea ceruta explicit (prelungire, §7.5) sau default-ul restaurantului.
  new.durata_minute := coalesce(nullif(new.durata_minute, 0), v_durata_default);
  if new.durata_minute < 15 or new.durata_minute > 720 then
    raise exception 'Durata rezervarii trebuie sa fie intre 15 si 720 de minute.'
      using errcode = 'P0001';
  end if;

  -- Buffer-ul NU se accepta de la client. La UPDATE il pastram pe cel original
  -- daca ora si durata nu s-au schimbat (§ decizia "buffer neretroactiv").
  if tg_op = 'INSERT'
     or new.data_ora is distinct from old.data_ora
     or new.durata_minute is distinct from old.durata_minute then
    new.buffer_minute := v_buffer;
  else
    new.buffer_minute := coalesce(old.buffer_minute, v_buffer);
  end if;

  new.se_termina_la  := new.data_ora + make_interval(mins => new.durata_minute);
  new.blocat_pana_la := new.se_termina_la + make_interval(mins => new.buffer_minute);
  return new;
end;
$$;

create trigger trg_rezervare_interval
  before insert or update on public.reservations
  for each row execute function public.rezervare_calculeaza_interval();

-- ═══════════════════════════════════════════════════════════════════════
-- table_allocations — punctul UNIC de aplicare a constrangerii
-- Contine DOAR alocari active. Anulat / no-show / respins => randul dispare.
-- ═══════════════════════════════════════════════════════════════════════
create table public.table_allocations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  table_id        uuid not null references public.tables(id) on delete cascade,
  reservation_id  uuid references public.reservations(id) on delete cascade,
  ticket_id       uuid,   -- FK adaugat in migratia evenimentelor
  interval_blocat tstzrange not null,
  created_at      timestamptz not null default now(),

  constraint table_allocations_o_singura_sursa
    check (num_nonnulls(reservation_id, ticket_id) = 1),

  -- ★ CONSTRANGEREA DURA (spec §15.3)
  -- Aceeasi masa nu poate avea doua intervale care se suprapun. Intervalul e
  -- semi-deschis '[)', deci o rezervare care se termina la 20:00 si una care
  -- incepe fix la 20:00 NU intra in conflict. Buffer-ul e deja inclus in
  -- limita superioara.
  -- Nu exista optiune de fortare pentru Admin: fiind o constrangere de tabel,
  -- nici service_role si nicio Edge Function nu o pot ocoli.
  constraint table_allocations_fara_suprapunere
    exclude using gist (
      table_id        with =,
      interval_blocat with &&
    )
);

comment on constraint table_allocations_fara_suprapunere on public.table_allocations is
  'Spec §15.3 — blocare DURA a double-booking-ului, fara override. Eroare SQLSTATE 23P01.';

create index table_allocations_reservation_idx on public.table_allocations (reservation_id);
create index table_allocations_rest_masa_idx   on public.table_allocations (restaurant_id, table_id);

-- ── Sincronizarea alocarilor din rezervari ───────────────────────────────
create or replace function public.sincronizeaza_alocari_rezervare()
returns trigger
language plpgsql
as $$
declare
  v_activa boolean;
  v_grup   uuid;
begin
  -- 'pending' blocheaza intentionat: §15.2 spune ca nu expira niciodata, deci
  -- daca nu ar bloca, doua acceptari ar intra in conflict mai tarziu. Cererile
  -- din widget au table_id NULL, deci nu blocheaza nimic.
  v_activa := new.status in ('pending', 'confirmata', 'sosita')
              and new.table_id is not null;

  delete from public.table_allocations where reservation_id = new.id;

  if v_activa then
    select t.grup_unire_id into v_grup from public.tables t where t.id = new.table_id;

    -- Masa principala + toate mesele din grupul unit (§28.6)
    insert into public.table_allocations
      (restaurant_id, table_id, reservation_id, interval_blocat)
    select new.restaurant_id, t.id, new.id,
           tstzrange(new.data_ora, new.blocat_pana_la, '[)')
      from public.tables t
     where t.id = new.table_id
        or (v_grup is not null and t.grup_unire_id = v_grup);
  end if;

  return null;
end;
$$;

create trigger trg_sync_alocari
  after insert or update of table_id, data_ora, blocat_pana_la, status
  on public.reservations
  for each row execute function public.sincronizeaza_alocari_rezervare();

-- ═══════════════════════════════════════════════════════════════════════
-- waitlist — panou lateral permanent langa Harta 2D (§28.7)
-- ═══════════════════════════════════════════════════════════════════════
create table public.waitlist (
  id                         uuid primary key default gen_random_uuid(),
  restaurant_id              uuid not null references public.restaurants(id) on delete cascade,
  zone_id                    uuid references public.zones(id) on delete set null,
  nume                       text not null,
  telefon                    text,
  nr_persoane                integer not null check (nr_persoane > 0),
  timp_asteptare_estimat_min integer,
  status                     public.waitlist_status not null default 'asteptare',
  pozitie                    integer not null default 0,
  table_id                   uuid references public.tables(id) on delete set null,
  asezat_la                  timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index waitlist_rest_status_idx on public.waitlist (restaurant_id, status, pozitie);

create trigger trg_waitlist_updated
  before update on public.waitlist
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- disponibilitate_mese — sursa unica de adevar pentru culorile Traffic Light.
-- Alimenteaza: widgetul public, modalul Walk-In (§25.6) si bara orara din
-- §28.12 — fara ca vreun client sa citeasca vreun rand din reservations.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.disponibilitate_mese(
  p_restaurant_id uuid,
  p_zone_id       uuid,
  p_start         timestamptz,
  p_durata_minute integer default null
)
returns table (table_id uuid, numar_masa text, capacitate integer, libera boolean)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with cfg as (
    select durata_implicita_minute, buffer_minute
      from public.restaurants where id = p_restaurant_id
  ),
  rng as (
    select tstzrange(
             p_start,
             p_start + make_interval(
               mins => coalesce(p_durata_minute, cfg.durata_implicita_minute) + cfg.buffer_minute
             ),
             '[)'
           ) as r
      from cfg
  )
  select t.id, t.numar_masa, t.capacitate,
         not exists (
           select 1 from public.table_allocations a, rng
            where a.table_id = t.id and a.interval_blocat && rng.r
         ) as libera
    from public.tables t, rng
   where t.restaurant_id = p_restaurant_id
     and (p_zone_id is null or t.zone_id = p_zone_id)
     and t.activa
     and not t.indisponibila
   order by t.numar_masa;
$$;

-- Diagnostic pentru Setari: ce conflicte ar aparea daca s-ar mari buffer-ul.
-- Necesar pentru ca schimbarea buffer-ului e neretroactiva (vezi planul).
create or replace function public.verifica_conflicte_buffer(
  p_restaurant_id uuid,
  p_buffer_nou    integer
)
returns table (table_id uuid, rezervare_a uuid, rezervare_b uuid, suprapunere interval)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select a.table_id, a.id, b.id,
         (least(a.blocat_pana_la, b.blocat_pana_la) - greatest(a.data_ora, b.data_ora))
    from public.reservations a
    join public.reservations b
      on a.table_id = b.table_id
     and a.id < b.id
     and a.restaurant_id = b.restaurant_id
   where a.restaurant_id = p_restaurant_id
     and a.status in ('pending', 'confirmata', 'sosita')
     and b.status in ('pending', 'confirmata', 'sosita')
     and a.table_id is not null
     and tstzrange(a.data_ora,
                   a.se_termina_la + make_interval(mins => p_buffer_nou), '[)')
      && tstzrange(b.data_ora,
                   b.se_termina_la + make_interval(mins => p_buffer_nou), '[)');
$$;
