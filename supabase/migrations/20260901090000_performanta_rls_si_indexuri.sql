-- ═══════════════════════════════════════════════════════════════════════════
-- Performanta RLS: auth.uid() evaluat O DATA, nu per rand (+ indexuri pe FK)
--
-- PARTEA 1 — auth_rls_initplan (semnalat de advisorul Supabase).
-- Scris direct in politica, `auth.uid()` se re-evalueaza pentru FIECARE rand
-- scanat. Invelit in subselect — `(select auth.uid())` — planificatorul il
-- scoate intr-un InitPlan si il evalueaza o singura data pe interogare.
-- Semantica e IDENTICA; se schimba doar planul. Diferenta se vede pe listele
-- lungi (membri, tichete, sabloane), unde altfel platesti un apel de functie
-- pe rand.
--
-- De ce doar aceste noua politici si nu toate: restul folosesc functiile
-- noastre (current_restaurant_id, is_super_admin, is_manager...), care sunt
-- STABLE — Postgres le evalueaza oricum o data pe interogare. Advisorul le
-- semnaleaza corect doar pe cele cu apel DIRECT la auth.uid().
--
-- PARTEA 2 — indexuri pe chei straine.
-- Advisorul raporteaza 28 de FK-uri fara index; punem 11. Restul refera
-- `auth.users` din coloane de audit (created_by, efectuat_de, invited_by...):
-- nu se interogheaza niciodata dupa ele, iar conturile nu se sterg practic
-- deloc — un index acolo ar fi cost la fiecare scriere pentru un beneficiu
-- care nu vine. Le punem exact acolo unde stergerea parintelui chiar se
-- intampla in aplicatie (mese, zone, evenimente, bilete, clienti) sau unde
-- exista o cautare repetata (notificari.reservation_id, cautat la fiecare
-- rulare a jobului de mese in expirare).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── PARTEA 1: politicile cu apel direct la auth.uid() ─────────────────────

drop policy if exists admin_users_citire on public.admin_users;
create policy admin_users_citire on public.admin_users
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or restaurant_id = public.current_restaurant_id()
    or public.is_super_admin()
  );

drop policy if exists admin_users_actualizare_propriu on public.admin_users;
create policy admin_users_actualizare_propriu on public.admin_users
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists super_admin_users_citire on public.super_admin_users;
create policy super_admin_users_citire on public.super_admin_users
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());

drop policy if exists support_tickets_deschidere_manager on public.support_tickets;
create policy support_tickets_deschidere_manager on public.support_tickets
  for insert to authenticated
  with check (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and deschis_de = (select auth.uid())
    and status = 'nou'
    and prioritate = 'nou'
  );

drop policy if exists support_mesaje_scriere_manager on public.support_ticket_mesaje;
create policy support_mesaje_scriere_manager on public.support_ticket_mesaje
  for insert to authenticated
  with check (
    not de_la_echipa
    and not nota_interna
    and autor = (select auth.uid())
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and t.restaurant_id = public.current_restaurant_id()
    )
    and public.is_manager()
  );

drop policy if exists support_sabloane_citire on public.support_response_templates;
create policy support_sabloane_citire on public.support_response_templates
  for select to authenticated
  using (
    public.is_echipa_suport()
    and (super_admin_user_id is null
         or super_admin_user_id = (select auth.uid())
         or public.is_super_admin_deplin())
  );

drop policy if exists support_sabloane_creare on public.support_response_templates;
create policy support_sabloane_creare on public.support_response_templates
  for insert to authenticated
  with check (
    public.is_echipa_suport()
    and (super_admin_user_id is null or super_admin_user_id = (select auth.uid()))
  );

drop policy if exists support_sabloane_modificare on public.support_response_templates;
create policy support_sabloane_modificare on public.support_response_templates
  for update to authenticated
  using (
    public.is_echipa_suport()
    and (super_admin_user_id = (select auth.uid())
         or (super_admin_user_id is null and public.is_super_admin_deplin()))
  )
  with check (
    public.is_echipa_suport()
    and (super_admin_user_id is null or super_admin_user_id = (select auth.uid()))
  );

drop policy if exists support_sabloane_stergere on public.support_response_templates;
create policy support_sabloane_stergere on public.support_response_templates
  for delete to authenticated
  using (
    public.is_echipa_suport()
    and (super_admin_user_id = (select auth.uid())
         or (super_admin_user_id is null and public.is_super_admin_deplin()))
  );

-- ── PARTEA 2: indexuri pe FK-urile care chiar se folosesc ─────────────────

-- Mesele se sterg din editor: fiecare stergere verifica aceste trei tabele.
create index if not exists event_tables_table_idx     on public.event_tables (table_id);
create index if not exists tickets_table_idx          on public.tickets (table_id);
create index if not exists waitlist_table_idx         on public.waitlist (table_id);

-- Zonele se sterg la fel de des ca mesele.
create index if not exists event_pricing_zone_idx     on public.event_ticket_pricing (zone_id);
create index if not exists reservations_zone_idx      on public.reservations (zone_id);
create index if not exists waitlist_zone_idx          on public.waitlist (zone_id);

-- Evenimentul sters trebuie sa-si gaseasca rezervarile legate.
create index if not exists reservations_event_idx     on public.reservations (event_id)
  where event_id is not null;

-- Biletul platit tine o alocare; trigger-ul si stergerea o cauta dupa ticket_id.
create index if not exists alocari_ticket_idx         on public.table_allocations (ticket_id)
  where ticket_id is not null;

-- RLS-ul pe bilete filtreaza restaurant_id la FIECARE citire.
create index if not exists tickets_restaurant_idx     on public.tickets (restaurant_id);

-- Contopirea clientilor urmareste lantul; retentia GDPR sterge clienti.
create index if not exists customers_merged_into_idx  on public.customers (merged_into_id)
  where merged_into_id is not null;
create index if not exists merge_audit_principal_idx  on public.customer_merge_audit (principal_id);
