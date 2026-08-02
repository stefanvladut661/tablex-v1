-- ═══════════════════════════════════════════════════════════════════════════
-- Suspendarea restaurantului inchide si DATELE, nu doar dashboard-ul (§20.3)
--
-- GAURA GASITA de analiza pe spec: la suspendare, RutaAdmin (React) arata
-- ecranul de blocaj — dar RLS-ul nu stia nimic de restaurants.status, deci
-- personalul unui restaurant suspendat isi putea citi si scrie TOATE datele
-- printr-un apel REST direct. Regula aparata numai in interfata nu e o regula.
--
-- Taietura e centrala, nu politica-cu-politica: current_restaurant_id() —
-- temelia tuturor politicilor de tenancy — intoarce de-acum NULL cand
-- restaurantul contului nu e 'activ'. Toate politicile construite pe el se
-- inchid singure, dintr-o singura miscare.
--
-- O singura exceptie, deliberata: propriul rand din `restaurants` ramane
-- vizibil prin noua functie restaurantul_contului() (fara filtrul de status).
-- Fara ea, ecranul de blocaj n-ar mai putea afla nici CA e suspendat, nici
-- motivul — profilul se incarca exact prin embed-ul admin_users→restaurants.
-- ═══════════════════════════════════════════════════════════════════════════

-- Restaurantul contului, INDIFERENT de status — semantica veche, pastrata
-- doar pentru citirea propriului rand din restaurants.
create or replace function public.restaurantul_contului()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.restaurant_id
  from public.admin_users a
  where a.user_id = auth.uid() and a.activ
  limit 1
$$;

comment on function public.restaurantul_contului is
  'Restaurantul contului, indiferent de status. DOAR pentru restaurants_citire: '
  'ecranul de blocaj (§20.3) trebuie sa poata afisa statusul si motivul.';

revoke execute on function public.restaurantul_contului() from public, anon;
grant execute on function public.restaurantul_contului() to authenticated;

-- Temelia tenancy-ului cere de-acum si restaurant ACTIV (§20.3).
-- Semnatura neschimbata: create or replace pastreaza drepturile.
create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.restaurant_id
  from public.admin_users a
  join public.restaurants r on r.id = a.restaurant_id
  where a.user_id = auth.uid() and a.activ and r.status = 'activ'
  limit 1
$$;

comment on function public.current_restaurant_id is
  'Restaurantul contului curent, sau NULL. Baza tuturor politicilor de tenancy. '
  'Din §20.3, NULL si cand restaurantul e suspendat/banat: suspendarea inchide '
  'datele, nu doar dashboard-ul.';

-- Propriul restaurant ramane lizibil si suspendat — prin functia dedicata.
drop policy if exists restaurants_citire on public.restaurants;
create policy restaurants_citire on public.restaurants
  for select to authenticated
  using (id = public.restaurantul_contului() or public.is_super_admin());
