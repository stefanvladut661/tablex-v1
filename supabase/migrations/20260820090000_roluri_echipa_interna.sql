-- ═══════════════════════════════════════════════════════════════════════════
-- Rolurile interne ale echipei TableX, impuse in baza (§9.2.7, §47.4)
--
-- GAURA GASITA la verificarea fata de spec: aproape toate politicile si
-- trigger-ul de coloane privilegiate verifica is_super_admin() — adica simpla
-- APARTENENTA la echipa. Dar §9.2.7 imparte echipa in trei roluri cu limite
-- clare:
--   - super_admin:        acces 100%;
--   - designer_architect: EXCLUSIV Floor Plan Studio — fara date financiare,
--                         fara suport, fara interventii comerciale;
--   - support:            doar chat/tichete si datele de contact ale
--                         clientilor (adica ale restaurantelor).
-- Pana la migratia asta, un cont support putea suspenda un restaurant sau
-- schimba planul lui dintr-un apel REST. Interfata nu-i arata butoanele, dar
-- regula aparata numai in React se ocoleste dintr-o consola de browser.
--
-- Cum se imparte accesul de SCRIERE de aici inainte:
--   - comercial (restaurants privilegiat, admin_users, staff_invitations,
--     program_exceptii, formular_campuri, rezervari, clienti, evenimente):
--     DOAR super_admin deplin;
--   - atelier (zones, tables, floor_plan_layers, floor_plan_projects,
--     floor_plan_requests): super_admin deplin + designer_architect;
--   - notificari (clopotelul comun al echipei): toata echipa — marcarea ca
--     citit e UPDATE, iar clopotelul e impartit pe roluri doar in interfata.
--
-- CITIRILE raman mai largi acolo unde fluxul de lucru o cere: restaurants se
-- citeste de toata echipa (studio-ul are nevoie de nume pentru foldere §40,
-- suportul de datele de contact §47.4). In schimb citirile FINANCIARE
-- (tranzactii de credite, jurnal de mesaje, audit comercial, bilete) se
-- restrang la super_admin deplin — §47.4 le interzice explicit designerului.
--
-- Politicile se schimba prin DROP + CREATE (nu exista ALTER POLICY pe USING
-- in forma care ne trebuie); numele raman identice, ca sa nu se dubleze.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Ajutoarele de rol ──────────────────────────────────────────────────────
create or replace function public.is_echipa_studio()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.super_admin_users s
    where s.user_id = auth.uid() and s.activ
      and s.rol in ('super_admin', 'designer_architect')
  )
$$;

comment on function public.is_echipa_studio is
  'Cine are voie in Floor Plan Studio: super_admin deplin + designer_architect (§47.4).';

create or replace function public.is_echipa_suport()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.super_admin_users s
    where s.user_id = auth.uid() and s.activ
      and s.rol in ('super_admin', 'support')
  )
$$;

comment on function public.is_echipa_suport is
  'Cine vede si raspunde la tichete: super_admin deplin + support (§47.4).';

revoke execute on function public.is_echipa_studio() from anon;
revoke execute on function public.is_echipa_suport() from anon;

-- ── Trigger-ul de coloane privilegiate: doar rolul super_admin ─────────────
-- Semnatura nu se schimba, deci create or replace e suficient si drepturile
-- raman. Singura schimbare: v_super cere rolul deplin, nu doar echipa.
create or replace function public.protejeaza_coloane_privilegiate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- §47.4: interventiile comerciale sunt exclusiv ale rolului super_admin;
  -- designer_architect si support cad in ramura de refuz, ca orice manager.
  v_super boolean := public.is_super_admin_deplin();
begin
  if v_super then
    -- §43.5: suspendarea si banarea cer un motiv, chiar si pentru echipa.
    if new.status <> old.status
       and new.status in ('suspendat', 'banat')
       and coalesce(btrim(new.motiv_suspendare), '') = '' then
      raise exception 'Suspendarea sau banarea cere un motiv (spec §43.5).'
        using errcode = 'P0001';
    end if;

    -- Marcam automat momentul suspendarii, ca sa nu depinda de client.
    if new.status <> old.status then
      new.suspendat_la := case when new.status in ('suspendat', 'banat') then now() end;
    end if;

    return new;
  end if;

  -- Restul: orice modificare a coloanelor privilegiate e refuzata.
  if new.plan                       is distinct from old.plan
     or new.status                  is distinct from old.status
     or new.motiv_suspendare        is distinct from old.motiv_suspendare
     or new.suspendat_la            is distinct from old.suspendat_la
     or new.discount_procent        is distinct from old.discount_procent
     or new.trial_extins_pana_la    is distinct from old.trial_extins_pana_la
     or new.floor_plan_deblocat_manual is distinct from old.floor_plan_deblocat_manual
     or new.setup_floor_plan_platit is distinct from old.setup_floor_plan_platit then
    raise exception 'Planul, statusul, discountul si deblocarea floor plan-ului se schimba doar de rolul super_admin.'
      using errcode = '42501';
  end if;

  -- Slug-ul e adresa publica: schimbarea lui invalideaza linkurile deja
  -- distribuite clientilor, deci trece si el prin rolul super_admin.
  if new.slug is distinct from old.slug then
    raise exception 'Adresa publica (slug) se schimba doar de rolul super_admin.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ── Scrieri comerciale: doar super_admin deplin ────────────────────────────
