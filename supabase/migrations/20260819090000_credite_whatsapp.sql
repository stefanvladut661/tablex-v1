-- ═══════════════════════════════════════════════════════════════════════════
-- Portofelul de credite WhatsApp (§10.3, §30.4)
--
-- Enum-urile `wallet_tranzactie_tip` si `wa_mesaj_status` existau de la
-- inceput, fara nicio tabela in spate. Aici primesc una.
--
-- ATENTIE la ce NU e asta: §14 interzice trimiterea reala prin Meta Cloud API
-- in v1. Tot ce urmeaza e contabilitatea creditelor si jurnalul mesajelor —
-- structura de date si fluxurile, gata de conectat. Reincarcarea nu incaseaza
-- nimic.
--
-- Decizia de forma: soldul NU e o coloana pe care o scrie cineva. E suma
-- tranzactiilor, calculata. Un sold stocat si un jurnal de tranzactii diverg
-- la prima scriere ratata, iar apoi nu mai stii care dintre ele minte. Cu suma,
-- intrebarea nici nu se pune.
-- ═══════════════════════════════════════════════════════════════════════════

-- Pachetele sunt globale, nu per restaurant: le stabileste echipa TableX.
create table if not exists public.whatsapp_credit_packages (
  id         uuid primary key default gen_random_uuid(),
  nume       text not null,
  pret_eur   numeric(10,2) not null check (pret_eur > 0),
  credite    integer not null check (credite > 0),
  activ      boolean not null default true,
  ordine     integer not null default 0
);

insert into public.whatsapp_credit_packages (nume, pret_eur, credite, ordine)
select * from (values
  ('Mic',    20::numeric,  200, 0),
  ('Mediu',  50::numeric,  500, 1),
  ('Mare',  100::numeric, 1000, 2)
) as p(nume, pret_eur, credite, ordine)
where not exists (select 1 from public.whatsapp_credit_packages);

-- Fiecare miscare de credite, cu semn: reincarcarile pozitive, consumul
-- negativ. Soldul e suma lor.
create table if not exists public.whatsapp_tranzactii (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  tip           public.wallet_tranzactie_tip not null,
  credite       integer not null,
  pret_eur      numeric(10,2),
  descriere     text,
  created_at    timestamptz not null default now()
);

create index if not exists whatsapp_tranzactii_restaurant_idx
  on public.whatsapp_tranzactii (restaurant_id, created_at desc);

-- Jurnalul mesajelor (§45.3). In v1 nu pleaca niciun mesaj real; randurile de
-- aici arata ce S-AR fi trimis, ca fluxul sa poata fi verificat cap-coada.
create table if not exists public.whatsapp_mesaje (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  telefon       text not null,
  sablon        text not null,
  continut      text,
  status        public.wa_mesaj_status not null default 'trimis',
  eroare        text,
  created_at    timestamptz not null default now()
);

create index if not exists whatsapp_mesaje_restaurant_idx
  on public.whatsapp_mesaje (restaurant_id, created_at desc);

-- ── Soldul, calculat ───────────────────────────────────────────────────────
create or replace function public.credite_whatsapp(p_restaurant_id uuid default null)
returns integer
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(sum(t.credite), 0)::integer
    from public.whatsapp_tranzactii t
   where t.restaurant_id = coalesce(p_restaurant_id, public.current_restaurant_id())
$$;

comment on function public.credite_whatsapp(uuid) is
  'Soldul de credite = suma tranzactiilor. Niciodata stocat: un sold scris '
  'separat de jurnal diverge la prima scriere ratata.';

revoke execute on function public.credite_whatsapp(uuid) from public;
grant execute on function public.credite_whatsapp(uuid) to authenticated;

-- ── Reincarcarea (demonstrativa, §14) ──────────────────────────────────────
create or replace function public.reincarca_credite(p_package_id uuid)
returns integer
language plpgsql
-- SECURITY DEFINER, si nu din comoditate: tabela de tranzactii NU are politica
-- de INSERT, tocmai ca nimeni sa nu-si poata adauga credite de mana printr-un
-- apel REST. Singura cale de scriere sunt cele doua functii de aici, care isi
-- verifica singure apelantul.
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_pachet     public.whatsapp_credit_packages;
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  -- Creditele costa bani: e o decizie comerciala, deci a managerului.
  if not public.is_manager() then
    raise exception 'Doar managerul poate reincarca creditele.' using errcode = '42501';
  end if;

  select * into v_pachet
    from public.whatsapp_credit_packages
   where id = p_package_id and activ;

  if not found then
    raise exception 'Pachetul nu exista sau nu mai e disponibil.' using errcode = 'P0002';
  end if;

  insert into public.whatsapp_tranzactii (restaurant_id, tip, credite, pret_eur, descriere)
  values (
    v_restaurant,
    'reincarcare',
    v_pachet.credite,
    v_pachet.pret_eur,
    format('Pachet %s — %s credite (demonstrativ, fara plata reala)', v_pachet.nume, v_pachet.credite)
  );

  return public.credite_whatsapp(v_restaurant);
end;
$$;

revoke execute on function public.reincarca_credite(uuid) from public;
grant execute on function public.reincarca_credite(uuid) to authenticated;

-- ── Consumul ───────────────────────────────────────────────────────────────
-- §16.2 si §21.2: mesajul pleaca DOAR daca exista credit. Fara credit nu e o
-- eroare pentru client — mesajul pur si simplu nu se trimite, iar restaurantul
-- vede soldul scazut in Setari.
create or replace function public.consuma_credit(
  p_telefon text,
  p_sablon  text,
  p_continut text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  if public.credite_whatsapp(v_restaurant) < 1 then
    insert into public.whatsapp_mesaje (restaurant_id, telefon, sablon, continut, status, eroare)
    values (v_restaurant, p_telefon, p_sablon, p_continut, 'esuat', 'Fara credite disponibile');
    return false;
  end if;

  insert into public.whatsapp_tranzactii (restaurant_id, tip, credite, descriere)
  values (v_restaurant, 'consum', -1, format('Mesaj: %s', p_sablon));

  insert into public.whatsapp_mesaje (restaurant_id, telefon, sablon, continut, status)
  values (v_restaurant, p_telefon, p_sablon, p_continut, 'trimis');

  return true;
end;
$$;

revoke execute on function public.consuma_credit(text, text, text) from public;
grant execute on function public.consuma_credit(text, text, text) to authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.whatsapp_credit_packages enable row level security;
alter table public.whatsapp_tranzactii enable row level security;
alter table public.whatsapp_mesaje enable row level security;

-- Pachetele sunt un catalog: oricine autentificat le vede, doar echipa le scrie.
drop policy if exists pachete_citire on public.whatsapp_credit_packages;
create policy pachete_citire on public.whatsapp_credit_packages
  for select to authenticated using (true);

drop policy if exists pachete_scriere on public.whatsapp_credit_packages;
create policy pachete_scriere on public.whatsapp_credit_packages
  for all to authenticated
  using (public.is_super_admin_deplin()) with check (public.is_super_admin_deplin());

-- Tranzactiile se CITESC de personal, dar se scriu doar prin RPC-urile de mai
-- sus: fara politica de insert, nimeni nu-si poate adauga credite de mana.
drop policy if exists tranzactii_citire on public.whatsapp_tranzactii;
create policy tranzactii_citire on public.whatsapp_tranzactii
  for select to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin());

drop policy if exists mesaje_citire on public.whatsapp_mesaje;
create policy mesaje_citire on public.whatsapp_mesaje
  for select to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin());
