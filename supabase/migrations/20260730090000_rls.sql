-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 05. Row Level Security
--
-- Pana la aceasta migratie toate tabelele publice erau accesibile cu cheia
-- anon (PostgREST + grant-urile implicite Supabase). Aici:
--   1. functii helper SECURITY DEFINER (nu declanseaza recursie in politici)
--   2. RLS + politici pe fiecare tabela
--   3. o vedere cu datele publice ale restaurantului, pentru widget
--   4. igiena: search_path fixat, revocare EXECUTE pe functiile de trigger
--
-- Model de acces:
--   anon           — doar slug-uri rezervate, setari globale, vedere publica
--   ospatar        — citeste tot din restaurantul lui, scrie operational
--   manager        — in plus, scrie configurarea restaurantului
--   super_admin    — acces complet (echipa TableX)
-- ═══════════════════════════════════════════════════════════════════════

-- ── Helper-e ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER e obligatoriu: fara el, o politica pe admin_users care
-- interogheaza admin_users s-ar evalua recursiv si Postgres ar arunca eroare.

create or replace function public.current_restaurant_id()
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
comment on function public.current_restaurant_id is
  'Restaurantul contului curent, sau NULL. Baza tuturor politicilor de tenancy.';

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.activ and a.rol = 'manager'
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.super_admin_users s
    where s.user_id = auth.uid() and s.activ
  )
$$;

-- Doar rolul 'super_admin' propriu-zis; 'support' si 'designer_architect' nu
-- au voie sa schimbe preturi sau sa suspende conturi (§9.2.7).
create or replace function public.is_super_admin_deplin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.super_admin_users s
    where s.user_id = auth.uid() and s.activ and s.rol = 'super_admin'
  )
$$;

revoke execute on function public.current_restaurant_id()   from anon;
revoke execute on function public.is_manager()              from anon;
revoke execute on function public.is_super_admin()          from anon;
revoke execute on function public.is_super_admin_deplin()   from anon;

-- ═══════════════════════════════════════════════════════════════════════
-- app_settings — citire libera (preturi de afisat pe landing), scriere doar
-- de super admin deplin.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.app_settings enable row level security;

create policy app_settings_citire on public.app_settings
  for select to anon, authenticated using (true);

create policy app_settings_scriere on public.app_settings
  for update to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());

-- ═══════════════════════════════════════════════════════════════════════
-- slug_rezervate — necesar la signup, ca sa validam slug-ul propus.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.slug_rezervate enable row level security;

create policy slug_rezervate_citire on public.slug_rezervate
  for select to anon, authenticated using (true);

-- ═══════════════════════════════════════════════════════════════════════
-- restaurants
-- Vizitatorul anonim NU vede randul complet (cui, discount, motiv_suspendare);
-- pentru widget exista vederea restaurante_publice de mai jos.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.restaurants enable row level security;

create policy restaurants_citire on public.restaurants
  for select to authenticated
  using (id = public.current_restaurant_id() or public.is_super_admin());

create policy restaurants_actualizare_manager on public.restaurants
  for update to authenticated
  using (id = public.current_restaurant_id() and public.is_manager())
  with check (id = public.current_restaurant_id() and public.is_manager());

create policy restaurants_scriere_super_admin on public.restaurants
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Vedere cu date strict publice. security_invoker = false (implicit): ruleaza
-- cu drepturile proprietarului, deci trece peste RLS-ul tabelei de baza si
-- expune exact coloanele enumerate aici.
create view public.restaurante_publice as
  select
    r.id,
    r.slug,
    r.nume,
    r.oras,
    r.tip_locatie,
    r.logo_url,
    r.culoare_accent,
    r.program_standard,
    r.fus_orar,
    r.durata_implicita_minute,
    r.max_scaune_masa,
    r.aprobare_automata
  from public.restaurants r
  where r.status = 'activ';

comment on view public.restaurante_publice is
  'Datele pe care widgetul de rezervare le poate arata unui vizitator anonim.';

grant select on public.restaurante_publice to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- admin_users — fiecare isi vede randul propriu; managerul vede si
-- gestioneaza echipa restaurantului sau.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.admin_users enable row level security;

create policy admin_users_citire on public.admin_users
  for select to authenticated
  using (
    user_id = auth.uid()
    or restaurant_id = public.current_restaurant_id()
    or public.is_super_admin()
  );

-- Preferintele personale (list_view_columns_config, nume) — pe randul propriu.
create policy admin_users_actualizare_propriu on public.admin_users
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy admin_users_gestiune_manager on public.admin_users
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() and public.is_manager())
  with check (restaurant_id = public.current_restaurant_id() and public.is_manager());

