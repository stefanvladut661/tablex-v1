-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 15. Doua corectii la fluxul de floor plan
--
-- 1. Acelasi defect ca in migratia 12, REINTRODUS de mine in migratia 14: un
--    CASE care produce text intr-o coloana de tip enum. Rezultat: 42804 la
--    orice schimbare de status, adica intreaga coada a echipei era blocata.
--    Regula era deja notata in migratia 12 — valorile de enum calculate se pun
--    in variabile tipizate. Aici e aplicata, nu doar scrisa.
--
-- 2. Politica "floor_plan_requests_personal" (migratia 05) e cea operationala,
--    deci permite restaurantului sa modifice ORICE coloana a cererii lui,
--    inclusiv status. Verificat: managerul isi putea trece singur cererea pe
--    "published". Statusul din coada aparține echipei TableX, deci se blocheaza
--    pe acelasi model ca la coloanele privilegiate din migratia 13. La fel si
--    ai_rezultat, care e instrument intern (§14).
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.notifica_status_floor_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mesaj   text;
  v_urgenta public.notificare_urgenta;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  if new.status = 'in_progress' then
    v_mesaj := 'Echipa TableX lucreaza la planul zonei „' || new.zone_nume || '”.';
  elsif new.status = 'published' then
    v_mesaj := 'Planul zonei „' || new.zone_nume || '” a fost publicat si e vizibil in Harta salii.';
  elsif new.status = 'respins' then
    v_mesaj := 'Cererea pentru zona „' || new.zone_nume || '” a fost respinsa. Te contactam pentru detalii.';
  else
    v_mesaj := 'Statusul cererii pentru zona „' || new.zone_nume || '” s-a schimbat.';
  end if;

  -- Publicarea e o veste buna (informativ); restul cer atentie.
  if new.status = 'published' then
    v_urgenta := 'albastru';
  else
    v_urgenta := 'galben';
  end if;

  insert into public.notificari
    (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
  values (
    new.restaurant_id, 'admin', 'floor_plan_status', v_urgenta,
    'Plan 2D: ' || new.zone_nume, v_mesaj
  );

  return null;
end;
$$;

revoke execute on function public.notifica_status_floor_plan() from public;

-- ── Statusul cererii aparține echipei ────────────────────────────────────
create or replace function public.protejeaza_status_cerere_fp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'Statusul cererii se schimba doar de echipa TableX.'
      using errcode = '42501';
  end if;

  -- Rezultatul generarii AI e instrument intern (§14): nu se scrie din client.
  if new.ai_rezultat is distinct from old.ai_rezultat
     or new.ai_generat_la is distinct from old.ai_generat_la
     or new.procesat_de is distinct from old.procesat_de
     or new.assigned_to is distinct from old.assigned_to then
    raise exception 'Aceste campuri sunt gestionate de echipa TableX.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger trg_fp_requests_status
  before update on public.floor_plan_requests
  for each row execute function public.protejeaza_status_cerere_fp();

revoke execute on function public.protejeaza_status_cerere_fp() from public;
