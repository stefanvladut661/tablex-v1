-- ═══════════════════════════════════════════════════════════════════════════
-- Support & Ticketing (§9.2.6, §46, §48)
--
-- Ultimul modul intreg ramas fara tabele: enum-urile support_status si
-- support_prioritate existau din migratia 01, dar nu le folosea nimic.
--
-- Forma: un tichet per problema, deschis de managerul restaurantului din
-- portalul lui; conversatia e un sir de mesaje pe tichet (inbox stil
-- helpdesk, §46.1), pe Realtime. Doua feluri de mesaje ale echipei:
--   - raspunsuri normale — le vede si restaurantul;
--   - note interne (nota_interna = true, §46.4) — NUMAI echipa de suport.
-- Separarea notelor interne e treaba RLS-ului, nu a interfetei: politica de
-- citire a restaurantului exclude nota_interna, deci nicio consola de browser
-- nu le poate aduce.
--
-- Cine, ce (§47.4):
--   - managerul: isi deschide tichete, isi vede tichetele si mesajele
--     ne-interne, raspunde in propriile tichete;
--   - echipa de suport (super_admin deplin + rolul support): totul —
--     inclusiv status, prioritate (§46.3) si note interne;
--   - designer_architect si ospatarul: nimic.
--
-- Sortarea inbox-ului (§46.3: prioritate, apoi vechime) se sprijina pe
-- ordinea de declarare a enum-ului support_prioritate ('normal' < 'nou' <
-- 'urgent'): ORDER BY prioritate DESC, created_at ASC.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  subiect       text not null check (btrim(subiect) <> ''),
  status        public.support_status     not null default 'nou',
  prioritate    public.support_prioritate not null default 'nou',
  deschis_de    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index support_tickets_inbox_idx
  on public.support_tickets (status, prioritate desc, created_at asc);
create index support_tickets_restaurant_idx
  on public.support_tickets (restaurant_id, created_at desc);

create trigger trg_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_ticket_mesaje (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets(id) on delete cascade,
  autor        uuid references auth.users(id) on delete set null,
  -- Din ce parte a mesei vine mesajul. Coloana proprie, nu dedusa la afisare:
  -- restaurantul nu poate citi super_admin_users ca sa-si dea seama singur.
  de_la_echipa boolean not null default false,
  nota_interna boolean not null default false,
  continut     text not null check (btrim(continut) <> ''),
  created_at   timestamptz not null default now(),
  -- Notele interne sunt ale echipei prin definitie (§46.4).
  constraint nota_interna_doar_echipa check (de_la_echipa or not nota_interna)
);

create index support_ticket_mesaje_fir_idx
  on public.support_ticket_mesaje (ticket_id, created_at asc);

-- Sabloanele de raspuns rapid ale echipei (§46.2, §48):
-- super_admin_user_id NULL inseamna sablon global al echipei.
create table public.support_response_templates (
  id                  uuid primary key default gen_random_uuid(),
  super_admin_user_id uuid references auth.users(id) on delete cascade,
  titlu               text not null check (btrim(titlu) <> ''),
  continut            text not null check (btrim(continut) <> ''),
  created_at          timestamptz not null default now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.support_tickets            enable row level security;
alter table public.support_ticket_mesaje      enable row level security;
alter table public.support_response_templates enable row level security;

-- Tichetele: managerul le deschide si le vede pe ale lui; echipa de suport
-- poate tot (inclusiv status si prioritate). Managerul NU are politica de
-- UPDATE: starea tichetului o administreaza echipa.
create policy support_tickets_citire_manager on public.support_tickets
  for select to authenticated
  using (restaurant_id = public.current_restaurant_id() and public.is_manager());

create policy support_tickets_deschidere_manager on public.support_tickets
  for insert to authenticated
  with check (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and deschis_de = auth.uid()
    -- Statusul si prioritatea pleaca din starea initiala; restul starilor le
    -- da echipa.
    and status = 'nou'
    and prioritate = 'nou'
  );

create policy support_tickets_echipa on public.support_tickets
  for all to authenticated
  using (public.is_echipa_suport())
  with check (public.is_echipa_suport());

-- Mesajele: restaurantul vede DOAR mesajele ne-interne ale tichetelor lui si
-- scrie doar in tichetele lui, doar ca parte a restaurantului.
create policy support_mesaje_citire_manager on public.support_ticket_mesaje
  for select to authenticated
  using (
    not nota_interna
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and t.restaurant_id = public.current_restaurant_id()
    )
    and public.is_manager()
  );

