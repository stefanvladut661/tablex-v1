-- ═══════════════════════════════════════════════════════════════════════════
-- Unirea meselor pentru grupuri (§28.6, §15.4)
--
-- `tables.grup_unire_id` exista din migratia floor_plan, iar
-- `sincronizeaza_alocari_rezervare` il respecta de la inceput: o rezervare pusa
-- pe o masa dintr-un grup blocheaza TOATE mesele grupului. Regula era deci
-- impusa corect in baza — dar nimeni nu putea forma un grup. Coloana ramanea
-- mereu null, si odata cu ea si comportamentul.
--
-- §15.4 e categoric: unirea e 100% MANUALA. Sistemul nu sugereaza combinatii,
-- nu cauta singur „doua mese de 4 pentru 7 persoane". Omul le alege.
--
-- Capcana pe care o rezolva RPC-ul, si care nu se vede din afara:
-- unirea NU reruleaza triggerul pentru rezervarile care exista deja. Daca doua
-- mese sunt unite dupa ce fiecare are cate o rezervare, alocarile vechi raman
-- fiecare pe masa ei, iar grupul e o minciuna pana la urmatoarea salvare a
-- fiecarei rezervari. De aceea functia REFACE alocarile pentru rezervarile
-- active de pe mesele alese — si tocmai de aceea trebuie sa refuze din start
-- unirea unor mese ale caror rezervari se suprapun in timp: nu poti lipi doua
-- mese ocupate simultan de oameni diferiti.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.uneste_mese(p_table_ids uuid[])
returns uuid
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_zone       uuid;
  v_grup       uuid := gen_random_uuid();
  v_cate       integer;
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  -- Aceleasi doua conditii ca pentru orice modificare de plan: rolul si planul.
  -- Politica RLS de pe `tables` le cere oricum; le verificam explicit ca omul
  -- sa primeasca un mesaj, nu zero randuri modificate.
  if not public.is_manager() then
    raise exception 'Doar managerul poate uni mese.' using errcode = '42501';
  end if;

  if not public.are_floor_plan() then
    raise exception 'Unirea meselor face parte din planul Pro Floor.' using errcode = '42501';
  end if;

  if p_table_ids is null or array_length(p_table_ids, 1) < 2 then
    raise exception 'Alege cel putin doua mese.' using errcode = 'P0001';
  end if;

  -- Toate mesele: ale restaurantului curent, in ACEEASI zona si inca negrupate.
  -- Un grup peste doua zone n-ar avea sens fizic — mesele nu se pot lipi daca
  -- sunt in sali diferite.
  select count(*)
    into v_cate
    from public.tables t
   where t.id = any(p_table_ids)
     and t.restaurant_id = v_restaurant;

  -- Zona de referinta e a primei mese din lista. (`min()` nu exista pentru
  -- uuid, si oricum n-ar avea sens: nu cautam un minim, ci un reper.)
  select t.zone_id into v_zone
    from public.tables t
   where t.id = p_table_ids[1] and t.restaurant_id = v_restaurant;

  if v_cate <> array_length(p_table_ids, 1) then
    raise exception 'Una dintre mese nu exista in acest restaurant.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.tables t
     where t.id = any(p_table_ids) and t.zone_id is distinct from v_zone
  ) then
    raise exception 'Mesele unite trebuie sa fie in aceeasi zona.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.tables t
     where t.id = any(p_table_ids) and t.grup_unire_id is not null
  ) then
    raise exception 'Una dintre mese face deja parte dintr-un grup. Desfa-l intai.'
      using errcode = 'P0001';
  end if;

  -- Doua rezervari diferite care se suprapun in timp pe mesele alese: dupa
  -- unire ar trebui sa ocupe amandoua tot grupul, ceea ce e imposibil.
  if exists (
    select 1
      from public.table_allocations a
      join public.table_allocations b
        on b.reservation_id is distinct from a.reservation_id
       and b.interval_blocat && a.interval_blocat
     where a.table_id = any(p_table_ids)
       and b.table_id = any(p_table_ids)
  ) then
    raise exception
      'Mesele au rezervari care se suprapun in timp. Muta una dintre ele inainte de a le uni.'
      using errcode = 'P0001';
  end if;

  update public.tables
     set grup_unire_id = v_grup
   where id = any(p_table_ids) and restaurant_id = v_restaurant;

  -- Alocarile rezervarilor deja existente se intind peste tot grupul. Fara
  -- randul asta, grupul ar fi corect doar pentru rezervarile viitoare.
  insert into public.table_allocations (restaurant_id, table_id, reservation_id, interval_blocat)
  select r.restaurant_id, t.id, r.id, tstzrange(r.data_ora, r.blocat_pana_la, '[)')
    from public.reservations r
    join public.tables t on t.grup_unire_id = v_grup
   where r.table_id = any(p_table_ids)
     and r.status in ('pending', 'confirmata', 'sosita')
     and not exists (
       select 1 from public.table_allocations a
        where a.reservation_id = r.id and a.table_id = t.id
     );

  return v_grup;
end;
$$;

comment on function public.uneste_mese(uuid[]) is
  'Uneste mese pentru un grup mare (§28.6). Intinde si alocarile rezervarilor '
  'existente peste tot grupul: altfel unirea ar fi valabila doar de maine.';

revoke execute on function public.uneste_mese(uuid[]) from public;
grant execute on function public.uneste_mese(uuid[]) to authenticated;

-- ── Desfacerea grupului ────────────────────────────────────────────────────
create or replace function public.desparte_grup(p_grup_id uuid)
returns integer
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_cate       integer;
begin
  if not public.is_manager() then
    raise exception 'Doar managerul poate desface un grup de mese.' using errcode = '42501';
  end if;

  -- Intai alocarile „imprumutate": cele puse pe o masa care nu e masa proprie a
  -- rezervarii. Daca le-am lasa, mesele ar ramane blocate dupa desfacere, fara
  -- ca nimic din interfata sa arate de ce.
  delete from public.table_allocations a
   using public.reservations r, public.tables t
   where a.reservation_id = r.id
     and a.table_id = t.id
     and t.grup_unire_id = p_grup_id
     and t.restaurant_id = v_restaurant
     and a.table_id is distinct from r.table_id;

  update public.tables
     set grup_unire_id = null
   where grup_unire_id = p_grup_id and restaurant_id = v_restaurant;

  get diagnostics v_cate = row_count;

  if v_cate = 0 then
    raise exception 'Grupul nu exista in acest restaurant.' using errcode = 'P0002';
  end if;

  return v_cate;
end;
$$;

comment on function public.desparte_grup(uuid) is
  'Desface un grup si elibereaza alocarile imprumutate de la mesele vecine.';

revoke execute on function public.desparte_grup(uuid) from public;
grant execute on function public.desparte_grup(uuid) to authenticated;
