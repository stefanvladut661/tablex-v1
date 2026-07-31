-- ═══════════════════════════════════════════════════════════════════════════
-- Mesele libere pentru o rezervare care EXISTA deja (§26.3, §8.2)
--
-- `disponibilitate_mese` raspunde la „ce mese sunt libere la ora X" — buna
-- pentru o rezervare NOUA. Pentru re-alocarea uneia existente da raspunsul
-- gresit in ambele sensuri:
--
--   - masa pe care sta chiar rezervarea pe care o mut apare OCUPATA (de ea
--     insasi), deci n-o poti alege ca sa schimbi doar ora;
--   - iar daca schimb si ora, propriul interval vechi blocheaza mese care in
--     realitate se elibereaza exact prin mutare.
--
-- Diferenta e un singur rand — excluderea alocarilor rezervarii curente — dar
-- fara ea dropdown-ul de re-alocare ar minti la fiecare deschidere.
--
-- SECURITY INVOKER, spre deosebire de sora ei: aceasta e doar pentru personal,
-- deci politicile RLS pe `reservations`, `table_allocations` si `tables` fac
-- singure izolarea pe restaurant. Nu e nevoie sa primeasca `restaurant_id` din
-- afara si nici sa aiba incredere in el.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.mese_libere_pentru_rezervare(
  p_reservation_id uuid,
  p_start          timestamptz default null,
  p_durata_minute  integer default null,
  p_zone_id        uuid default null
)
returns table (table_id uuid, numar_masa text, capacitate integer, libera boolean)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  with rez as (
    -- RLS filtreaza aici: o rezervare din alt restaurant pur si simplu nu
    -- exista pentru apelant, iar functia intoarce zero randuri.
    select r.restaurant_id, r.data_ora, r.durata_minute
      from public.reservations r
     where r.id = p_reservation_id
  ),
  cfg as (
    select rest.durata_implicita_minute, rest.buffer_minute, rest.id as restaurant_id
      from public.restaurants rest
      join rez on rez.restaurant_id = rest.id
  ),
  rng as (
    select tstzrange(
             coalesce(p_start, rez.data_ora),
             coalesce(p_start, rez.data_ora)
               + make_interval(mins =>
                   coalesce(p_durata_minute, rez.durata_minute, cfg.durata_implicita_minute)
                   + cfg.buffer_minute),
             '[)'
           ) as r
      from rez, cfg
  )
  select t.id, t.numar_masa, t.capacitate,
         not exists (
           select 1
             from public.table_allocations a, rng
            where a.table_id = t.id
              and a.interval_blocat && rng.r
              -- Inima functiei: propriile alocari nu se blocheaza pe ele insele.
              and a.reservation_id is distinct from p_reservation_id
         ) as libera
    from public.tables t, cfg
   where t.restaurant_id = cfg.restaurant_id
     and (p_zone_id is null or t.zone_id = p_zone_id)
     and t.activa
     -- O masa scoasa din uz nu se propune ca destinatie, dar rezervarile deja
     -- puse pe ea raman: nu stergem realitatea, doar nu mai adaugam la ea.
     and not t.indisponibila
   order by t.numar_masa;
$$;

comment on function public.mese_libere_pentru_rezervare(uuid, timestamptz, integer, uuid) is
  'Ca disponibilitate_mese, dar ignora alocarile rezervarii primite: altfel masa ei ar aparea ocupata de ea insasi la re-alocare (§26.3).';

revoke execute on function public.mese_libere_pentru_rezervare(uuid, timestamptz, integer, uuid) from public;
grant execute on function public.mese_libere_pentru_rezervare(uuid, timestamptz, integer, uuid) to authenticated;