create policy support_mesaje_scriere_manager on public.support_ticket_mesaje
  for insert to authenticated
  with check (
    not de_la_echipa
    and not nota_interna
    and autor = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and t.restaurant_id = public.current_restaurant_id()
    )
    and public.is_manager()
  );

create policy support_mesaje_echipa on public.support_ticket_mesaje
  for all to authenticated
  using (public.is_echipa_suport())
  with check (public.is_echipa_suport());

-- Sabloanele de raspuns: fiecare operator le vede pe ale lui si pe cele
-- globale; rolul deplin le vede pe toate. Globalele se creeaza de oricine din
-- suport, dar se modifica/sterg doar de autorul... global n-are autor, deci
-- doar de rolul deplin.
create policy support_sabloane_citire on public.support_response_templates
  for select to authenticated
  using (
    public.is_echipa_suport()
    and (super_admin_user_id is null
         or super_admin_user_id = auth.uid()
         or public.is_super_admin_deplin())
  );

create policy support_sabloane_creare on public.support_response_templates
  for insert to authenticated
  with check (
    public.is_echipa_suport()
    and (super_admin_user_id is null or super_admin_user_id = auth.uid())
  );

create policy support_sabloane_modificare on public.support_response_templates
  for update to authenticated
  using (
    public.is_echipa_suport()
    and (super_admin_user_id = auth.uid()
         or (super_admin_user_id is null and public.is_super_admin_deplin()))
  )
  with check (
    public.is_echipa_suport()
    and (super_admin_user_id is null or super_admin_user_id = auth.uid())
  );

create policy support_sabloane_stergere on public.support_response_templates
  for delete to authenticated
  using (
    public.is_echipa_suport()
    and (super_admin_user_id = auth.uid()
         or (super_admin_user_id is null and public.is_super_admin_deplin()))
  );

-- ── Notificari (§9.1) ──────────────────────────────────────────────────────
-- Tichet nou → punct albastru in clopotelul echipei. Scris din trigger, ca
-- toate notificarile: clientul nu are politica de INSERT pe notificari.
create or replace function public.notifica_ticket_nou()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nume text;
begin
  select r.nume into v_nume from public.restaurants r where r.id = new.restaurant_id;

  insert into public.notificari (destinatie, tip, urgenta, titlu, mesaj)
  values (
    'super_admin', 'ticket_suport', 'albastru',
    'Tichet nou: ' || coalesce(v_nume, 'restaurant'),
    left(new.subiect, 140)
  );

  return null;
end;
$$;

create trigger trg_notifica_ticket_nou
  after insert on public.support_tickets
  for each row execute function public.notifica_ticket_nou();

revoke execute on function public.notifica_ticket_nou() from public;

-- Raspunsul echipei (nu si notele interne) anunta restaurantul in clopotelul
-- lui, ca sa nu tina pagina de tichete deschisa ca sa afle.
create or replace function public.notifica_raspuns_suport()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ticket public.support_tickets;
begin
  if not new.de_la_echipa or new.nota_interna then
    return null;
  end if;

  select * into v_ticket from public.support_tickets t where t.id = new.ticket_id;

  insert into public.notificari (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
  values (
    v_ticket.restaurant_id, 'admin', 'ticket_suport', 'albastru',
    'Raspuns de la TableX: ' || left(v_ticket.subiect, 80),
    left(new.continut, 140)
  );

  return null;
end;
$$;

create trigger trg_notifica_raspuns_suport
  after insert on public.support_ticket_mesaje
  for each row execute function public.notifica_raspuns_suport();

revoke execute on function public.notifica_raspuns_suport() from public;

-- ── Realtime (§46.1: chat direct realtime) ─────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'support_ticket_mesaje'
  ) then
    alter publication supabase_realtime add table public.support_ticket_mesaje;
  end if;
end $$;
