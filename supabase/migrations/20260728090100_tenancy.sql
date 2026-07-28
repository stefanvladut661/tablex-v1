-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 02. Functii comune + tenancy
--   app_settings (singleton), restaurants, admin_users, super_admin_users,
--   invitatii, program_exceptii, slug-uri rezervate
-- ═══════════════════════════════════════════════════════════════════════

-- ── Trigger partajat pentru updated_at ───────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- app_settings — singleton global (spec §9.2.7, §47)
-- ═══════════════════════════════════════════════════════════════════════
create table public.app_settings (
  id                      boolean primary key default true check (id),
  maintenance_mode        boolean       not null default false,
  mesaj_mentenanta        text          not null default 'TableX este in mentenanta. Revenim in scurt timp.',
  pret_plan_start         numeric(10,2) not null default 5.00,
  pret_plan_pro           numeric(10,2) not null default 10.00,
  comision_bilete_procent numeric(5,2)  not null default 4.00
                            check (comision_bilete_procent between 0 and 100),
  setup_floor_plan_pret   numeric(10,2) not null default 100.00,  -- §10.2
  setup_prag_mese         integer       not null default 50,
  setup_pret_masa_extra   numeric(10,2) not null default 2.00,
  retentie_ani_default    integer       not null default 3        -- §22.1
                            check (retentie_ani_default between 1 and 10),
  updated_by              uuid references auth.users(id) on delete set null,
  updated_at              timestamptz   not null default now()
);
comment on table public.app_settings is
  'Singleton. Un singur rand, id = true. Editabil doar de rolul super_admin.';

insert into public.app_settings (id) values (true);

create trigger trg_app_settings_updated
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- slug-uri rezervate — nu pot coincide cu segmente de rutare
-- ═══════════════════════════════════════════════════════════════════════
create table public.slug_rezervate (slug text primary key);

insert into public.slug_rezervate (slug) values
  ('app'), ('superadmin'), ('r'), ('login'), ('signup'), ('api'), ('auth'),
  ('admin'), ('static'), ('assets'), ('docs'), ('mentenanta'),
  ('resetare-parola'), ('parola-noua'), ('verifica-email'), ('invitatie');

-- ═══════════════════════════════════════════════════════════════════════
-- restaurants — radacina multi-tenancy
-- ═══════════════════════════════════════════════════════════════════════
create table public.restaurants (
  id                         uuid primary key default gen_random_uuid(),
  slug                       text not null unique
                               check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  nume                       text not null,
  nume_firma                 text,
  cui                        text,                       -- §52, colectat la signup
  adresa                     text,
  oras                       text,
  tip_locatie                text,
  telefon_contact            text,
  email_contact              text,
  persoana_contact           text,

  plan                       public.plan_tip          not null default 'start',
  status                     public.restaurant_status not null default 'activ',
  motiv_suspendare           text,                       -- §43.5, obligatoriu la suspendare
  suspendat_la               timestamptz,

  -- Reguli de rezervare (§7.1, §7.3)
  aprobare_automata          boolean not null default true,
  durata_implicita_minute    integer not null default 120
                               check (durata_implicita_minute between 90 and 180),
  buffer_minute              integer not null default 15
                               check (buffer_minute between 0 and 60),
  max_scaune_masa            integer not null default 12   -- §17.4
                               check (max_scaune_masa between 1 and 24),

  -- Branding widget (§27.6, §33)
  logo_url                   text,
  culoare_accent             text not null default '#059669'
                               check (culoare_accent ~ '^#[0-9A-Fa-f]{6}$'),

  -- Program de lucru (§30.2, §33)
  program_standard           jsonb not null default '{
    "luni":     {"deschis": true, "de_la": "10:00", "pana_la": "23:00"},
    "marti":    {"deschis": true, "de_la": "10:00", "pana_la": "23:00"},
    "miercuri": {"deschis": true, "de_la": "10:00", "pana_la": "23:00"},
    "joi":      {"deschis": true, "de_la": "10:00", "pana_la": "23:00"},
    "vineri":   {"deschis": true, "de_la": "10:00", "pana_la": "23:59"},
    "sambata":  {"deschis": true, "de_la": "10:00", "pana_la": "23:59"},
    "duminica": {"deschis": true, "de_la": "10:00", "pana_la": "22:00"}
  }'::jsonb,
  -- Toate datele sunt timestamptz, dar "ziua curenta" si bara orara din §28.12
  -- sunt concepte LOCALE restaurantului. Orice grupare pe zi trece prin asta.
  fus_orar                   text not null default 'Europe/Bucharest',

  -- GDPR (§22.1, §23)
  data_retentie_ani          integer not null default 3
                               check (data_retentie_ani between 1 and 10),

  -- Interventii Super Admin (§43)
  floor_plan_deblocat_manual boolean not null default false,
  trial_extins_pana_la       date,
  discount_procent           numeric(5,2) check (discount_procent between 0 and 100),
  setup_floor_plan_platit    boolean not null default false,

  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index restaurants_status_idx on public.restaurants (status);
