-- ═══════════════════════════════════════════════════════════════════════════
-- Invitatii pentru echipa TableX (§9.2.7) — ultima tabela fara cale de acces
--
-- `super_admin_invitations` exista din migratia tenancy, cu index de unicitate
-- pe invitatia activa si politica de scriere rezervata super adminului deplin.
-- Nimic nu scria si nimic nu citea din ea: singurul mod de a adauga un om in
-- echipa TableX era un INSERT manual in `super_admin_users`, din SQL, cu
-- user_id-ul copiat de mana din auth.users. Adica exact operatia pe care
-- tabela de invitatii o inlocuia.
--
-- Decizia de forma: NU o a doua pagina de invitatie. Linkul primit pe email
-- duce tot la /invitatie, iar cele doua RPC-uri existente invata sa raspunda
-- pentru ambele feluri de invitatie. Tokenul e din acelasi spatiu (32 de octeti
-- aleatori), deci nu se pot confunda, iar utilizatorul nu trebuie sa stie in ce
-- tabela sta invitatia lui.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── detalii_invitatie: semnatura noua, deci DROP inainte de CREATE ─────────
-- Se schimba lista de coloane intoarse; `create or replace` ar fi refuzat.
-- Rolul iese ca TEXT: cele doua invitatii au enum-uri diferite (admin_rol si
-- super_admin_rol), iar o functie nu poate intoarce coloane cu tip variabil.
-- Drepturile se pierd la DROP si se reasaza la final (lectia migratiei 07).
drop function if exists public.detalii_invitatie(text);

create function public.detalii_invitatie(p_token text)
returns table (
  tip             text,
  restaurant_nume text,
  email           text,
  rol             text,
  expira_la       timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select 'restaurant'::text, r.nume, i.email, i.rol::text, i.expira_la
    from public.staff_invitations i
    join public.restaurants r on r.id = i.restaurant_id
   where i.token = p_token
     and i.status = 'trimisa'
     and i.expira_la > now()

  union all

  select 'echipa'::text, 'Echipa TableX'::text, s.email, s.rol::text, s.expira_la
    from public.super_admin_invitations s
   where s.token = p_token
     and s.status = 'trimisa'
     and s.expira_la > now()
$$;

revoke execute on function public.detalii_invitatie(text) from public;
grant execute on function public.detalii_invitatie(text) to anon, authenticated;

-- ── accepta_invitatie: aceeasi semnatura, deci grant-urile raman ───────────
-- Intoarce restaurantul pentru invitatiile de restaurant si NULL pentru cele
-- de echipa: pagina stie deja din `detalii_invitatie` unde sa mearga dupa.
create or replace function public.accepta_invitatie(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user    uuid := auth.uid();
  v_email   text;
  v_inv     public.staff_invitations;
  v_echipa  public.super_admin_invitations;
begin
  if v_user is null then
    raise exception 'Trebuie sa fii autentificat pentru a accepta invitatia.'
      using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  -- ── Invitatie in echipa TableX ──────────────────────────────────────────
  select * into v_echipa
    from public.super_admin_invitations s
   where s.token = p_token and s.status = 'trimisa'
   for update;

  if found then
    if v_echipa.expira_la <= now() then
      update public.super_admin_invitations set status = 'expirata' where id = v_echipa.id;
      raise exception 'Invitatia a expirat.' using errcode = 'P0001';
    end if;

    if lower(coalesce(v_email, '')) <> lower(v_echipa.email) then
      raise exception 'Invitatia a fost trimisa adresei %. Autentifica-te cu ea.', v_echipa.email
        using errcode = 'P0001';
    end if;

    -- Un cont nu poate fi si Admin de restaurant, si din echipa: trigger-ul
    -- din migratia tenancy o impune oricum, dar mesajul de acolo vorbeste
    -- despre tabele, nu despre ce vede omul.
    if exists (select 1 from public.admin_users a where a.user_id = v_user) then
      raise exception 'Contul tau este deja asociat unui restaurant.' using errcode = 'P0001';
    end if;

    if exists (select 1 from public.super_admin_users s where s.user_id = v_user) then
      raise exception 'Contul tau face deja parte din echipa TableX.' using errcode = 'P0001';
    end if;

    insert into public.super_admin_users (user_id, rol, nume, email)
    values (
      v_user,
      v_echipa.rol,
      (select u.raw_user_meta_data ->> 'nume' from auth.users u where u.id = v_user),
      v_email
    );

    update public.super_admin_invitations
       set status = 'acceptata', acceptata_la = now()
     where id = v_echipa.id;

    -- Fara restaurant: apelantul deosebeste cazul dupa `tip`, nu dupa null.
    return null;
  end if;

  -- ── Invitatie intr-un restaurant (comportamentul dinainte) ──────────────
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

-- ── Ultimul super admin deplin nu se poate scoate singur din echipa ────────
-- Fara garda asta, un `activ = false` pe singurul cont deplin ar fi inchis
-- panoul echipei pentru toata lumea, iar reintrarea ar fi cerut SQL — exact
-- situatia din care incearca sa iasa migratia asta.
create or replace function public.protejeaza_ultimul_super_admin()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if tg_op = 'UPDATE'
     and old.rol = 'super_admin' and old.activ
     and (new.rol <> 'super_admin' or not new.activ)
     and not exists (
       select 1 from public.super_admin_users s
        where s.id <> old.id and s.rol = 'super_admin' and s.activ
     )
  then
    raise exception 'Nu poti scoate ultimul super admin deplin din echipa.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE'
     and old.rol = 'super_admin' and old.activ
     and not exists (
       select 1 from public.super_admin_users s
        where s.id <> old.id and s.rol = 'super_admin' and s.activ
     )
  then
    raise exception 'Nu poti sterge ultimul super admin deplin din echipa.'
      using errcode = 'P0001';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.protejeaza_ultimul_super_admin() from public;

drop trigger if exists trg_ultimul_super_admin on public.super_admin_users;
create trigger trg_ultimul_super_admin
  before update or delete on public.super_admin_users
  for each row execute function public.protejeaza_ultimul_super_admin();
