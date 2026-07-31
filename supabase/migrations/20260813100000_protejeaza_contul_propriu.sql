-- ═══════════════════════════════════════════════════════════════════════════
-- Ospatarul nu-si mai poate da singur rol de manager (§20, §31)
--
-- Gasita in timp ce cablam preferintele personale din List View (§26.2), adica
-- tocmai functionalitatea pentru care fusese scrisa politica:
--
--   create policy admin_users_actualizare_propriu on public.admin_users
--     for update to authenticated
--     using (user_id = auth.uid()) with check (user_id = auth.uid());
--
-- Comentariul de deasupra ei spune „preferintele personale
-- (list_view_columns_config, nume)". Intentia era ingusta, dreptul acordat era
-- pe TOT randul. Un ospatar putea rula
--
--   update admin_users set rol = 'manager' where user_id = auth.uid();
--
-- si primea instantaneu Setarile, Echipa, stergerea GDPR a clientilor,
-- contopirea fiselor si editarea planului. Escaladare de privilegii intr-o
-- singura linie, fara nicio eroare pe drum.
--
-- RLS nu stie sa spuna „poti actualiza randul asta, dar numai coloanele
-- astea". Un trigger stie.
--
-- A doua garda, din aceeasi familie cu cea a ultimului super admin (migratia
-- 24): un restaurant nu poate ramane FARA manager. Fara ea, singurul manager
-- se putea retrograda din greseala, iar contul devenea nefolosibil — Setarile
-- si Echipa ar fi fost inaccesibile pentru toata lumea, inclusiv pentru cel
-- care ar fi trebuit sa repare.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.protejeaza_contul_propriu()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Managerul restaurantului si echipa TableX au voie sa schimbe rolul si
  -- accesul altora — pentru asta exista politicile lor. Garda de aici il
  -- priveste pe cel care isi editeaza PROPRIUL rand fara acele drepturi.
  if not (public.is_manager() or public.is_super_admin()) then
    if new.rol is distinct from old.rol
       or new.activ is distinct from old.activ
       or new.restaurant_id is distinct from old.restaurant_id
       or new.user_id is distinct from old.user_id
       or new.email is distinct from old.email
    then
      raise exception
        'Doar managerul poate schimba rolul, accesul sau restaurantul unui cont.'
        using errcode = '42501';
    end if;
  end if;

  -- Ultimul manager activ nu poate fi retrogradat sau dezactivat — nici de el
  -- insusi, nici de echipa. Restaurantul ar ramane fara nimeni care sa poata
  -- intra in Setari sau in Echipa.
  if old.rol = 'manager' and old.activ
     and (new.rol is distinct from 'manager' or not new.activ)
     and not exists (
       select 1 from public.admin_users a
        where a.restaurant_id = old.restaurant_id
          and a.id <> old.id
          and a.rol = 'manager'
          and a.activ
     )
  then
    raise exception 'Restaurantul ar ramane fara manager. Fa intai alt cont manager.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.protejeaza_contul_propriu() is
  'Politica de update pe randul propriu exista pentru preferinte personale; '
  'triggerul o ingusteaza la ele, ca nimeni sa nu-si acorde singur rol de manager.';

revoke execute on function public.protejeaza_contul_propriu() from public;

drop trigger if exists trg_admin_users_protejeaza_contul on public.admin_users;
create trigger trg_admin_users_protejeaza_contul
  before update on public.admin_users
  for each row execute function public.protejeaza_contul_propriu();
