-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 17. Corectie: drepturile functiilor din migratia 16
--
-- ACEEASI GRESEALA CA IN MIGRATIA 05, pe care migratia 07 o corectase deja, si
-- pe care am reintrodus-o in 16: "revoke execute ... from public" NU sterge
-- drepturile acordate EXPLICIT rolurilor. Supabase acorda din default
-- privileges EXECUTE catre anon si authenticated pe orice functie noua din
-- schema public, iar revocarea de la PUBLIC nu le atinge.
--
-- Verificat inainte de corectie, in pg_proc.proacl: atat
-- verifica_secret_webhook cat si email_cerere_widget aveau anon si
-- authenticated in listă.
--
-- De ce conteaza, concret:
-- verifica_secret_webhook raspunde da/nu la o valoare de secret. Expusa in
-- PostgREST, devine un ORACOL: oricine cu cheia anon poate incerca valori
-- pana nimereste secretul webhook-ului. Secretul are 256 de biti, deci
-- ghicirea e impracticabila — dar nu exista niciun motiv sa fie apelabila.
-- Singurul apelant legitim e Edge Function-ul, care foloseste service_role.
--
-- email_cerere_widget e o functie de trigger; un apel direct ar esua oricum
-- ("trigger functions can only be called as triggers"), dar o scoatem din
-- suprafata API din acelasi principiu: nimic in plus fata de ce e necesar.
-- ═══════════════════════════════════════════════════════════════════════

revoke execute on function public.verifica_secret_webhook(text)
  from public, anon, authenticated;
grant execute on function public.verifica_secret_webhook(text) to service_role;

revoke execute on function public.email_cerere_widget()
  from public, anon, authenticated, service_role;
