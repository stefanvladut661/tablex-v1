-- Adminul muta si grupeaza mese, dar nu le mai adauga si nu le mai sterge
--
-- Politica veche, tables_scriere_manager, era FOR ALL: managerul putea insera
-- si sterge mese, nu doar sa le rearanjeze. Mobilarea salii e insa treaba
-- echipei TableX — ea deseneaza planul, ea raspunde de el. Adminul are nevoie
-- de altceva: sa mute mesele cand schimba aranjarea in seara aia si sa le
-- grupeze pentru un grup mare. Amandoua sunt UPDATE.
--
-- Nu e doar curatenie de drepturi. O masa adaugata de Admin nu trece prin
-- niciun control de plan: apare pe harta publica, intra in disponibilitate si
-- se poate rezerva, desi nu exista in sala desenata. Iar o masa STEARSA din
-- greseala ia cu ea istoricul alocarilor.
--
-- Stergerea ramane si ea a echipei. Cine vrea o masa scoasa din uz o
-- dezactiveaza (`indisponibila`) — reversibil, si fara sa piarda trecutul.
--
-- Echipa nu e atinsa: tables_super_admin ramane FOR ALL pe is_echipa_studio().
-- Nu inchidem prin `revoke insert` la nivel de rol, fiindca si echipa
-- ruleaza ca `authenticated` si ar cadea odata cu Adminul; separarea corecta
-- se face din politici, nu din grant-uri.
--
-- RAMANE DE FACUT, deliberat in afara acestei migratii: UPDATE-ul e inca
-- permis pe TOATE coloanele, deci managerul poate schimba capacitatea, forma
-- sau dimensiunea unei mese, nu doar pozitia si grupul. Restrangerea pe coloane
-- nu se poate face din grant-uri (ar lovi si echipa), deci cere un trigger care
-- compara OLD cu NEW. Interfata nu mai ofera drumul, dar consola de browser
-- inca il are.
drop policy if exists tables_scriere_manager on public.tables;

create policy tables_mutare_manager on public.tables
  for update to authenticated
  using (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and public.are_floor_plan()
  )
  with check (
    restaurant_id = public.current_restaurant_id()
    and public.is_manager()
    and public.are_floor_plan()
  );
