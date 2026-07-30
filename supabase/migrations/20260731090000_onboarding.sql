-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 06. Onboarding: creare restaurant + invitatii personal
--
-- De ce RPC-uri si nu insert-uri directe din client:
--   Politicile RLS din migratia 05 permit scrierea in restaurants doar celui
--   care e DEJA admin al restaurantului respectiv. Un cont proaspat, fara rand
--   in admin_users, nu are cum sa treaca — si nici nu vrem sa slabim politica,
--   fiindca asta ar deschide crearea de restaurante oricui.
--   Solutia corecta e o functie SECURITY DEFINER care valideaza singura
--   preconditiile (un cont = un restaurant, §20.1) si scrie atomic.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Verificarea disponibilitatii unui slug ───────────────────────────────
-- Poate fi apelata si de anon (formularul de signup verifica in timp real),
-- dar returneaza strict un boolean: nu scurge lista de restaurante.
create or replace function public.slug_disponibil(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'
     and not exists (select 1 from public.slug_rezervate s where s.slug = p_slug)
     and not exists (select 1 from public.restaurants r where r.slug = p_slug)
$$;

comment on function public.slug_disponibil is
  'True daca slug-ul respecta formatul, nu e rezervat de sistem si nu e luat.';

-- ── Crearea restaurantului ───────────────────────────────────────────────
create or replace function public.creeaza_restaurant(
  p_nume          text,
  p_slug          text,
  p_nume_persoana text default null,
  p_plan          public.plan_tip default 'start',
  p_nume_firma    text default null,
  p_cui           text default null,
  p_oras          text default null,
  p_adresa        text default null,
  p_telefon       text default null,
  p_tip_locatie   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user       uuid := auth.uid();
  v_email      text;
  v_restaurant uuid;
begin
  if v_user is null then
    raise exception 'Trebuie sa fii autentificat.' using errcode = '42501';
  end if;

  -- §20.1: un cont aparține unui singur restaurant.
  if exists (select 1 from public.admin_users a where a.user_id = v_user) then
    raise exception 'Contul tau este deja asociat unui restaurant.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.super_admin_users s where s.user_id = v_user) then
    raise exception 'Un cont din echipa TableX nu poate crea restaurante.' using errcode = 'P0001';
  end if;

  if not public.slug_disponibil(p_slug) then
    raise exception 'Adresa "%" nu este disponibila.', p_slug using errcode = 'P0001';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.restaurants (
    nume, slug, plan, nume_firma, cui, oras, adresa,
    telefon_contact, tip_locatie, email_contact, persoana_contact
  )
  values (
    p_nume, p_slug, p_plan, p_nume_firma, p_cui, p_oras, p_adresa,
    p_telefon, p_tip_locatie, v_email, p_nume_persoana
  )
  returning id into v_restaurant;

  -- Cel care creeaza restaurantul e implicit manager.
  insert into public.admin_users (restaurant_id, user_id, rol, nume, email)
  values (v_restaurant, v_user, 'manager', p_nume_persoana, v_email);

  -- O zona implicita, ca panoul sa nu fie gol imediat dupa onboarding.
  insert into public.zones (restaurant_id, nume, ordine_afisare)
  values (v_restaurant, 'Salon', 0);

  -- Campurile de sistem ale formularului de rezervare (§27).
  insert into public.formular_campuri
    (restaurant_id, cheie, eticheta, tip, obligatoriu, sistem, ordine)
  values
    (v_restaurant, 'nume',        'Nume',              'text',  true,  true, 0),
    (v_restaurant, 'telefon',     'Telefon',           'text',  true,  true, 1),
    (v_restaurant, 'email',       'Email',             'text',  false, true, 2),
    (v_restaurant, 'nr_persoane', 'Numar de persoane', 'numar', true,  true, 3);

  return v_restaurant;
end;
$$;

-- ── Invitatii: citirea detaliilor pe token ───────────────────────────────
-- Tabela staff_invitations nu e citibila de anon (token-urile sunt secrete),
-- deci pagina de acceptare primeste doar strictul necesar, si numai pentru o
-- invitatie activa si nefolosita.
create or replace function public.detalii_invitatie(p_token text)
returns table (
  restaurant_nume text,
  email           text,
  rol             public.admin_rol,
  expira_la       timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.nume, i.email, i.rol, i.expira_la
  from public.staff_invitations i
  join public.restaurants r on r.id = i.restaurant_id
  where i.token = p_token
    and i.status = 'trimisa'
    and i.expira_la > now()
$$;

-- ── Invitatii: acceptarea ────────────────────────────────────────────────
create or replace function public.accepta_invitatie(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_inv   public.staff_invitations;
begin
  if v_user is null then
    raise exception 'Trebuie sa fii autentificat pentru a accepta invitatia.'
      using errcode = '42501';
  end if;

  select * into v_inv
    from public.staff_invitations i
   where i.token = p_token and i.status = 'trimisa'
     for update;

  if not found then
    raise exception 'Invitatia nu mai este valabila.' using errcode = 'P0001';
  end if;

  if v_inv.expira_la <= now() then
    update public.staff_invitations set status = 'expirata' where id = v_inv.id;
    raise exception 'Invitatia a expirat.' using errcode = 'P0001';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  -- Invitatia e legata de o adresa: altfel oricine cu linkul ar intra in cont.
  if lower(coalesce(v_email, '')) <> lower(v_inv.email) then
    raise exception 'Invitatia a fost trimisa adresei %. Autentifica-te cu ea.', v_inv.email
      using errcode = 'P0001';
  end if;

  if exists (select 1 from public.admin_users a where a.user_id = v_user) then
    raise exception 'Contul tau este deja asociat unui restaurant.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.super_admin_users s where s.user_id = v_user) then
    raise exception 'Un cont din echipa TableX nu poate accepta invitatii.' using errcode = 'P0001';
  end if;

  insert into public.admin_users (restaurant_id, user_id, rol, nume, email)
  values (
    v_inv.restaurant_id,
    v_user,
    v_inv.rol,
    (select u.raw_user_meta_data ->> 'nume' from auth.users u where u.id = v_user),
    v_email
  );

  update public.staff_invitations
     set status = 'acceptata', acceptata_la = now()
   where id = v_inv.id;

  return v_inv.restaurant_id;
end;
$$;

-- ── Drepturi de execuție ─────────────────────────────────────────────────
-- Doar cele doua functii de citire au sens pentru un vizitator anonim.
revoke execute on function public.creeaza_restaurant(
  text, text, text, public.plan_tip, text, text, text, text, text, text
) from anon;
revoke execute on function public.accepta_invitatie(text) from anon;
