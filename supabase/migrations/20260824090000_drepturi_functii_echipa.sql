-- ═══════════════════════════════════════════════════════════════════════════
-- Drepturile functiilor noi de echipa — inchise corect (linterul Supabase)
--
-- Lectia (a doua oara in proiect, prima a fost migratia drepturi_functii):
-- `revoke execute ... from anon` NU ajunge cata vreme PUBLIC pastreaza
-- grantul implicit — anon il mosteneste de acolo. Trebuie revocat de pe
-- PUBLIC, apoi acordat inapoi exact cui ii trebuie.
--
-- Ce inchidem aici:
--   - anunta_credite_epuizate: e interna (o cheama doar consuma_credit, care
--     ruleaza ca owner) — nimeni prin REST. Altfel un anonim putea suna
--     clopotelul echipei cu notificari fabricate.
--   - notifica_ticket_nou / notifica_raspuns_suport: functii de trigger;
--     sistemul le invoca fara verificare de EXECUTE, deci nu au nevoie de
--     niciun grant.
--   - is_echipa_studio / is_echipa_suport: folosite in politici `to
--     authenticated` — authenticated pastreaza EXECUTE, restul nu.
--   - verifica_sanatate_servicii: authenticated (se apara singura inauntru).
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function public.anunta_credite_epuizate(uuid) from public, anon, authenticated;

revoke execute on function public.notifica_ticket_nou() from public, anon, authenticated;
revoke execute on function public.notifica_raspuns_suport() from public, anon, authenticated;

revoke execute on function public.is_echipa_studio() from public, anon;
grant execute on function public.is_echipa_studio() to authenticated;

revoke execute on function public.is_echipa_suport() from public, anon;
grant execute on function public.is_echipa_suport() to authenticated;

revoke execute on function public.verifica_sanatate_servicii() from public, anon;
grant execute on function public.verifica_sanatate_servicii() to authenticated;
