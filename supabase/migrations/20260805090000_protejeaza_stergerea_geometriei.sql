-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 18. Stergerea unei mese sau zone nu are voie sa rupa rezervari
--
-- PROBLEMA, gasita la construirea editorului de floor plan:
-- cheile straine sunt permisive cu buna stiinta —
--   table_allocations.table_id  ON DELETE CASCADE
--   reservations.table_id       ON DELETE SET NULL
--   tables.zone_id              ON DELETE CASCADE
-- Deci un singur DELETE pe o masa sterge alocarile ei si DESPRINDE tacit
-- rezervarile care o foloseau: raman in baza, dar fara masa. Personalul ar
-- vedea rezervarea in lista si nimic pe harta, fara niciun mesaj de eroare.
-- Stergerea unei zone face acelasi lucru, inmultit cu numarul de mese.
--
-- Pana acum nu conta: nimic din interfata nu stergea geometrie. Editorul
-- schimba asta — echipa TableX va apasa "sterge" pe mese reale, uneori pe
-- restaurante care au deja rezervari in viitor.
--
-- Garda sta in BAZA, nu in interfata, din acelasi motiv ca la coloanele
-- privilegiate (migratia 13): interfata poate fi ocolita, API-ul e public.
--
-- Ce NU face: nu blocheaza stergerea unei mese fara rezervari viitoare, si nu
-- blocheaza dezactivarea (activa = false). Dezactivarea e calea corecta pentru
-- o masa scoasa din uz care are istoric — pastreaza trecutul si o scoate din
-- disponibilitate.
-- ═══════════════════════════════════════════════════════════════════════

-- Statusurile care ocupa efectiv masa sunt aceleasi pe care le tine
-- table_allocations si le deseneaza calendarul: pending, confirmata, sosita.
create or replace function public.protejeaza_stergerea_mesei()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cate integer;
begin
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

create trigger trg_tables_protejeaza_stergerea
  before delete on public.tables
  for each row execute function public.protejeaza_stergerea_mesei();

-- Zona: acelasi rationament, dar numaram pe toate mesele ei. Fara asta,
-- stergerea zonei ar ocoli garda de mai sus — CASCADE pe tables NU declanseaza
-- trigger-ul BEFORE DELETE al fiecarei mese in toate caile de stergere pe care
-- ne-am putea baza, deci verificam explicit aici.
create or replace function public.protejeaza_stergerea_zonei()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cate integer;
begin
  select count(*) into v_cate
  from public.reservations r
  where r.zone_id = old.id
    and r.status in ('pending', 'confirmata', 'sosita')
    and r.data_ora >= now();

  if v_cate > 0 then
    raise exception
      'Zona "%" are % rezervari viitoare. Dezactiveaz-o in loc sa o stergi.',
      old.nume, v_cate
      using errcode = 'P0002';
  end if;

  return old;
end;
$$;

create trigger trg_zones_protejeaza_stergerea
  before delete on public.zones
  for each row execute function public.protejeaza_stergerea_zonei();

-- Drepturi: lectia migratiilor 07 si 17 — "revoke from public" NU sterge
-- grantul explicit pe care Supabase il da lui anon/authenticated din default
-- privileges. Le revocam nominal.
revoke execute on function public.protejeaza_stergerea_mesei()
  from public, anon, authenticated, service_role;
revoke execute on function public.protejeaza_stergerea_zonei()
  from public, anon, authenticated, service_role;