drop policy if exists restaurants_scriere_super_admin on public.restaurants;
create policy restaurants_scriere_super_admin on public.restaurants
  for all to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());

drop policy if exists admin_users_super_admin on public.admin_users;
create policy admin_users_super_admin on public.admin_users
  for all to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());

drop policy if exists staff_invitations_super_admin on public.staff_invitations;
create policy staff_invitations_super_admin on public.staff_invitations
  for all to authenticated
  using (public.is_super_admin_deplin())
  with check (public.is_super_admin_deplin());

-- Tabelele de configurare care NU tin de atelier.
do $$
declare
  t text;
begin
  foreach t in array array['program_exceptii', 'formular_campuri']
  loop
    execute format('drop policy if exists %1$s_super_admin on public.%1$I', t);
    execute format($f$
      create policy %1$s_super_admin on public.%1$I
        for all to authenticated
        using (public.is_super_admin_deplin())
        with check (public.is_super_admin_deplin())
    $f$, t);
  end loop;
end
$$;

-- Tabelele operationale: partea de echipa din politica combinata coboara la
-- super_admin deplin. Restaurantul isi pastreaza neatins accesul propriu.
do $$
declare
  t text;
begin
  foreach t in array array[
    'reservations', 'customers', 'waitlist', 'table_allocations', 'customer_merge_audit'
  ]
  loop
    execute format('drop policy if exists %1$s_personal on public.%1$I', t);
    execute format($f$
      create policy %1$s_personal on public.%1$I
        for all to authenticated
        using (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin())
        with check (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin())
    $f$, t);
  end loop;
end
$$;

-- Evenimente si bilete: date comerciale (§10.4) — echipa inseamna doar deplin.
drop policy if exists events_personal on public.events;
create policy events_personal on public.events
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin())
  with check (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin());

drop policy if exists tickets_personal on public.tickets;
create policy tickets_personal on public.tickets
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin())
  with check (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin());

-- ── Atelierul: super_admin deplin + designer_architect ─────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['zones', 'tables', 'floor_plan_layers']
  loop
    execute format('drop policy if exists %1$s_super_admin on public.%1$I', t);
    execute format($f$
      create policy %1$s_super_admin on public.%1$I
        for all to authenticated
        using (public.is_echipa_studio())
        with check (public.is_echipa_studio())
    $f$, t);
  end loop;
end
$$;

drop policy if exists floor_plan_projects_super_admin on public.floor_plan_projects;
create policy floor_plan_projects_super_admin on public.floor_plan_projects
  for all to authenticated
  using (public.is_echipa_studio())
  with check (public.is_echipa_studio());

drop policy if exists floor_plan_requests_personal on public.floor_plan_requests;
create policy floor_plan_requests_personal on public.floor_plan_requests
  for all to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_echipa_studio())
  with check (restaurant_id = public.current_restaurant_id() or public.is_echipa_studio());

-- Schitele incarcate de restaurante se vad doar de cine lucreaza la harti.
drop policy if exists schite_citire_echipa on storage.objects;
create policy schite_citire_echipa on storage.objects
  for select to authenticated
  using (bucket_id = 'schite' and public.is_echipa_studio());

-- ── Citiri financiare: doar super_admin deplin (§47.4) ─────────────────────
drop policy if exists tranzactii_citire on public.whatsapp_tranzactii;
create policy tranzactii_citire on public.whatsapp_tranzactii
  for select to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin());

drop policy if exists mesaje_citire on public.whatsapp_mesaje;
create policy mesaje_citire on public.whatsapp_mesaje
  for select to authenticated
  using (restaurant_id = public.current_restaurant_id() or public.is_super_admin_deplin());

-- Registrul de audit consemneaza interventii comerciale — nu e nici pentru
-- designer, nici pentru support.
drop policy if exists audit_citire_super_admin on public.audit_super_admin;
create policy audit_citire_super_admin on public.audit_super_admin
  for select to authenticated
  using (public.is_super_admin_deplin());
