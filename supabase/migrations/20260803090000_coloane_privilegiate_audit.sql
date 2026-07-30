-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 13. Coloane privilegiate + audit pentru intervenții (§43)
--
-- PROBLEMA GASITA la construirea panoului Super Admin:
-- politica "restaurants_actualizare_manager" (migratia 05) permite unui manager
-- sa modifice ORICE coloana a restaurantului sau. O politica RLS nu poate
-- restrange coloane, deci managerul putea, cu un simplu apel REST:
--   - sa treaca singur pe planul pro_floor        (plan)
--   - sa-si acorde un discount                    (discount_procent)
--   - sa-si prelungeasca perioada de proba        (trial_extins_pana_la)
--   - sa-si deblocheze floor plan-ul              (floor_plan_deblocat_manual)
--   - sa-si scoata restaurantul din suspendare    (status)
--   - sa schimbe slug-ul, invalidand linkurile deja distribuite
-- Interfata nu ofera niciunul dintre acestea, dar API-ul e public.
--
-- Un CHECK nu ajuta (nu vede cine face modificarea), iar politici separate pe
-- coloane nu exista in Postgres. Deci: trigger.
--
-- Al doilea rol al migratiei: enum-ul audit_actiune exista din migratia 01, dar
-- nu avea tabela. Auditul se scrie din trigger, nu din client, deci nu poate fi
-- ocolit pe nicio cale (panou, REST, job viitor).
-- ═══════════════════════════════════════════════════════════════════════

create table public.audit_super_admin (
  id            uuid primary key default gen_random_uuid(),
  actiune       public.audit_actiune not null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  -- Numele restaurantului se copiaza: auditul trebuie sa rămână lizibil si
  -- dupa ce restaurantul a fost sters.
  restaurant_nume text,
  efectuat_de   uuid references auth.users(id) on delete set null,
  email_autor   text,
  detalii       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_super_admin_recent_idx
  on public.audit_super_admin (created_at desc);
create index audit_super_admin_restaurant_idx
  on public.audit_super_admin (restaurant_id, created_at desc);

alter table public.audit_super_admin enable row level security;

-- Doar echipa TableX citeste auditul. Nicio politica de INSERT: singura cale e
-- trigger-ul de mai jos.
create policy audit_citire_super_admin on public.audit_super_admin
  for select to authenticated
  using (public.is_super_admin());

-- ── Coloanele pe care doar echipa TableX le poate schimba ────────────────
create or replace function public.protejeaza_coloane_privilegiate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_super boolean := public.is_super_admin();
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
    raise exception 'Planul, statusul, discountul si deblocarea floor plan-ului se schimba doar de echipa TableX.'
      using errcode = '42501';
  end if;

  -- Slug-ul e adresa publica: schimbarea lui invalideaza linkurile deja
  -- distribuite clientilor, deci trece si el prin echipa.
  if new.slug is distinct from old.slug then
    raise exception 'Adresa publica (slug) se schimba doar de echipa TableX.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_restaurants_coloane_privilegiate
  before update on public.restaurants
  for each row execute function public.protejeaza_coloane_privilegiate();

revoke execute on function public.protejeaza_coloane_privilegiate() from public;

-- ── Auditul intervențiilor ───────────────────────────────────────────────
create or replace function public.auditeaza_interventie_restaurant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  -- Auditam doar ce e privilegiat; modificarile obisnuite ale managerului
  -- (nume, program, buffer) nu au ce sa caute in registrul echipei.
  select u.email into v_email from auth.users u where u.id = auth.uid();

  if new.status is distinct from old.status then
    insert into public.audit_super_admin
      (actiune, restaurant_id, restaurant_nume, efectuat_de, email_autor, detalii)
    values (
      case new.status
        when 'suspendat' then 'suspend'::public.audit_actiune
        when 'banat'     then 'ban'::public.audit_actiune
        else                  'unsuspend'::public.audit_actiune
      end,
      new.id, new.nume, auth.uid(), v_email,
      jsonb_build_object('din', old.status, 'in', new.status, 'motiv', new.motiv_suspendare)
    );
  end if;

  if new.plan is distinct from old.plan then
    insert into public.audit_super_admin
      (actiune, restaurant_id, restaurant_nume, efectuat_de, email_autor, detalii)
    values ('schimbare_plan', new.id, new.nume, auth.uid(), v_email,
            jsonb_build_object('din', old.plan, 'in', new.plan));
  end if;

  if new.discount_procent is distinct from old.discount_procent then
    insert into public.audit_super_admin
      (actiune, restaurant_id, restaurant_nume, efectuat_de, email_autor, detalii)
    values ('discount', new.id, new.nume, auth.uid(), v_email,
            jsonb_build_object('din', old.discount_procent, 'in', new.discount_procent));
  end if;

  if new.trial_extins_pana_la is distinct from old.trial_extins_pana_la then
    insert into public.audit_super_admin
      (actiune, restaurant_id, restaurant_nume, efectuat_de, email_autor, detalii)
    values ('extend_trial', new.id, new.nume, auth.uid(), v_email,
            jsonb_build_object('pana_la', new.trial_extins_pana_la));
  end if;

  if new.floor_plan_deblocat_manual is distinct from old.floor_plan_deblocat_manual then
    insert into public.audit_super_admin
      (actiune, restaurant_id, restaurant_nume, efectuat_de, email_autor, detalii)
    values ('manual_floor_plan_unlock', new.id, new.nume, auth.uid(), v_email,
            jsonb_build_object('deblocat', new.floor_plan_deblocat_manual));
  end if;

  return null;
end;
$$;

create trigger trg_restaurants_audit
  after update on public.restaurants
  for each row execute function public.auditeaza_interventie_restaurant();

revoke execute on function public.auditeaza_interventie_restaurant() from public;

-- ── Auditul setarilor globale ────────────────────────────────────────────
create or replace function public.auditeaza_setari_globale()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = auth.uid();

  if new.maintenance_mode is distinct from old.maintenance_mode then
    insert into public.audit_super_admin (actiune, efectuat_de, email_autor, detalii)
    values ('maintenance_toggle', auth.uid(), v_email,
            jsonb_build_object('activ', new.maintenance_mode, 'mesaj', new.mesaj_mentenanta));
  end if;

  if new.pret_plan_start        is distinct from old.pret_plan_start
     or new.pret_plan_pro       is distinct from old.pret_plan_pro
     or new.setup_floor_plan_pret is distinct from old.setup_floor_plan_pret
     or new.setup_pret_masa_extra is distinct from old.setup_pret_masa_extra
     or new.comision_bilete_procent is distinct from old.comision_bilete_procent then
    insert into public.audit_super_admin (actiune, efectuat_de, email_autor, detalii)
    values ('schimbare_preturi', auth.uid(), v_email,
            jsonb_build_object(
              'start_vechi', old.pret_plan_start, 'start_nou', new.pret_plan_start,
              'pro_vechi',   old.pret_plan_pro,   'pro_nou',   new.pret_plan_pro,
              'setup_vechi', old.setup_floor_plan_pret, 'setup_nou', new.setup_floor_plan_pret
            ));
  end if;

  return null;
end;
$$;

create trigger trg_app_settings_audit
  after update on public.app_settings
  for each row execute function public.auditeaza_setari_globale();

revoke execute on function public.auditeaza_setari_globale() from public;
