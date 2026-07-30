-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 14. Notificari pentru fluxul de floor plan (§41)
--
-- Cererea de plan 2D e singurul flux in care cele doua parti se anunta
-- reciproc: restaurantul trimite o cerere si echipa TableX trebuie sa o vada
-- in coada; echipa schimba statusul si restaurantul trebuie sa afle.
--
-- Ambele notificari se scriu din trigger, ca peste tot: tabela notificari nu
-- are politica de INSERT, deci nicio cale din client nu le poate fabrica.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.notifica_cerere_floor_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nume text;
begin
  select r.nume into v_nume from public.restaurants r where r.id = new.restaurant_id;

  -- destinatie 'super_admin' => restaurant_id rămâne NULL (vezi constrangerea
  -- notificari_are_destinatar): notificarea aparține echipei, nu restaurantului.
  insert into public.notificari (destinatie, tip, urgenta, titlu, mesaj)
  values (
    'super_admin', 'floor_plan_request', 'galben',
    'Cerere de plan 2D: ' || coalesce(v_nume, 'restaurant'),
    'Zona „' || new.zone_nume || '”' ||
      case when new.descriere is null then '' else ' · ' || left(new.descriere, 120) end
  );

  return null;
end;
$$;

create trigger trg_notifica_cerere_fp
  after insert on public.floor_plan_requests
  for each row execute function public.notifica_cerere_floor_plan();

revoke execute on function public.notifica_cerere_floor_plan() from public;

create or replace function public.notifica_status_floor_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mesaj text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  v_mesaj := case new.status
    when 'in_progress' then 'Echipa TableX lucreaza la planul zonei „' || new.zone_nume || '”.'
    when 'published'   then 'Planul zonei „' || new.zone_nume || '” a fost publicat si e vizibil in Harta salii.'
    when 'respins'     then 'Cererea pentru zona „' || new.zone_nume || '” a fost respinsa. Te contactam pentru detalii.'
    else                    'Statusul cererii pentru zona „' || new.zone_nume || '” s-a schimbat.'
  end;

  insert into public.notificari
    (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
  values (
    new.restaurant_id, 'admin', 'floor_plan_status',
    case when new.status = 'published' then 'albastru' else 'galben' end,
    'Plan 2D: ' || new.zone_nume,
    v_mesaj
  );

  return null;
end;
$$;

create trigger trg_notifica_status_fp
  after update of status on public.floor_plan_requests
  for each row execute function public.notifica_status_floor_plan();

revoke execute on function public.notifica_status_floor_plan() from public;