create index restaurants_plan_idx   on public.restaurants (plan);

create trigger trg_restaurants_updated
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- Un CHECK nu poate contine subinterogari => trigger.
create or replace function public.verifica_slug_rezervat()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.slug_rezervate s where s.slug = new.slug) then
    raise exception 'Slug-ul "%" este rezervat de sistem. Alege altul.', new.slug
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger trg_restaurants_slug_rezervat
  before insert or update of slug on public.restaurants
  for each row execute function public.verifica_slug_rezervat();

-- ═══════════════════════════════════════════════════════════════════════
-- admin_users — Manager / Ospatar
-- user_id UNIQUE impune §20.1: un cont apartine unui singur restaurant.
-- ═══════════════════════════════════════════════════════════════════════
create table public.admin_users (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null references public.restaurants(id) on delete cascade,
  user_id                  uuid not null unique references auth.users(id) on delete cascade,
  rol                      public.admin_rol not null default 'ospatar',
  nume                     text,
  email                    text,
  activ                    boolean not null default true,
  list_view_columns_config jsonb not null default '{}'::jsonb,  -- §26.2, preferinta personala
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index admin_users_restaurant_idx on public.admin_users (restaurant_id);

create trigger trg_admin_users_updated
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- super_admin_users — echipa TableX (§9.2.7)
-- ═══════════════════════════════════════════════════════════════════════
create table public.super_admin_users (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  rol        public.super_admin_rol not null default 'support',
  nume       text,
  email      text,
  activ      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_super_admin_users_updated
  before update on public.super_admin_users
  for each row execute function public.set_updated_at();

-- Un utilizator nu poate fi simultan Admin si Super Admin: altfel
-- current_restaurant_id() si is_super_admin() ar fi ambele adevarate si
-- comportamentul politicilor RLS ar deveni ambiguu.
create or replace function public.verifica_apartenenta_unica()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'admin_users' then
    if exists (select 1 from public.super_admin_users s where s.user_id = new.user_id) then
      raise exception 'Utilizatorul este deja Super Admin; nu poate fi si Admin de restaurant.'
        using errcode = 'P0001';
    end if;
  else
    if exists (select 1 from public.admin_users a where a.user_id = new.user_id) then
      raise exception 'Utilizatorul este deja Admin de restaurant; nu poate fi si Super Admin.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_admin_users_apartenenta
  before insert or update of user_id on public.admin_users
  for each row execute function public.verifica_apartenenta_unica();

create trigger trg_super_admin_users_apartenenta
  before insert or update of user_id on public.super_admin_users
  for each row execute function public.verifica_apartenenta_unica();

-- ═══════════════════════════════════════════════════════════════════════
-- Invitatii — link unic pe email, parola si-o seteaza singur (§49.6, §49.7)
-- ═══════════════════════════════════════════════════════════════════════
create table public.staff_invitations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  email         text not null,
  rol           public.admin_rol not null default 'ospatar',
  status        public.invitatie_status not null default 'trimisa',
  token         text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by    uuid references auth.users(id) on delete set null,
  expira_la     timestamptz not null default now() + interval '7 days',
  acceptata_la  timestamptz,
  created_at    timestamptz not null default now()
);

create unique index staff_invitations_activa_idx
  on public.staff_invitations (restaurant_id, lower(email))
  where status = 'trimisa';

create table public.super_admin_invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  rol          public.super_admin_rol not null,
  status       public.invitatie_status not null default 'trimisa',
  token        text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by   uuid references auth.users(id) on delete set null,
  expira_la    timestamptz not null default now() + interval '7 days',
  acceptata_la timestamptz,
  created_at   timestamptz not null default now()
);

create unique index super_admin_invitations_activa_idx
  on public.super_admin_invitations (lower(email))
  where status = 'trimisa';

-- ═══════════════════════════════════════════════════════════════════════
-- program_exceptii — zile speciale care suprascriu programul standard (§30.2)
-- ═══════════════════════════════════════════════════════════════════════
create table public.program_exceptii (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  data           date not null,
  inchis         boolean not null default false,
  ora_deschidere time,
  ora_inchidere  time,
  motiv          text,
  created_at     timestamptz not null default now(),
  unique (restaurant_id, data),
  check (inchis or (ora_deschidere is not null and ora_inchidere is not null))
);

create index program_exceptii_restaurant_data_idx
  on public.program_exceptii (restaurant_id, data);
