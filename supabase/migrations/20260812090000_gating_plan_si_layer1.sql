-- ═══════════════════════════════════════════════════════════════════════════
-- Planul Start nu mai primeste Harta 2D, iar Layer 1 se inchide (§8.4, §10.1, §14)
--
-- Doua reguli din specificatie erau scrise nicaieri in baza:
--
-- 1. §10.1: Harta 2D e functia PLATITA a planului Pro Floor. Pana acum, un cont
--    Start avea acces integral la ea — adica exact lucrul pentru care ceilalti
--    platesc dublu. Nu era doar o scapare de interfata: `tables` si `zones` erau
--    scriabile de orice manager, deci si un blocaj vizual s-ar fi ocolit cu o
--    cerere REST din consola browserului.
--
-- 2. §8.4 si §14 spun raspicat ca Adminul restaurantului NU poate atinge Layer 1
--    (pereti, usi, bar, zone speciale) — e treaba echipei TableX, prin editor.
--    Politica `floor_plan_layers_scriere_manager`, generata de bucla de tabele
--    de configurare din migratia RLS, ii dadea `for all`. Un manager putea
--    sterge peretii salii desenate de echipa printr-un singur apel. Triggerele
--    din migratia 19 apara doar stergerea meselor si a zonelor cu rezervari
--    viitoare; stratul de structura nu era aparat de nimic.
--
-- Deblocarea manuala (`floor_plan_deblocat_manual`) ramane calea prin care
-- echipa da harta unui restaurant care a platit prin transfer bancar (§43.6),
-- deci garda o respecta — altfel butonul din panoul echipei ar fi decorativ.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Cine are dreptul la harta ──────────────────────────────────────────────
-- security definer, ca `is_manager()`: politica trebuie sa poata citi
-- `restaurants` chiar si pentru un rol care n-are voie sa vada tot randul.
create or replace function public.are_floor_plan()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
      from public.restaurants r
     where r.id = public.current_restaurant_id()
       and (r.plan = 'pro_floor' or r.floor_plan_deblocat_manual)
  )
$$;

comment on function public.are_floor_plan() is
  'Restaurantul curent are Harta 2D: plan Pro Floor sau deblocare manuala (§10.1, §43.6).';

revoke execute on function public.are_floor_plan() from public;
grant execute on function public.are_floor_plan() to authenticated;

-- ── Mesele si zonele: doar cu harta platita ────────────────────────────────
-- Citirea ramane neatinsa: un cont Start isi vede zona creata la onboarding si
-- rezervarile legate de ea. Doar SCRIEREA cere planul.
drop policy if exists tables_scriere_manager on public.tables;
create policy tables_scriere_manager on public.tables
  for all to authenticated
  using (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and public.are_floor_plan()
  )
  with check (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and public.are_floor_plan()
  );

drop policy if exists zones_scriere_manager on public.zones;
create policy zones_scriere_manager on public.zones
  for all to authenticated
  using (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and public.are_floor_plan()
  )
  with check (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and public.are_floor_plan()
  );

-- ── Layer 1 iese complet din mana restaurantului ───────────────────────────
-- Fara politica de inlocuire: nu exista niciun caz in care restaurantul sa
-- scrie structura. Citirea (`floor_plan_layers_citire`) si accesul echipei
-- (`floor_plan_layers_super_admin`) raman cum erau.
drop policy if exists floor_plan_layers_scriere_manager on public.floor_plan_layers;

comment on table public.floor_plan_layers is
  'Layer 1 — structura salii. Scrisa EXCLUSIV de echipa TableX (§8.4, §14): '
  'restaurantul o citeste, dar nu o poate modifica. Mesele stau in `tables`.';
