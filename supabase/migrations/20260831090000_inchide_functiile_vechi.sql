-- ═══════════════════════════════════════════════════════════════════════════
-- Functiile vechi, inchise fata de `anon` (linterul Supabase)
--
-- A TREIA oara aceeasi lectie, si de data asta pe functii scrise cu luni in
-- urma: `revoke execute ... from public` NU inchide nimic pentru anon.
-- Supabase acorda EXECUTE explicit rolurilor anon si authenticated pe tot ce
-- apare in schema `public` (ALTER DEFAULT PRIVILEGES), iar un revoke de pe
-- PUBLIC lasa acele granturi explicite pe loc. Trebuie numit rolul.
--
-- Migratia drepturi_functii_echipa a facut-o corect pentru functiile NOI;
-- aici sunt cele ramase din migratiile vechi. Ce se inchide si de ce:
--
--   credite_whatsapp(uuid) — CEA MAI SERIOASA: un anonim putea afla soldul
--     de credite al ORICARUI restaurant, cu un POST si un uuid. Nu e dată
--     personala, dar e informatie comerciala si e clar contrara intentiei
--     (migratia ei scria deja `grant ... to authenticated`).
--   reincarca_credite(uuid) — se apara singura (cere manager), dar un
--     endpoint care oricum refuza n-are ce cauta deschis.
--   are_floor_plan() — pentru anon intoarce oricum fals; o inchidem ca sa
--     nu ramana suprafata inutila.
--   arhiveaza_versiune_plan(), calculeaza_comision_bilet(),
--     protejeaza_contul_propriu() — functii de TRIGGER. Sistemul le apeleaza
--     fara sa verifice EXECUTE, deci nu au nevoie de niciun grant; expuse
--     prin REST erau doar o cale de a rula efecte laterale de-a dreptul.
--
-- Ce ramane DELIBERAT deschis pentru anon (widgetul public si signup-ul nu
-- functioneaza fara ele): rezerva_public, disponibilitate_mese, este_deschis,
-- detalii_invitatie, slug_disponibil. Fiecare isi valideaza singura intrarile.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Functii de trigger: niciun rol nu le apeleaza direct ───────────────────
revoke execute on function public.arhiveaza_versiune_plan()   from public, anon, authenticated;
revoke execute on function public.calculeaza_comision_bilet() from public, anon, authenticated;
revoke execute on function public.protejeaza_contul_propriu() from public, anon, authenticated;

-- ── Doar personalul autentificat ──────────────────────────────────────────
revoke execute on function public.are_floor_plan()               from public, anon;
grant  execute on function public.are_floor_plan()               to authenticated;

revoke execute on function public.credite_whatsapp(uuid)         from public, anon;
grant  execute on function public.credite_whatsapp(uuid)         to authenticated;

revoke execute on function public.reincarca_credite(uuid)        from public, anon;
grant  execute on function public.reincarca_credite(uuid)        to authenticated;
