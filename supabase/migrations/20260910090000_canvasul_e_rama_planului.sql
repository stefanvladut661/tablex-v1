-- Canvasul devine rama planului, iar geometria capata limite in BAZA
-- ==========================================================================
--
-- DE CE
--
-- Pana acum incadrarea cu care restaurantul si widgetul public vedeau planul
-- se compunea din doua lucruri care nu se stiau unul pe altul:
--   1. viewBox-ul se stranguia automat pe dreptunghiul care cuprinde continutul;
--   2. peste el se aplica `zones.zoom_implicit`, o scara salvata de echipa, dar
--      ancorata in ORIGINEA viewBox-ului, nu in centrul lui.
-- Rezultatul: cu doua mese intr-un colt, „auto-centrarea" din builder cerea o
-- scara de sapte ori si o taia la plafonul de 4x — adica ateriza in nasul unui
-- scaun — iar la publicare planul aparea impins in coltul stanga-sus, exact asa
-- cum il vedea si operatorul, fara nicio cale de a-l misca.
--
-- Regula noua e una singura si se poate spune intr-o propozitie: se publica
-- exact CANVASUL zonei, umpland tot spatiul disponibil si pastrand raportul.
-- Ce ramane in afara chenarului nu se vede la Admin si nici in widget.
--
-- Migratia asta nu schimba randare (aia e in React); face doua lucruri pe care
-- interfata NU are voie sa le faca singura, conform regulii 5 din CLAUDE.md:
-- „regula se impune in BAZA, nu in interfata".
--
--
-- 1. LIMITELE GEOMETRIEI
--
-- `tables.latime` / `inaltime` si `zones.canvas_*` / `grid_marime` n-au avut
-- niciodata vreun CHECK. Pana acum nu se vedea, fiindca singurele cai de
-- scriere erau campurile numerice din panou. Odata cu manerele de
-- redimensionare apare o a doua cale, si mai ales: politica
-- `tables_mutare_manager` e FOR UPDATE pe TOATE coloanele, deci un manager cu
-- Pro Floor poate scrie `latime = 0` dintr-o consola de browser. O masa cu
-- latimea 0 nu arunca nicio eroare — doar dispare de pe harta, si nimeni nu
-- stie de ce. `grid_marime = 0` ar strica aritmetica de aliniere (impartire la
-- zero) pentru toata zona.
--
-- Marginile alese oglindesc exact ce accepta interfata azi, ca sa nu existe
-- valori valide in ecran si refuzate de baza:
--   - latura minima 20 (LATURA_MINIMA din src/lib/geometrie-plan.ts)
--   - canvas intre 200 si 5000 (min/max ale campurilor din PanouZona)
--   - grid intre 1 si 200
-- Verificat inainte de scriere: niciun rand existent nu le incalca.
--
--
-- 2. `zoom_implicit` RAMANE, DAR NU MAI E CITITA DE NIMENI
--
-- Coloana NU se sterge. `zone_publice` e o vedere care ar trebui recreata cu
-- DROP + CREATE, iar `grant select to anon, authenticated` se pierde la DROP
-- (regula 7 din CLAUDE.md se aplica identic vederilor) — adica exact clasa de
-- bug care lasa widgetul public cu 42501 la fiecare cerere. Costul de a o
-- pastra e zero: nimeni nu o mai citeste. CHECK-ul si trigger-ul
-- `trg_zones_zoom_implicit` raman ca garda inofensiva.
--
-- Se schimba doar comentariul, ca urmatorul care deschide schema sa nu creada
-- ca a gasit maneta de incadrare.

alter table public.tables
  add constraint tables_latime_valida check (latime >= 20 and latime <= 5000),
  add constraint tables_inaltime_valida check (inaltime >= 20 and inaltime <= 5000);

alter table public.zones
  add constraint zones_canvas_latime_valida
    check (canvas_latime >= 200 and canvas_latime <= 5000),
  add constraint zones_canvas_inaltime_valida
    check (canvas_inaltime >= 200 and canvas_inaltime <= 5000),
  add constraint zones_grid_valid
    check (grid_marime >= 1 and grid_marime <= 200);

comment on constraint tables_latime_valida on public.tables is
  'O masa mai ingusta de 20 nu se mai poate apuca pe harta, iar una de 0 dispare fara sa arunce eroare. Manerele de redimensionare limiteaza deja in client; asta e limita care tine si pentru scrierile prin REST.';

comment on constraint zones_grid_valid on public.zones is
  'grid_marime = 0 ar imparti la zero in alinierea la grid si ar corupe fiecare mutare din zona.';

comment on column public.zones.zoom_implicit is
  'OBSOLETA din 2026-08-04. Incadrarea publicata nu mai vine de aici: se afiseaza canvasul zonei intreg (canvas_latime x canvas_inaltime), umpland spatiul disponibil si pastrand raportul. Coloana ramane doar ca sa nu fie nevoie de DROP + CREATE pe vederea zone_publice, unde s-ar pierde grant-urile catre anon. Nicio parte din aplicatie nu o mai citeste.';

comment on column public.zones.canvas_latime is
  'Latimea ramei in care se deseneaza planul. La publicare canvasul umple tot spatiul disponibil, pastrand raportul canvas_latime:canvas_inaltime — deci ce iese din el nu ajunge nici la Admin, nici in widgetul public.';
