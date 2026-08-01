-- ═══════════════════════════════════════════════════════════════════════════
-- Cifrele paginii Acasa (§24.4)
--
-- Un singur apel, nu cinci. Pagina se deschide pe o tableta, in sala, adesea pe
-- 4G: cinci cereri paralele inseamna cinci curse dus-intors si cinci momente in
-- care ecranul poate arata jumatate din adevar.
--
-- DEFINITIA OCUPARII, scrisa aici ca sa poata fi auditata: mese ACTIVE si
-- disponibile care au o alocare acoperind clipa curenta, impartite la toate
-- mesele active si disponibile ale restaurantului. Nu tine cont de zone si nu
-- foloseste capacitatea — „50% ocupare" inseamna jumatate din mese, nu jumatate
-- din scaune. Orice alta definitie e la fel de valida, dar trebuie sa fie UNA
-- singura si scrisa undeva, altfel devine un numar pe care nimeni nu-l poate
-- verifica.
--
-- Mesele scoase din uz ies din ambii termeni: o sala cu 10 mese din care 2 sunt
-- stricate e plina la 8, nu la 10.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.kpi_zi(p_zi date default null)
returns table (
  rezervari_azi        integer,
  persoane_azi         integer,
  pending_nerezolvate  integer,
  mese_ocupate         integer,
  mese_total           integer,
  no_show_7_zile       integer
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with rest as (
    select r.id, r.fus_orar
      from public.restaurants r
     where r.id = public.current_restaurant_id()
  ),
  zi as (
    -- Ziua restaurantului, nu a serverului: un restaurant din alt fus si-ar
    -- vedea altfel „azi"-ul.
    select
      coalesce(p_zi, (now() at time zone rest.fus_orar)::date) as data,
      rest.id as restaurant_id,
      rest.fus_orar
      from rest
  ),
  interval_zi as (
    select
      (zi.data::timestamp at time zone zi.fus_orar) as inceput,
      ((zi.data + 1)::timestamp at time zone zi.fus_orar) as sfarsit,
      zi.restaurant_id
      from zi
  )
  select
    (select count(*)::integer from public.reservations r, interval_zi i
      where r.restaurant_id = i.restaurant_id
        and r.data_ora >= i.inceput and r.data_ora < i.sfarsit
        and r.status in ('pending', 'confirmata', 'sosita')),

    (select coalesce(sum(r.nr_persoane), 0)::integer from public.reservations r, interval_zi i
      where r.restaurant_id = i.restaurant_id
        and r.data_ora >= i.inceput and r.data_ora < i.sfarsit
        and r.status in ('pending', 'confirmata', 'sosita')),

    -- Cererile pending NU expira niciodata (§15.2), deci se numara TOATE cele
    -- netratate, nu doar cele de azi: una uitata de saptamana trecuta e exact
    -- lucrul pe care pagina trebuie sa-l scoata la suprafata.
    (select count(*)::integer from public.reservations r, interval_zi i
      where r.restaurant_id = i.restaurant_id and r.status = 'pending'),

    (select count(distinct a.table_id)::integer
       from public.table_allocations a
       join public.tables t on t.id = a.table_id
       , interval_zi i
      where a.restaurant_id = i.restaurant_id
        and t.activa and not t.indisponibila
        and a.interval_blocat @> now()),

    (select count(*)::integer from public.tables t, interval_zi i
      where t.restaurant_id = i.restaurant_id and t.activa and not t.indisponibila),

    (select count(*)::integer from public.reservations r, interval_zi i
      where r.restaurant_id = i.restaurant_id
        and r.status = 'no_show'
        and r.data_ora >= now() - interval '7 days')
$$;

comment on function public.kpi_zi(date) is
  'Cifrele paginii Acasa (§24.4) intr-un singur apel. Ocuparea = mese active '
  'ocupate acum / mese active, fara zone si fara capacitate.';

revoke execute on function public.kpi_zi(date) from public;
grant execute on function public.kpi_zi(date) to authenticated;