create policy admin_users_super_admin on public.admin_users
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- super_admin_users
-- ═══════════════════════════════════════════════════════════════════════
alter table public.super_admin_users enable row level security;

create policy super_admin_users_citire on public.super_admin_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

create policy super_admin_users_scriere on public.super_admin_users
  for all to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());

-- ═══════════════════════════════════════════════════════════════════════
-- Invitatii — token-urile nu ajung niciodata la anon. Acceptarea invitatiei
-- se face printr-un RPC dedicat (Faza 3), nu prin citirea tabelei.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.staff_invitations enable row level security;

create policy staff_invitations_manager on public.staff_invitations
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() and public.is_manager())
  with check (restaurant_id = public.current_restaurant_id() and public.is_manager());

create policy staff_invitations_super_admin on public.staff_invitations
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

alter table public.super_admin_invitations enable row level security;

create policy super_admin_invitations_scriere on public.super_admin_invitations
  for all to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());

-- ═══════════════════════════════════════════════════════════════════════
-- Tabele de CONFIGURARE — citite de tot personalul, scrise doar de manager.
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare
  t text;
begin
  foreach t in array array[
    'program_exceptii', 'zones', 'tables', 'floor_plan_layers', 'formular_campuri'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$
      create policy %1$s_citire on public.%1$I
        for select to authenticated
        using (restaurant_id = public.current_restaurant_id() or public.is_super_admin())
    $f$, t);

    execute format($f$
      create policy %1$s_scriere_manager on public.%1$I
        for all to authenticated
        using (restaurant_id = public.current_restaurant_id() and public.is_manager())
        with check (restaurant_id = public.current_restaurant_id() and public.is_manager())
    $f$, t);

    execute format($f$
      create policy %1$s_super_admin on public.%1$I
        for all to authenticated
        using (public.is_super_admin())
        with check (public.is_super_admin())
    $f$, t);
  end loop;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Tabele OPERATIONALE — si ospatarul trebuie sa poata scrie (rezervari,
-- walk-in, sosiri). Tot restaurant-scoped.
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare
  t text;
begin
  foreach t in array array[
    'reservations', 'customers', 'waitlist', 'table_allocations',
    'customer_merge_audit', 'floor_plan_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$
      create policy %1$s_personal on public.%1$I
        for all to authenticated
        using (restaurant_id = public.current_restaurant_id() or public.is_super_admin())
        with check (restaurant_id = public.current_restaurant_id() or public.is_super_admin())
    $f$, t);
  end loop;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- floor_plan_projects — spatiul de lucru al echipei de design (§48).
-- Restaurantul vede doar proiectele publicate care ii aparțin.
-- ═══════════════════════════════════════════════════════════════════════
alter table public.floor_plan_projects enable row level security;

create policy floor_plan_projects_super_admin on public.floor_plan_projects
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy floor_plan_projects_citire_restaurant on public.floor_plan_projects
  for select to authenticated
  using (restaurant_id = public.current_restaurant_id() and status = 'published');

-- ═══════════════════════════════════════════════════════════════════════
-- Igiena semnalata de database linter
-- ═══════════════════════════════════════════════════════════════════════

-- search_path mutabil intr-o functie apelata de trigger = vector de
-- privilege escalation (o schema temporara poate umbri un nume de tabela).
alter function public.set_updated_at()                set search_path = public, pg_temp;
alter function public.verifica_slug_rezervat()        set search_path = public, pg_temp;
alter function public.verifica_capacitate_masa()      set search_path = public, pg_temp;
alter function public.protejeaza_camp_telefon()       set search_path = public, pg_temp;
alter function public.rezervare_calculeaza_interval() set search_path = public, pg_temp;
alter function public.sincronizeaza_alocari_rezervare() set search_path = public, pg_temp;

-- Functiile de trigger nu au ce sa caute in API-ul REST.
revoke execute on function public.set_updated_at()                  from anon, authenticated;
revoke execute on function public.verifica_slug_rezervat()          from anon, authenticated;
revoke execute on function public.verifica_apartenenta_unica()      from anon, authenticated;
revoke execute on function public.verifica_capacitate_masa()        from anon, authenticated;
revoke execute on function public.protejeaza_camp_telefon()         from anon, authenticated;
revoke execute on function public.rezervare_calculeaza_interval()   from anon, authenticated;
revoke execute on function public.sincronizeaza_alocari_rezervare() from anon, authenticated;

-- Raport de diagnostic pentru manager, nu pentru public.
revoke execute on function public.verifica_conflicte_buffer(uuid, integer) from anon;

-- disponibilitate_mese ramane apelabila de anon: e exact ce are nevoie
-- widgetul public pentru a arata mesele libere (§7.4).
