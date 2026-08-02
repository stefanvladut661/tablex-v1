-- ═══════════════════════════════════════════════════════════════════════════
-- Zoom-ul hartii: fixat de echipa, nu de restaurant
--
-- DECIZIA: pana acum, oricine putea da zoom pe harta salii — Adminul,
-- ospatarul de pe tableta, vizitatorul widgetului. Suna a libertate, dar in
-- practica strica exact ce trebuie sa fie stabil: doi ospatari care se uita
-- la aceeasi sala vedeau incadraturi diferite, iar clientul care rezerva
-- putea ajunge la un plan pe care nu-l mai recunostea.
--
-- De-acum incadrarea e o proprietate A PLANULUI, nu a privitorului: echipa
-- TableX o stabileste odata cu desenul, in Canvas Builder, si toata lumea
-- vede exact acelasi lucru. Zoom-ul interactiv ramane doar in editorul
-- echipei, unde e unealta de lucru.
--
-- Limitele (0.4–4) sunt cele din useZoomPan; CHECK-ul le tine sincronizate,
-- ca o valoare scrisa direct prin REST sa nu produca o harta nefolosibila.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.zones
  add column if not exists zoom_implicit numeric(4,2) not null default 1
    check (zoom_implicit >= 0.4 and zoom_implicit <= 4);

comment on column public.zones.zoom_implicit is
  'Incadrarea cu care se afiseaza planul pentru Admin si pentru public. '
  'Se seteaza DOAR de echipa TableX, din Canvas Builder (zones_super_admin). '
  'Restul aplicatiei o citeste, nu o schimba.';

-- Vederea publica a zonelor duce si ea incadrarea: widgetul trebuie sa arate
-- planul exact cum l-a asezat echipa.
--
-- Coloana noua se adauga la SFARSIT si in aceeasi ordine ca in vederea
-- existenta: `create or replace view` refuza redenumirea sau reordonarea
-- coloanelor deja publicate.
create or replace view public.zone_publice as
  select z.id, z.restaurant_id, z.nume, z.ordine_afisare,
         z.canvas_latime, z.canvas_inaltime, z.grid_marime,
         z.zoom_implicit
    from public.zones z
    join public.restaurants r on r.id = z.restaurant_id
   where z.activa and r.status = 'activ';

grant select on public.zone_publice to anon, authenticated;

-- ── Cine poate SCHIMBA incadrarea ─────────────────────────────────────────
-- Politica zones_scriere_manager da managerului acces la TOATE coloanele
-- zonei (o politica RLS nu poate restrange coloane), deci fara garda de mai
-- jos si-ar putea rescrie singur incadrarea dintr-un apel REST — exact ce
-- tocmai am scos din interfata. Aceeasi solutie ca la coloanele privilegiate
-- ale restaurantului (migratia 13): un trigger.
create or replace function public.protejeaza_zoom_zona()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.zoom_implicit is distinct from old.zoom_implicit
     and not public.is_echipa_studio() then
    raise exception 'Incadrarea planului se schimba doar de echipa TableX.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_zones_zoom_implicit
  before update on public.zones
  for each row execute function public.protejeaza_zoom_zona();

revoke execute on function public.protejeaza_zoom_zona() from public, anon, authenticated;
