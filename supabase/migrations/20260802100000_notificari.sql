-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 11. Notificari persistente (§21)
--
-- Enum-urile (notificare_tip, notificare_urgenta, notificare_destinatie)
-- existau din migratia 01, dar tabela nu fusese creata. Aici o adaugam, cu
-- doua decizii:
--
--   1. Notificarile NU se insereaza din client. Nu exista politica de INSERT;
--      singura cale e trigger-ul de mai jos, SECURITY DEFINER. Altfel oricine
--      cu cheia anon ar putea umple clopotelul unui restaurant.
--   2. Se genereaza doar pentru ce vine din AFARA panoului (sursa 'widget').
--      Un ospatar care introduce o rezervare nu are nevoie sa fie anuntat de
--      propria acțiune.
-- ═══════════════════════════════════════════════════════════════════════

create table public.notificari (
  id             uuid primary key default gen_random_uuid(),
  -- null doar pentru notificarile echipei TableX (destinatie = 'super_admin')
  restaurant_id  uuid references public.restaurants(id) on delete cascade,
  destinatie     public.notificare_destinatie not null default 'admin',
  tip            public.notificare_tip        not null,
  urgenta        public.notificare_urgenta    not null default 'albastru',
  titlu          text not null,
  mesaj          text,
  reservation_id uuid references public.reservations(id) on delete cascade,
  citita_la      timestamptz,
  created_at     timestamptz not null default now(),
  constraint notificari_are_destinatar
    check (destinatie = 'super_admin' or restaurant_id is not null)
);

-- Ordinea din clopotel: necitite intai, apoi cele mai recente.
create index notificari_restaurant_idx
  on public.notificari (restaurant_id, created_at desc);
create index notificari_necitite_idx
  on public.notificari (restaurant_id)
  where citita_la is null;

alter table public.notificari enable row level security;

create policy notificari_citire_admin on public.notificari
  for select to authenticated
  using (destinatie = 'admin' and restaurant_id = public.current_restaurant_id());

-- Marcarea ca citit e singura modificare permisa personalului; politica nu
-- poate restrange coloanele, deci restul rămân protejate de faptul ca nimic
-- din interfata nu le scrie (si de lipsa oricarei politici de INSERT/DELETE).
create policy notificari_marcare_admin on public.notificari
  for update to authenticated
  using (destinatie = 'admin' and restaurant_id = public.current_restaurant_id())
  with check (destinatie = 'admin' and restaurant_id = public.current_restaurant_id());

create policy notificari_super_admin on public.notificari
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ── Generarea automata ───────────────────────────────────────────────────
create or replace function public.notifica_rezervare_noua()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fus  text;
  v_ora  text;
begin
  -- Doar cererile venite din widget; ce introduce personalul nu se anunta.
  if new.sursa <> 'widget' then
    return null;
  end if;

  select r.fus_orar into v_fus from public.restaurants r where r.id = new.restaurant_id;
  v_ora := to_char(new.data_ora at time zone coalesce(v_fus, 'Europe/Bucharest'), 'DD.MM HH24:MI');

  insert into public.notificari (
    restaurant_id, destinatie, tip, urgenta, titlu, mesaj, reservation_id
  )
  values (
    new.restaurant_id,
    'admin',
    case when new.status = 'pending' then 'rezervare_pending' else 'rezervare_noua' end,
    -- Galben = cere o decizie umana; albastru = doar informativ (§21).
    case when new.status = 'pending' then 'galben' else 'albastru' end,
    case when new.status = 'pending'
         then 'Cerere de rezervare: ' || new.client_nume
         else 'Rezervare noua: ' || new.client_nume
    end,
    v_ora || ' · ' || new.nr_persoane || ' persoane · ' || new.telefon,
    new.id
  );

  return null;
end;
$$;

create trigger trg_notifica_rezervare
  after insert on public.reservations
  for each row execute function public.notifica_rezervare_noua();

revoke execute on function public.notifica_rezervare_noua() from public;

-- Clopotelul se actualizeaza fara refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notificari'
  ) then
    alter publication supabase_realtime add table public.notificari;
  end if;
end $$;
