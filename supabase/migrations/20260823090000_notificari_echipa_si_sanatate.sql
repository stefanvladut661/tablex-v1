-- ═══════════════════════════════════════════════════════════════════════════
-- Clopotelul echipei, aliniat la §9.1 + starea serviciilor externe (§38.3)
--
-- §9.1 da culorile exacte ale notificarilor interne:
--   🔴 rosu    — solicitare noua de Floor Plan nepreluata;
--   🟡 galben  — un restaurant a ramas fara credite WhatsApp;
--   🔵 albastru — tichet nou de suport (migratia de ticketing o face deja).
--
-- Doua corectii aici:
--   1. Cererea de floor plan se scria cu urgenta 'galben' — spec-ul cere rosu.
--   2. Epuizarea creditelor nu anunta pe nimeni din echipa: consuma_credit
--      doar consemna mesajul esuat in jurnalul restaurantului.
--
-- La epuizare, notificarea poarta restaurant_id (politica de citire a
-- restaurantului filtreaza destinatie='admin', deci nu o vede) — pe el se
-- face si deduplicarea: cata vreme exista o notificare NECITITA de epuizare
-- pentru acelasi restaurant, nu se adauga alta. Altfel fiecare mesaj esuat
-- ar suna clopotelul inca o data.
--
-- Partea a doua: §38.3 cere un Server Health Indicator cu timestamp-ul
-- ultimului check. Pentru Supabase, verificarea e REALA: RPC-ul de mai jos
-- ruleaza in baza, deci simplul fapt ca a raspuns e dovada. Stripe si Meta
-- raman marcate 'degradat'/simulat — §14 interzice integrarea lor reala, iar
-- un punct verde fals ar fi o minciuna in interfata echipei.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Cererea de plan e rosie in clopotelul echipei ───────────────────────
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

  -- restaurant_id ramane NULL: notificarea apartine echipei, iar cererea isi
  -- are propriul badge pe coada de solicitari.
  insert into public.notificari (destinatie, tip, urgenta, titlu, mesaj)
  values (
    'super_admin', 'floor_plan_request', 'rosu',
    'Cerere de plan 2D: ' || coalesce(v_nume, 'restaurant'),
    'Zona „' || new.zone_nume || '”' ||
      case when new.descriere is null then '' else ' · ' || left(new.descriere, 120) end
  );

  return null;
end;
$$;

-- ── 2. Epuizarea creditelor anunta echipa ──────────────────────────────────
-- Semnatura nu se schimba: create or replace pastreaza grant-urile existente.
create or replace function public.consuma_credit(
  p_telefon text,
  p_sablon  text,
  p_continut text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_sold       integer;
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  if public.credite_whatsapp(v_restaurant) < 1 then
    insert into public.whatsapp_mesaje (restaurant_id, telefon, sablon, continut, status, eroare)
    values (v_restaurant, p_telefon, p_sablon, p_continut, 'esuat', 'Fara credite disponibile');

    perform public.anunta_credite_epuizate(v_restaurant);
    return false;
  end if;

  insert into public.whatsapp_tranzactii (restaurant_id, tip, credite, descriere)
  values (v_restaurant, 'consum', -1, format('Mesaj: %s', p_sablon));

  insert into public.whatsapp_mesaje (restaurant_id, telefon, sablon, continut, status)
  values (v_restaurant, p_telefon, p_sablon, p_continut, 'trimis');

  -- Ultimul credit tocmai s-a dus: echipa afla acum, nu la primul mesaj ratat.
  v_sold := public.credite_whatsapp(v_restaurant);
  if v_sold = 0 then
    perform public.anunta_credite_epuizate(v_restaurant);
  end if;

  return true;
end;
$$;

create or replace function public.anunta_credite_epuizate(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nume text;
begin
  -- O singura notificare necitita per restaurant: clopotelul semnaleaza
  -- starea, nu fiecare esec in parte.
  if exists (
    select 1 from public.notificari n
    where n.destinatie = 'super_admin'
      and n.tip = 'credite_epuizate'
      and n.restaurant_id = p_restaurant_id
      and n.citita_la is null
  ) then
    return;
  end if;

  select r.nume into v_nume from public.restaurants r where r.id = p_restaurant_id;

  insert into public.notificari (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
  values (
    p_restaurant_id, 'super_admin', 'credite_epuizate', 'galben',
    'Fara credite WhatsApp: ' || coalesce(v_nume, 'restaurant'),
    'Mesajele automate nu se mai trimit pana la reincarcare.'
  );
end;
$$;

-- Functie interna, apelata doar din consuma_credit (care e security definer).
revoke execute on function public.anunta_credite_epuizate(uuid) from public;
revoke execute on function public.anunta_credite_epuizate(uuid) from authenticated;

-- ── 3. Starea serviciilor externe (§38.3) ──────────────────────────────────
create table public.statusuri_servicii (
  serviciu     public.serviciu_extern primary key,
  status       public.serviciu_status not null default 'ok',
  detaliu      text,
  verificat_la timestamptz not null default now()
);

insert into public.statusuri_servicii (serviciu, status, detaliu) values
  ('supabase',      'ok',       'Conexiunea la baza de date'),
  ('stripe',        'degradat', 'Simulat — fara integrare reala in v1 (§14)'),
  ('meta_whatsapp', 'degradat', 'Simulat — fara integrare reala in v1 (§14)');

alter table public.statusuri_servicii enable row level security;

-- Toata echipa vede semaforul; nimeni nu-l scrie direct — singura cale e
-- RPC-ul de mai jos.
create policy statusuri_servicii_citire on public.statusuri_servicii
  for select to authenticated
  using (public.is_super_admin());

create or replace function public.verifica_sanatate_servicii()
returns setof public.statusuri_servicii
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Doar echipa TableX vede starea serviciilor.' using errcode = '42501';
  end if;

  -- Daca randul asta s-a actualizat, baza a raspuns: verificarea Supabase e
  -- chiar apelul de fata, nu un status scris de altcineva.
  update public.statusuri_servicii
     set verificat_la = now(), status = 'ok'
   where serviciu = 'supabase';

  return query
    select * from public.statusuri_servicii
    order by serviciu;
end;
$$;

revoke execute on function public.verifica_sanatate_servicii() from public;
revoke execute on function public.verifica_sanatate_servicii() from anon;
grant execute on function public.verifica_sanatate_servicii() to authenticated;
