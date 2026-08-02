-- ═══════════════════════════════════════════════════════════════════════════
-- Realtime pentru geometria planului (§9.2.2 pasul 4, §8.4)
--
-- Spec-ul cere ca harta publicata de echipa TableX sa apara pe contul
-- restaurantului INSTANT, fara reload. Pana acum publicatia supabase_realtime
-- continea doar reservations si notificari (plus tichetele de suport), deci
-- panoul restaurantului nu avea de unde sa afle ca s-a schimbat planul —
-- afla abia la urmatorul refetch de 5 minute sau la reload.
--
-- Adaugam cele trei tabele pe care le scrie publicarea: structura (Layer 1),
-- zonele si mesele. Postgres Changes respecta RLS, deci fiecare restaurant
-- primeste doar evenimentele lui.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array['floor_plan_layers', 'zones', 'tables']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
