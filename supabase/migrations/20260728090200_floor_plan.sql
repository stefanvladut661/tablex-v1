-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 03. Floor plan: zones, layers, tables, projects, requests
--
-- DECIZIE DE ARHITECTURA (spec §7.6, §9.2.2):
--   Layer 1 (pereti, usi, bar, zone speciale, planta, piscina) = JSONB.
--     Sunt geometrie pura de canvas, fara relatii; un document JSONB e forma
--     naturala pentru un editor cu undo/redo si snapshot-uri versionate.
--   Layer 2 (mese) = relational.
--     reservations.table_id are FK catre tables si trebuie sa ramana stabil
--     indiferent de pozitia vizuala. Mutarea unei mese pe ecran nu pierde date.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- zones — fiecare zona e un canvas independent, complet (§17.2, structura flat)
-- ═══════════════════════════════════════════════════════════════════════
create table public.zones (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  nume            text not null,
  ordine_afisare  integer not null default 0,
  activa          boolean not null default true,
  canvas_latime   integer not null default 1200,
  canvas_inaltime integer not null default 800,
  grid_marime     integer not null default 20,   -- §42.1, slider fin/mediu/larg
  schita_url      text,                          -- imaginea originala incarcata de Admin
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (restaurant_id, nume)
);

create index zones_restaurant_ordine_idx on public.zones (restaurant_id, ordine_afisare);

create trigger trg_zones_updated
  before update on public.zones
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- floor_plan_layers — continutul Layer 1 + registrul de layere per zona
-- ═══════════════════════════════════════════════════════════════════════
create table public.floor_plan_layers (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  zone_id       uuid not null references public.zones(id) on delete cascade,
  tip           public.layer_tip not null,
  -- Doar pentru layer1. Forma unui element:
  --   {tip, x, y, latime, inaltime, rotatie, puncte, eticheta, z}
  -- tip ∈ perete | usa | bar | dj | vip | intrare | bucatarie | planta | piscina
  continut      jsonb not null default '[]'::jsonb,
  vizibil       boolean not null default true,
  blocat        boolean not null default true,   -- layer1 e mereu blocat pentru Admin
  versiune      integer not null default 1,
  publicat      boolean not null default false,
  actualizat_de uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (zone_id, tip)
);

create index floor_plan_layers_restaurant_idx on public.floor_plan_layers (restaurant_id);

create trigger trg_floor_plan_layers_updated
  before update on public.floor_plan_layers
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- tables — Layer 2. table_id stabil, independent de coordonate (§7.6)
--
-- NU exista coloana "status curent" din §6: culoarea unei mese e o FUNCTIE DE
-- TIMP (§28.12 cere derularea hartii la ora 19:00), deci un status stocat ar fi
-- corect doar pentru "acum". Se calculeaza din table_allocations.
-- Persista doar starile cu adevarat durabile: activa / indisponibila.
-- ═══════════════════════════════════════════════════════════════════════
create table public.tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  zone_id       uuid not null references public.zones(id) on delete cascade,
  numar_masa    text not null,
  capacitate    integer not null default 4 check (capacitate between 1 and 24),
  forma         public.masa_forma not null default 'rotunda',
  pozitie_x     numeric(10,2) not null default 0,
  pozitie_y     numeric(10,2) not null default 0,
  latime        numeric(10,2) not null default 80,
  inaltime      numeric(10,2) not null default 80,
  rotatie       numeric(6,2)  not null default 0,
  grup_unire_id uuid,                                -- §28.6, mese unite pentru grupuri
  activa        boolean not null default true,
  indisponibila boolean not null default false,      -- scoasa temporar din uz
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, numar_masa)
);

create index tables_zone_idx        on public.tables (zone_id);
create index tables_restaurant_idx  on public.tables (restaurant_id) where activa;
create index tables_grup_unire_idx  on public.tables (grup_unire_id) where grup_unire_id is not null;

create trigger trg_tables_updated
  before update on public.tables
  for each row execute function public.set_updated_at();

-- §17.4 / §23: plafonul de scaune e per restaurant, deci nu poate fi un CHECK.
create or replace function public.verifica_capacitate_masa()
returns trigger
language plpgsql
as $$
declare
  v_max integer;
begin
  select r.max_scaune_masa into v_max
    from public.restaurants r
   where r.id = new.restaurant_id;

  if v_max is not null and new.capacitate > v_max then
    raise exception 'O masa poate avea maximum % scaune (masa %, cerut %).',
      v_max, new.numar_masa, new.capacitate
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_tables_capacitate
  before insert or update of capacitate on public.tables
  for each row execute function public.verifica_capacitate_masa();

-- ═══════════════════════════════════════════════════════════════════════
-- floor_plan_projects — arbore stil Google Drive (§9.2.2, §40)
-- Istoricul de versiuni e vizibil EXCLUSIV Super Adminului (§17.5, §23).
-- ═══════════════════════════════════════════════════════════════════════
create table public.floor_plan_projects (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  zone_id       uuid references public.zones(id) on delete set null,
  parinte_id    uuid references public.floor_plan_projects(id) on delete cascade,
  tip           public.fp_nod_tip not null,
  nume          text not null,
  status        public.fp_project_status,          -- null pentru foldere
  continut      jsonb,                             -- {layer1: [...], layer2: [...]}
  versiune      integer not null default 1,
  publicat_de   uuid references auth.users(id) on delete set null,
  publicat_la   timestamptz,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (
    (tip = 'folder' and status is null and continut is null)
    or (tip = 'fisier' and status is not null)
  )
);

create index floor_plan_projects_parinte_idx on public.floor_plan_projects (parinte_id);
create index floor_plan_projects_rest_zona_idx
  on public.floor_plan_projects (restaurant_id, zone_id);

-- §40.3: cel mult o versiune 'published' per zona. Publicarea unei versiuni noi
-- trebuie sa arhiveze automat precedenta.
create unique index floor_plan_projects_un_published_per_zona
  on public.floor_plan_projects (zone_id)
  where status = 'published';

create trigger trg_floor_plan_projects_updated
  before update on public.floor_plan_projects
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- floor_plan_requests — coada Super Admin (§8.4, §9.2.2, §41)
-- ═══════════════════════════════════════════════════════════════════════
create table public.floor_plan_requests (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  zone_nume        text not null,
  schita_image_url text,
  descriere        text,
  status           public.fp_request_status not null default 'pending',
  -- §41.2: fara sistem de asignare in v1; coloana ramane pentru viitor.
  assigned_to      uuid references public.super_admin_users(id) on delete set null,
  procesat_de      uuid references public.super_admin_users(id) on delete set null,
  -- Rezultatul Generarii AI Best-Guess. NICIODATA expus Adminului (§14).
  ai_rezultat      jsonb,
  ai_generat_la    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.floor_plan_requests.ai_rezultat is
  'Spec §14: instrument intern Super Admin. Nicio politica RLS nu il expune Adminului.';

create index floor_plan_requests_status_idx     on public.floor_plan_requests (status, created_at);
create index floor_plan_requests_restaurant_idx on public.floor_plan_requests (restaurant_id);

create trigger trg_floor_plan_requests_updated
  before update on public.floor_plan_requests
  for each row execute function public.set_updated_at();
