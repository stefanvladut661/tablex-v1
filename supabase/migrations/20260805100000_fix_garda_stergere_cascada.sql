-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 19. Corectie: garda din migratia 18 bloca stergerea restaurantului
--
-- ACEEASI CLASA DE DEFECT CA IN MIGRATIA 08, reintrodusa de mine in 18.
-- Atunci era trigger-ul protejeaza_camp_telefon, care refuza randul 'telefon'
-- indiferent de context si facea IMPOSIBILA stergerea unui restaurant. Acum:
--
--   delete from restaurants  →  cascada catre zones  →  cascada catre tables
--
-- iar garda "are rezervari viitoare" se aprindea in mijlocul cascadei si anula
-- toata tranzactia. Verificat inainte de corectie: stergerea restaurantului de
-- test esua cu P0002 din protejeaza_stergerea_zonei.
--
-- Consecinta ar fi fost exact cea din 08: blocarea stergerii datelor la cerere
-- (§22.1) si a scoaterii unui cont (§43) — adica o obligatie legala, ratata
-- dintr-o protectie de comoditate.
--
-- SOLUTIA, la fel ca in 08: garda se aplica doar cat timp PARINTELE exista.
-- Cascada sterge intai randul parinte, deci absenta lui e semnalul sigur ca
-- stergerea e intentionata la nivelul de deasupra, unde decizia a fost deja
-- luata.
--
-- A doua corectie, gasita citind din nou: garda pe zona numara doar
-- reservations.zone_id. O rezervare poate avea insa table_id completat si
-- zone_id gol, caz in care stergerea zonei i-ar fi luat masa de sub picioare
-- fara sa fie observata. Acum numaram si rezervarile care tin de mesele zonei.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.protejeaza_stergerea_mesei()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cate integer;
begin
  -- Zona nu mai exista => suntem intr-o cascada pornita mai sus, unde garda de
  -- pe zona (sau stergerea restaurantului) a decis deja. Nu ne opunem.
  if not exists (select 1 from public.zones z where z.id = old.zone_id) then
    return old;
  end if;

  select count(*) into v_cate
  from public.reservations r
  where r.table_id = old.id
    and r.status in ('pending', 'confirmata', 'sosita')
    and r.data_ora >= now();

  if v_cate > 0 then
    raise exception
      'Masa % are % rezervari viitoare. Dezactiveaz-o in loc sa o stergi, ca sa nu ramana rezervari fara masa.',
      old.numar_masa, v_cate
      using errcode = 'P0002';
  end if;

  return old;
end;
$$;

create or replace function public.protejeaza_stergerea_zonei()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cate integer;
begin
  -- Restaurantul nu mai exista => stergere la cerere / scoatere de cont.
  -- Aceea NU are voie sa fie blocata (§22.1, §43).
  if not exists (select 1 from public.restaurants r where r.id = old.restaurant_id) then
    return old;
  end if;

  select count(*) into v_cate
  from public.reservations r
  where r.status in ('pending', 'confirmata', 'sosita')
    and r.data_ora >= now()
    and (
      r.zone_id = old.id
      -- Si rezervarile legate doar de masa: zone_id poate fi gol.
      or r.table_id in (select t.id from public.tables t where t.zone_id = old.id)
    );

  if v_cate > 0 then
    raise exception
      'Zona "%" are % rezervari viitoare. Dezactiveaz-o in loc sa o stergi.',
      old.nume, v_cate
      using errcode = 'P0002';
  end if;

  return old;
end;
$$;

revoke execute on function public.protejeaza_stergerea_mesei()
  from public, anon, authenticated, service_role;
revoke execute on function public.protejeaza_stergerea_zonei()
  from public, anon, authenticated, service_role;
