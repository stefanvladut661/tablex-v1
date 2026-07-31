-- ═══════════════════════════════════════════════════════════════════════════
-- Istoricul versiunilor de plan (§40) — ultima tabela fara utilizare
--
-- `floor_plan_projects` a fost gandita ca un arbore de proiecte in stil Google
-- Drive: foldere, fisiere, draft / published / arhivat. Editorul a iesit altfel
-- — se lucreaza direct pe `floor_plan_layers`, cu blocaj optimist pe `versiune`
-- — asa ca tabela a ramas goala.
--
-- Ce lipsea cu adevarat nu era arborele, ci CONSECINTA lui: azi, o publicare
-- gresita e definitiva. Echipa deseneaza planul unui client, il publica, iar
-- daca sterge din greseala jumatate de sala si salveaza, versiunea buna nu mai
-- exista nicaieri. Blocajul optimist apara de suprascrierea intre doi oameni,
-- nu de propria greseala.
--
-- Deci: pastram tabela, dar doar in forma de care e nevoie — un fisier per
-- versiune publicata, fara foldere. Arborele ramane posibil (coloanele exista),
-- doar ca nu il inventam inainte sa aiba cine sa-l foloseasca.
--
-- Instantaneul se ia intr-un TRIGGER, nu in serviciul din frontend: exista mai
-- multe cai care scriu stratul, iar un istoric cu goluri e mai rau decat lipsa
-- lui — te-ai baza pe el exact cand nu e acolo.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.arhiveaza_versiune_plan()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Ne intereseaza doar structura publicata: layerele nepublicate sunt ciorne,
  -- iar layer2 (mesele) traieste in `tables`, cu propriile garzi.
  if new.tip <> 'layer1' or not new.publicat then
    return null;
  end if;

  -- Salvarile care nu schimba structura (doar vizibilitatea, de pilda) nu
  -- merita o versiune: istoricul ar deveni zgomot si versiunea buna s-ar
  -- pierde intre zeci de randuri identice.
  if tg_op = 'UPDATE' and old.publicat
     and old.continut is not distinct from new.continut then
    return null;
  end if;

  -- Indexul unic din migratia floor_plan cere cel mult o versiune 'published'
  -- per zona, deci precedenta trebuie arhivata INAINTE de inserare.
  update public.floor_plan_projects
     set status = 'arhivat'
   where zone_id = new.zone_id and status = 'published';

  insert into public.floor_plan_projects (
    restaurant_id, zone_id, tip, nume, status, continut, versiune,
    publicat_de, publicat_la, created_by
  )
  values (
    new.restaurant_id,
    new.zone_id,
    'fisier',
    'Versiunea ' || new.versiune,
    'published',
    jsonb_build_object('layer1', new.continut),
    new.versiune,
    auth.uid(),
    now(),
    auth.uid()
  );

  return null;
end;
$$;

comment on function public.arhiveaza_versiune_plan() is
  'Fiecare publicare a structurii lasa un instantaneu in floor_plan_projects. '
  'In trigger, nu in serviciu: un istoric cu goluri e mai rau decat lipsa lui.';

revoke execute on function public.arhiveaza_versiune_plan() from public;

drop trigger if exists trg_istoric_versiuni_plan on public.floor_plan_layers;
create trigger trg_istoric_versiuni_plan
  after insert or update of continut, publicat on public.floor_plan_layers
  for each row execute function public.arhiveaza_versiune_plan();

-- ── Revenirea la o versiune anterioara ─────────────────────────────────────
-- Nu sterge nimic si nu „intoarce timpul": scrie continutul vechi ca versiune
-- NOUA. Istoricul ramane adaugare-numai, deci si o revenire gresita se poate
-- reveni. (Scrierea declanseaza acelasi trigger, care ii face instantaneu.)
create or replace function public.restaureaza_versiune_plan(p_project_id uuid)
returns integer
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_proiect public.floor_plan_projects;
  v_versiune integer;
begin
  if not public.is_super_admin() then
    raise exception 'Doar echipa TableX poate reveni la o versiune de plan.'
      using errcode = '42501';
  end if;

  select * into v_proiect
    from public.floor_plan_projects
   where id = p_project_id and tip = 'fisier';

  if not found then
    raise exception 'Versiunea nu exista.' using errcode = 'P0002';
  end if;

  if v_proiect.zone_id is null then
    raise exception 'Versiunea nu mai are zona: sala a fost stearsa intre timp.'
      using errcode = 'P0001';
  end if;

  update public.floor_plan_layers
     set continut = v_proiect.continut -> 'layer1',
         versiune = versiune + 1,
         publicat = true
   where zone_id = v_proiect.zone_id and tip = 'layer1'
  returning versiune into v_versiune;

  if v_versiune is null then
    raise exception 'Zona nu mai are strat de structura.' using errcode = 'P0002';
  end if;

  return v_versiune;
end;
$$;

comment on function public.restaureaza_versiune_plan(uuid) is
  'Scrie o versiune veche drept versiune noua. Istoricul ramane adaugare-numai.';

revoke execute on function public.restaureaza_versiune_plan(uuid) from public;
grant execute on function public.restaureaza_versiune_plan(uuid) to authenticated;
