# TableX.ro v1 - Plan de Dezvoltare & Checkpoint

<!-- LAST_COMPLETED: contopirea fiselor de client (customer_merge_audit + alias de telefon) -->
<!-- NEXT_TASK: furnizor email (RESEND_API_KEY, cere cont si domeniu); QA manual drag calendar -->
<!-- LAST_COMMIT: main branch synced to GitHub -->
<!-- GITHUB_REPO: https://github.com/stefanvladut661/tablex-v1.git -->
<!-- BRANCH: main (NU master) -->

**Data creării:** 2026-07-29
**Status:** ~90% MVP implementat
**Model:** Haiku 4.5 (context <100k pe sesiune) | Opus 5 (faze complexe)
**Ultima sesiune:** Fazele 1c, 1d, 2, 3, 4 si 5 — de la auth pana la widget public
**GitHub:** https://github.com/stefanvladut661/tablex-v1 (synced)
**Supabase:** proiect `xrwyscszfpiqeupqnahy` (migratii aplicate remote)

---

## 1. PROJECT OVERVIEW

### Vision
TableX.ro = SaaS de management al rezervărilor pentru restaurante/baruri.
- Multi-tenant (organizații pe subdomeniu: org.tablex.local)
- 2D floor plan interactive cu seating assignment
- Real-time booking + CRM integrat
- Calendar cu drag-drop
- Walk-in check-in workflow

### Tech Stack (CONFIRMATĂ)
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (28 componente)
- **Backend:** Supabase PostgreSQL (enums, real-time subscriptions)
- **API:** React Query + Zod validation + react-hook-form
- **Routing:** React Router 8 cu guard-based access control
- **Auth:** Supabase Auth (Magic Link + email/password)

### Key Files
src/
├── index.css              # Design system vars (60-30-10 rule, traffic light)
├── components/ui/         # 28 shadcn/ui components
├── pages/                 # Route pages
├── contexts/              # Auth, Theme, Notifications
├── hooks/                 # Custom React hooks
├── services/              # API calls (React Query)
├── lib/                   # Utils, Supabase client
├── types/                 # TypeScript types

---

## 2. FAZE ȘI ESTIMĂRI

| Faza | Titlu | Status | Session Estimate | Notes |
|------|-------|--------|------------------|-------|
| 1a | Fundație + Design System | ✅ DONE | - | Index.css + shadcn/ui |
| 1b | Schema SQL | ✅ DONE | - | Migrations: enums, tenancy, floor_plan, rezervari |
| 1c | Supabase Client + Contexts + Router | ✅ DONE | - | Client tipat, AuthProvider, 5 garzi, 9 pagini |
| 1d | Row Level Security | ✅ DONE | - | RLS + politici pe 19 tabele, vedere `restaurante_publice` |
| 2 | Landing + 2D Floor Plan Viewer | ✅ DONE | - | Landing cu preturi live + HartaZona (SVG, zoom/pan) + /demo |
| 3 | Onboarding Flow | ✅ DONE | - | RPC creeaza_restaurant, generator slug, invitatii + pagina Echipa |
| 4 | Dashboard & Calendar | ✅ DONE | - | Shell, calendar zi/saptamana/luna, lista, harta live, walk-in |
| 5 | Real-time + widget public | ✅ DONE | - | Subscriptions, notificari, /r/:slug (emailurile rămân) |

**Total MVP:** ~8-9 sessions (est. 800k-900k tokens @ Haiku + 200k @ Opus)

---

## 3. CHECKPOINT: RELUARE DUPĂ COOLDOWN

### 3.1 Pre-flight Checklist
```bash
# 1. Verify repo state
cd /path/to/tablex-v1-claude
git status                    # Should be clean
git log --oneline -5          # Last commit: "Faza 1b: schema SQL..."

# 2. Check .env
cat .env.local                # Must have VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
# If missing: copy from Supabase dashboard > Project Settings > API

# 3. Check deps
npm list react react-dom      # Should be 19.x
npm list tailwindcss          # Should be v4.x
npm list @supabase/supabase-js # Should be latest

# 4. Test build
npm run build                 # Must succeed (no errors)

# 5. List pending files (should be empty)
git ls-files -o --exclude-standard

3.2 Current Session Branch

# You are on: main
# Do NOT create feature branches — main is primary branch
git branch -a

3.3 Last Completed Files

- ✅ src/index.css — 60-30-10 design system (see below)
- ✅ src/components/ui/* — 28 shadcn/ui components
- ✅ Database migrations (4 SQL files via Supabase)
  - extensii_enumuri — Enum types for status/payment/reservation types
  - tenancy — Organizations + users
  - floor_plan — Venue geometry + seats
  - rezervari_crm — Bookings + CRM

---
4. DESIGN SYSTEM REFERENCE

4.1 Color Palette (CSS Variables in index.css)

/* 60% Neutral (background/text) */
--color-neutral-50: #f9fafb;
--color-neutral-900: #111827;

/* 30% Accent (interactive) */
--color-accent-500: #3b82f6;  /* Primary action */
--color-accent-600: #2563eb;

/* 10% Alert (traffic light) */
--color-success: #10b981;     /* Green */
--color-warning: #f59e0b;     /* Amber */
--color-error: #ef4444;       /* Red */

4.2 Component Guidelines

- Use Tailwind classes, NOT inline styles
- All forms: react-hook-form + Zod validation
- All modals: shadcn/ui Dialog
- All tables: shadcn/ui Table component
- All dropdowns: shadcn/ui Select/DropdownMenu

---
5. FAZA 1c + 1d: AUTH, ROUTER, RLS — ✅ COMPLETATE

Duration: 1 session (Opus 5)
Dependencies: none

5.1 Ce s-a livrat

- [x] src/types/database.ts — tipuri generate din schema remote
- [x] src/lib/supabase.ts — client tipat, PKCE, fail-fast pe env lipsa
- [x] src/lib/rute.ts — RUTE (sursa unica de cai) + ruteDupaLogin()
- [x] src/lib/erori.ts — traducere erori Supabase in romana
- [x] src/lib/validari.ts — scheme zod partajate (email, parola, telefon RO)
- [x] src/contexts/auth-context.ts + AuthProvider.tsx — sesiune + profil
      (union discriminat admin | super_admin), login parola/magic link,
      signup, resetare parola, retrimitere confirmare
- [x] src/contexts/ThemeProvider.tsx — next-themes (aceeasi sursa ca ui/sonner)
- [x] src/contexts/notificari-context.ts + NotificariProvider.tsx — toast-uri
- [x] src/hooks/useAuth.ts, useTema.ts, useNotificari.ts
- [x] src/components/rute-protejate.tsx — 5 garzi (Oaspete, Protejata, Admin,
      Manager, SuperAdmin) + ecrane de blocaj (cont dezactivat / suspendat)
- [x] 9 pagini: Landing, Login, Signup, ResetareParola, ParolaNoua,
      VerificaEmail, Dashboard (stub), SuperAdmin (stub), 404, Mentenanta
- [x] src/router.tsx + src/App.tsx (ThemeProvider > QueryClient > Auth > Notificari)
- [x] supabase/migrations/20260730090000_rls.sql — RLS pe 19 tabele,
      helper-e current_restaurant_id() / is_manager() / is_super_admin(),
      vedere restaurante_publice pentru widget

5.1.1 Amanat intentionat (nu e uitat)

- Crearea restaurantului la signup → Faza 3 (onboarding). Momentan datele
  (nume persoana, nume restaurant, telefon) stau in user_metadata.
- Acceptarea invitatiei prin token → RPC dedicat in Faza 3; tabelele de
  invitatii nu sunt citibile de anon (by design).
- Scrierea rezervarilor de catre widgetul anonim → Faza 2/5, prin RPC sau
  edge function, nu prin politica de insert pentru anon (risc de spam).
- 5 erori de lint preexistente in src/components/ui/* si hooks/use-mobile.ts
  (cod generat de shadcn). Codul propriu trece lint curat.

5.2 ENV Variables (Copy from Supabase Dashboard)

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxxxx

5.3 Forma reala a contextului de auth (src/contexts/auth-context.ts)

// Un cont e ORI admin de restaurant, ORI membru al echipei TableX —
// niciodata ambele (trigger verifica_apartenenta_unica). De aici union-ul:
type Profil =
  | { tip: 'admin'; cont: Tables<'admin_users'>; restaurant: Tables<'restaurants'> }
  | { tip: 'super_admin'; cont: Tables<'super_admin_users'> }

// Din ValoareAuth: sesiune, utilizator, profil, incarcare, esteAutentificat,
// esteAdmin, esteManager, esteSuperAdmin, autentificare, trimiteMagicLink,
// inregistrare, retrimiteConfirmare, trimiteResetareParola,
// seteazaParolaNoua, deconectare, reincarcaProfil

5.4 Rute reale (src/lib/rute.ts — sursa unica; nu hardcoda cai in componente)

/                  Landing (public)
/login             RutaOaspete
/signup            RutaOaspete
/resetare-parola   RutaOaspete
/parola-noua       fara garda (ruleaza pe sesiunea de recovery)
/verifica-email    fara garda
/mentenanta        fara garda
/app               RutaProtejata > RutaAdmin
/superadmin        RutaProtejata > RutaSuperAdmin
/r/:slug           widget public (Faza 2, inca neinregistrat in router)
*                  404

Garzi: RutaOaspete, RutaProtejata, RutaAdmin, RutaManager, RutaSuperAdmin
(src/components/rute-protejate.tsx). RutaManager e scrisa, dar inca nefolosita
in router — se ataseaza la /app/setari in Faza 4.

5.5 Verificat in aceasta sesiune

- [x] npm run build (tsc -b + vite build) trece
- [x] npm run lint — 0 probleme in codul propriu
- [x] npm run dev porneste, /login se randeaza (verificat prin a11y snapshot)
- [x] endpoint-ul de auth raspunde; "Invalid login credentials" se traduce
      in "Email sau parola gresita."
- [x] RLS: cu cheia anon, restaurants/reservations/customers/staff_invitations
      returneaza [], iar INSERT in restaurants da 401 / 42501

5.6 Ramas de verificat cu date reale (Faza 3, cand exista onboarding)

Facut in sesiunea din §6duovicies, cu conturi reale de manager si ospatar:

- [x] login complet → profil incarcat → /app afiseaza restaurantul
- [x] ospatar vs manager: garda RutaManager blocheaza ospatarul
- [x] restaurant suspendat → ecran de blocaj, nu dashboard

---
6. FAZA 2: LANDING PAGE + HARTA 2D — ✅ COMPLETATA

Duration: 1 sesiune (Opus 5)

6.1 Landing page (src/pages/LandingPage.tsx)

- [x] Header sticky cu navigatie pe ancore + comutator de tema
- [x] Hero (pitch + CTA dublu: cont nou / demonstratie)
- [x] 5 carduri de functionalitati
- [x] Secțiune "Harta 2D, la ora 19:30" cu viewer-ul real, nu o imagine
- [x] Preturi din app_settings prin React Query (5 €, 10 €, setup 100 €) —
      singura tabela citibila de anon, deci preturile sunt mereu cele reale
- [x] FAQ (5 intrebari, <details>; nu exista accordion in components/ui)
- [x] Footer
- Moneda e o singura constanta (MONEDA) in LandingPage; app_settings tine
  doar numere.

6.2 Viewer 2D (src/components/floor-plan/)

- [x] HartaZona.tsx — SVG cu viewBox = canvas-ul zonei, grid din pattern,
      ordine de desenare grid → Layer 1 (sortat pe z) → Layer 2 (mese)
- [x] useZoomPan.ts — zoom la cursor si pan, calculat in spatiul viewBox prin
      getScreenCTM().inverse(); scara si translatia intr-o singura bucata de
      stare, actualizata atomic (altfel zoom-ul cu ancora citeste offset vechi)
- [x] Masa.tsx — rotunda / patrata / dreptunghiulara, rotatie, semn pentru
      mesele unite, text contra-rotit ca numarul sa ramana orizontal,
      focus + Enter/Space pentru navigare de la tastatura
- [x] ElementStructura.tsx — perete (inclusiv linie franta prin puncte), usa,
      bar, dj, vip, intrare, bucatarie, planta, piscina; etichetele zonelor
      mari se scriu sus, ca mesele desenate peste sa nu le acopere
- [x] LegendaStatus.tsx — Traffic Light System
- [x] src/types/floor-plan.ts — StatusMasa, ElementStructura, MasaHarta
      (Pick din Tables<'tables'>, deci nu poate divergea de schema)
- [x] src/lib/harta-demo.ts + /demo — doua zone, 23 de mese, bara orara
      10:00–23:30 care recalculeaza statusurile (statusul e functie de timp,
      exact ca in DB)
- [x] migratie 20260730120000_slug_demo.sql — 'demo' devine slug rezervat

6.3 Amanat (dependinte reale, nu scapari)

- Sincronizarea realtime a hartii → Faza 5 (subscriptions). Viewer-ul primeste
  deja statusurile ca prop, deci integrarea e o schimbare de sursa de date.
- Widget public /r/:slug: anon NU poate citi zones/tables (RLS). Are nevoie de
  vederi publice (zone_publice, mese_publice) pe modelul restaurante_publice,
  plus un RPC de inserare a rezervarii. Se face in Faza 3/5, impreuna cu
  fluxul de rezervare.
- Editorul de floor plan (Super Admin) → nu e in MVP-ul de restaurant.

---
6bis. FAZA 3: ONBOARDING + INVITATII — ✅ COMPLETATA

Duration: 1 sesiune (Opus 5)

6bis.1 De ce RPC-uri, nu insert-uri din client

Politicile RLS permit scrierea in restaurants doar celui care e DEJA admin al
restaurantului respectiv. Un cont proaspat nu trece — si nu vrem sa slabim
politica, fiindca ar deschide crearea de restaurante oricui. Deci: functii
SECURITY DEFINER care valideaza singure preconditiile.

- migratia 06 (onboarding):
  - slug_disponibil(text) → boolean, apelabila si de anon (verificare live in
    formular), dar nu scurge lista de restaurante
  - creeaza_restaurant(...) → creeaza restaurantul, randul de manager in
    admin_users, o zona "Salon" si cele 4 campuri de sistem ale formularului;
    refuza al doilea restaurant pe acelasi cont (§20.1)
  - detalii_invitatie(token) → doar {restaurant, email, rol, expira_la}, doar
    pentru invitatii active; tabela cu token-uri rămâne inaccesibila anon
  - accepta_invitatie(token) → verifica potrivirea emailului, expirarea si
    unicitatea contului, apoi insereaza in admin_users si marcheaza invitatia
- migratia 07 (drepturi): "revoke ... from anon" din migratiile 05-06 NU avea
  efect — Postgres acorda EXECUTE catre PUBLIC. Corectat cu revoke from public
  + grant explicit. Verificat: anon primeste acum "permission denied for
  function creeaza_restaurant" la nivel de privilegii, nu doar din verificarea
  interna.
- migratia 08 (corectie): stergerea unui restaurant era IMPOSIBILA. Cascada
  ajungea in formular_campuri, iar trigger-ul protejeaza_camp_telefon refuza
  randul 'telefon' indiferent de context. Ar fi blocat stergerea datelor la
  cerere (§22.1) si scoaterea unui cont (§43). Acum protectia se aplica doar
  cat timp restaurantul exista.

6bis.2 Frontend

- src/lib/slug.ts — generator + validator identic cu CHECK-ul din DB;
  transliterare de diacritice (inclusiv formele cu sedila). Testat separat.
- src/services/onboarding.ts, echipa.ts + src/hooks/useEchipa.ts, useDebounce.ts
- /app/onboarding — un pas: identitate + slug verificat live, plan, facturare.
  Sta INTENTIONAT in afara RutaAdmin: aici ajunge contul pe care RutaAdmin il
  respinge. RutaAdmin nu mai arata "cont fara restaurant", ci redirectioneaza.
- /invitatie?token=... — vizibila si neautentificat (trimite la login/signup si
  revine); acoperă cazurile: token lipsa, invalid/expirat, email nepotrivit,
  cont care are deja restaurant
- /app/echipa — manager only (prima folosire reala a RutaManager): invitare cu
  link copiabil, schimbare rol, activare/dezactivare acces
- ruteDupaLogin(null) duce acum in onboarding, nu pe landing

6bis.3 Verificat cap-coada, cu doi utilizatori reali (stersi apoi)

- [x] manager creeaza restaurantul → vede exact 1 restaurant, 1 rand admin,
      zona "Salon", cele 4 campuri de formular
- [x] al doilea restaurant pe acelasi cont → refuzat
- [x] anon nu poate citi staff_invitations (token-urile)
- [x] invitatia nu poate fi acceptata de alt email si nu poate fi refolosita
- [x] dupa acceptare, ospatarul vede restaurantul, echipa si zonele
- [x] ospatarul poate insera clienti, dar NU zone si NU poate modifica
      restaurantul; nu vede invitatiile
- [x] managerul poate ce ospatarul nu poate

Descoperire importanta pentru codul viitor: un UPDATE respins de RLS NU
intoarce eroare — clauza USING filtreaza randul si PostgREST raspunde 200 cu
zero randuri. Serviciile de echipa verifica acum numarul de randuri returnate
si arunca eroare explicita, altfel interfata ar raporta "salvat" degeaba.

6bis.4 Amanat

- Trimiterea automata a emailului de invitatie: nevoie de Edge Function +
  furnizor de email (Resend/Postmark). Pana atunci managerul copiaza linkul.
- Signup pornit din pagina de invitatie nu revine automat la ea dupa
  confirmarea emailului (linkul din email duce in /app → onboarding). Se
  rezolva cand exista emailuri proprii de invitatie.
- Invitatiile de Super Admin (super_admin_invitations) — flux intern, nefolosit
  in MVP.

---
6ter. FAZA 4: PANOU, CALENDAR, LISTA, HARTA LIVE — ✅ COMPLETATA

Duration: 1 sesiune (Opus 5)

6ter.1 Baza de date (migratia 09)

- creeaza_rezervare(...) — SECURITY INVOKER, nu definer: apelantul e deja admin,
  deci politicile RLS rămân active. Nu primeste restaurant_id, il ia din
  current_restaurant_id(), deci nu poate scrie in alt restaurant. Rostul ei e
  sa tina intr-un loc regulile de business: upsert de client pe telefon (§16.1),
  legarea customer_id, iar intervalele rămân treaba trigger-ului existent.
- actualizeaza_crm_client() — nr_vizite / nr_no_show / data_ultima_vizita se
  intretin in baza, la tranzitia de status, nu in client: orice cale (panou,
  widget, job) actualizeaza aceleasi contoare. Un UPDATE care nu schimba
  statusul nu mai numara o vizita.

6ter.2 Frontend

- src/lib/timp.ts — TOATE gruparile pe zi trec prin fusul restaurantului
  (date-fns-tz). Datele sunt instante absolute; "ziua de lucru" e locala, deci
  un restaurant deschis pana la 01:00 nu-si pierde rezervarile.
- src/lib/program.ts — grila de ore vine din restaurants.program_standard
- src/lib/etichete.ts — traducerile enum-urilor, intr-un singur loc
- src/services/rezervari.ts, mese.ts + hooks useRezervari, useMese
- LayoutApp — sidebar (purtatorul celor 30%) + bara de sus + drawer pe mobil
- CalendarPage cu trei vederi:
  - Zi: grila orara, blocuri poziționate pe timp, impachetate in benzi cand se
    suprapun (components/calendar/aranjare.ts). Grupurile de suprapunere se
    inchid separat, altfel o aglomerare la 20:00 ar subtia toata ziua.
  - Saptamana: sapte coloane cu liste compacte — pe coloane inguste blocurile
    proportionale devin ilizibile; personalul vrea "cat de plin e".
  - Luna: grila cu numar de rezervari, acoperiri si cate sunt in asteptare.
- ListaRezervariPage — filtre pe status + caut pe nume/telefon/masa
- HartaPage — harta din Faza 2, alimentata cu date reale: statusul fiecarei
  mese e RECALCULAT pentru ora afisata, cu bara orara din programul zilei.
  Click pe masa libera → walk-in pe ea; pe masa ocupata → rezervarea.
- DialogRezervare — folosit si pentru rezervare si pentru walk-in; mesele libere
  vin din RPC-ul disponibilitate_mese, deci regula de buffer nu se reimplementeaza
- SheetRezervare — confirma / respinge / sosit / neprezentat / anuleaza

Pe calendar apar doar statusurile care ocupa efectiv masa (pending, confirmata,
sosita) — aceleasi pe care le tine table_allocations. Anulatele si respinsele
sunt in lista, cu filtre.

6ter.3 Verificat cu un restaurant real (seed + stergere la final)

- [x] 12 mese, 2 zone, 9 rezervari: calendarul le aseaza corect, 6 suprapuneri
      la 18:45–21:00 in benzi paralele
- [x] harta la 11:46 → 0 mese ocupate; la 20:00 → 4 (2 confirmate, 1 sosita,
      1 pending pe amber), exact cat prezicea intervalul fiecarei rezervari
- [x] lista: toate cele 8 de azi, inclusiv anulata (care NU apare pe calendar)
- [x] creeaza_rezervare pe masa libera → OK; a doua pe aceeasi masa si ora →
      23P01 din constrangerea EXCLUDE, tradus in mesaj romanesc
- [x] clientul se creeaza automat din RPC; sosita → nr_vizite 1; acelasi update
      repetat → tot 1; no_show → nr_no_show 1; alocarea dispare cand rezervarea
      nu mai e activa

Defect prins la verificare: pe fundalurile "-soft" foloseam
text-status-*-foreground, care e proiectat pentru varianta SOLIDA — in dark mode
ieseau texte inchise pe fundal inchis. Regula acum: fundal -soft → text-foreground
(se inverseaza cu tema); fundal solid → text-status-*-foreground.

6ter.4 Amanat

- Drag & drop pe calendar: serviciul mutaRezervare(id, masa/ora) exista si e
  testat prin RLS, dar interactiunea de tragere nu e implementata.
- Walk-in fara telefon: reservations.telefon e NOT NULL (§16.1). Daca spec §25.6
  chiar vrea walk-in anonim, e nevoie de o decizie in baza de date (coloana
  nullabila sau valoare sintetica) — nu inventam date in interfata.
- Vederea pe mese (timeline per masa) si prelungirea rezervarii direct din harta.

---
6quater. FAZA 5: REALTIME, WIDGET PUBLIC, NOTIFICARI — ✅ COMPLETATA

Duration: 1 sesiune (Opus 5)

6quater.1 Widget public (migratia 10)

RLS interzice — corect — unui vizitator anonim sa citeasca zones, tables sau
floor_plan_layers. Widgetul are nevoie de trei lucruri, deci am adaugat trei
vederi cu coloane alese explicit, pe modelul restaurante_publice:
  - zone_publice      — doar zonele active ale restaurantelor active
  - mese_publice      — fara mesele inactive/indisponibile: ce nu se poate
                        rezerva nu se arata deloc
  - structura_publica — Layer 1 doar daca e publicat si vizibil
Niciun tabel de baza nu a primit politica noua.

- este_deschis(restaurant, instant) — programul standard + excepțiile (§30.2),
  evaluat in BAZA. Fara asta, un apel direct la API putea aseza o rezervare
  la 04:00.
- rezerva_public(...) — SECURITY DEFINER cu suprafata minima: primeste slug, nu
  restaurant_id, si NU accepta table_id, status sau note interne (alocarea mesei
  rămâne decizia personalului). Valideaza: GDPR obligatoriu (§22.1), interval
  viitor, maximum 6 luni inainte, 1–50 persoane, program deschis si o limita de
  5 cereri / 24h de la acelasi telefon. Statusul rezultat respecta
  restaurants.aprobare_automata (§7.1).

6quater.2 Notificari (migratiile 11 si 12)

Enum-urile existau din migratia 01, tabela nu. Doua decizii:
  - Nu exista politica de INSERT: notificarile se creeaza EXCLUSIV din trigger.
    Altfel oricine cu cheia anon ar putea umple clopotelul unui restaurant.
  - Se genereaza doar pentru sursa 'widget'. Un ospatar care introduce o
    rezervare nu are nevoie sa fie anuntat de propria acțiune.
Galben = cere o decizie umana (cerere in asteptare), albastru = informativ.

6quater.3 Realtime

reservations avea deja "replica identity full" din migratia 04; lipsea doar
publicatia. Postgres Changes respecta RLS, deci fiecare restaurant primeste
numai evenimentele lui. useRealtimeRestaurant invalideaza cache-ul in loc sa
aplice randul primit peste el: o rezervare mutata atinge doua intervale, iar
reconstrucția locala ar putea divergea de baza.

6quater.4 Verificat cap-coada

- [x] anon citeste cele patru vederi publice, dar primeste [] pe restaurants,
      zones, tables, floor_plan_layers, reservations si notificari
- [x] masa indisponibila si layer-ul nepublicat NU apar in vederile publice
- [x] rezerva_public respinge: fara GDPR, in trecut, la 04:00, 60 de persoane,
      slug inexistent; a 6-a cerere de la acelasi numar in 24h
- [x] cerere valida → status 'pending' (restaurantul avea aprobare manuala),
      client creat in CRM cu consimtamant, notificare galbena necitita,
      ZERO alocari de masa (widgetul nu blocheaza mese)
- [x] managerul isi vede notificarile si le poate marca citite (5 → 4)
- [x] widgetul preia culoarea de accent a restaurantului prin --primary

Defect prins la primul apel real (migratia 12): trigger-ul de notificare
folosea un CASE care producea text, iar Postgres NU converteste implicit text
in enum intr-un INSERT ... VALUES. Rezultatul: eroare 42804 care anula toata
tranzacția, adica ORICE rezervare din widget. Valorile de enum se calculeaza
acum in variabile tipizate.

6quater.5 Ce mai lipseste pentru MVP complet

- Emailuri (confirmare rezervare, invitatie personal): Edge Function + furnizor
  (Resend/Postmark). Singura piesa care cere infrastructura noua.
- Pagina de setari restaurant (program, buffer, durata, formular, branding) —
  datele exista deja in baza, lipseste interfata.
- Drag & drop pe calendar (serviciul mutaRezervare e gata si testat).
- Panoul Super Admin (§43) si editorul de floor plan.
- Incadrare automata a hartii pe conținut: intr-o sala cu putine mese, canvasul
  de 1200x800 lasa mult spatiu gol. Verificat ca randarea e corecta
  matematic (scara 0.395, mese de 33 px la pozițiile aşteptate), deci e o
  imbunatatire de UX, nu un defect.

---
6quinquies. PAGINA DE SETARI RESTAURANT — ✅ COMPLETATA

/app/setari, doar pentru manager (RutaManager). Datele existau deja in baza;
lipsea interfata.

- Identitate si contact + linkul public de rezervare, copiabil. Slug-ul NU e
  editabil de aici: linkurile deja distribuite ar deveni invalide.
- Reguli de rezervare: aprobare automata, durata implicita, buffer, scaune
  maxim pe masa. Limitele din zod oglindesc exact CHECK-urile din schema.
- Butonul de verificare a buffer-ului foloseste RPC-ul verifica_conflicte_buffer,
  prevazut in migratia 04 exact pentru asta: arata ce suprapuneri ar apărea cu
  valoarea noua, precizand ca schimbarea NU e retroactiva.
- Program de functionare pe sapte zile (jsonb program_standard) — aceeasi sursa
  pe care o citesc calendarul, harta si widgetul public.
- Culoare de accent (aplicata in widget) si retentia datelor (GDPR).

Verificat in browser, cu date reale: pagina se incarca cu valorile din baza; am
schimbat numele, buffer-ul (15 → 25), durata (120 → 150) si ora de deschidere de
luni (10:00 → 11:30). Toate au ajuns in baza, antetul s-a actualizat imediat
(reincarcaProfil), iar celelalte zile au rămas neatinse.

Verificat si ca baza respinge singura valorile invalide, daca interfata ar fi
ocolita: buffer 90, durata 300, 40 de scaune, retentie 20 de ani, culoare
"verde" si slug rezervat "app" — toate refuzate de CHECK-uri sau de trigger.
Mesajele lor sunt acum traduse in lib/erori.ts.

---
6sexies. EMAILURI TRANZACTIONALE — ✅ IMPLEMENTATE (furnizor opțional)

Edge Function `trimite-email`, desfasurata pe proiect (v1, ACTIVE).

Decizia care da forma functiei: clientul NU trimite niciodata destinatarul sau
conținutul, doar {tip, id}. Functia citeste randul cu JWT-ul apelantului, deci
prin RLS — cine nu are dreptul sa vada invitatia sau rezervarea nu poate nici
declansa un email despre ea. Endpoint-ul nu poate fi folosit ca releu de spam.

Furnizorul e opțional. Fara RESEND_API_KEY functia raspunde 200 cu
{simulat: true} si logheaza ce ar fi trimis; interfata cade elegant pe
"copiaza linkul" la invitatii. Conectarea unui furnizor real e doar:
  supabase secrets set RESEND_API_KEY=...
  supabase secrets set EMAIL_EXPEDITOR="TableX <rezervari@domeniu.ro>"
  supabase secrets set URL_APLICATIE=https://app.tablex.ro
(vezi si .env.example, care le documenteaza)

Declansatoare implementate:
- invitatie de personal — la crearea invitatiei din /app/echipa
- rezervare confirmata / respinsa — la schimbarea statusului din panou, doar
  daca rezervarea are adresa de email

Trimiterea e best-effort prin design: un email care nu pleaca nu anuleza
acțiunea care l-a declansat (invitatia exista deja, rezervarea e deja
confirmata). Serviciul din client nu arunca niciodata.

Verificat pe functia desfasurata, cu doua restaurante separate:
- [x] managerul declanseaza cele trei tipuri pentru datele LUI → 200, simulat,
      cu destinatarul si subiectul corecte
- [x] acelasi manager, cu id-ul unei rezervari din ALT restaurant → 404
- [x] doar cu cheia anon (fara sesiune) → 404 pe tot
- [x] cerere fara id → 400; id inexistent → 404 (acelasi mesaj ca la refuz, ca
      functia sa nu devina un oracol pentru id-uri valide)

Ce NU acopera, cu motivul:
- Emailul "am primit cererea ta" trimis clientului direct din widget: apelantul
  ar fi anonim, iar RLS (corect) nu-i da acces la rezervare. Are nevoie de un
  webhook de baza de date sau de un apel cu service_role dintr-un trigger.
  Sablonul exista deja in functie ('rezervare_noua'), gata de conectat.
  Pana atunci, clientul e anuntat la confirmare — momentul care conteaza.

---
6septies. MUTAREA REZERVARILOR PE CALENDAR — ✅ IMPLEMENTATA

In vederea pe zi, un bloc se trage vertical ca sa schimbe ora (pas de 15
minute), sau se muta de la tastatura cu Shift + sus/jos. Mutarea trece prin
acelasi UPDATE ca restul aplicatiei: trigger-ul recalculeaza intervalul, iar
constrangerea EXCLUDE respinge suprapunerile.

Trei defecte reale, toate gasite prin testare, nu prin citirea codului:

1. Delta se calcula din clientY (relativ la fereastra). Daca pagina deruleaza
   in timpul tragerii — si un calendar inalt deruleaza des, mai ales pe touch —
   clientY se schimba fara ca degetul sa se miste, iar rezervarea ajungea in
   alta parte decat unde fusese trasa. Acum se foloseste pageY.
2. Handler-ul de pointermove citea starea React ca sa afle daca un gest e in
   curs. La o tragere scurta, cu un singur pointermove, setState-ul nu era inca
   vizibil, deci gestul era interpretat ca un simplu click. Sursa de adevar e
   acum ref-ul; starea a rămas doar pentru previzualizare.
3. Un pointerup din alta secventa confirma o mutare. S-a intamplat concret:
   dupa un hot-reload cu butonul mouse-ului inca apasat, doua rezervari s-au
   mutat singure. Gestul e acum legat de pointerId-ul care l-a inceput.

Verificat:
- [x] calea de tastatura, cap-coada in browser: 16:00 → 16:15, cu mesajul
      „Rezervare mutata la 16:15." si valoarea persistata
- [x] prima tragere reusita a persistat 14:00 → 16:00, cu se_termina_la si
      blocat_pana_la recalculate de trigger si alocarea de masa sincronizata
- [x] acelasi UPDATE pe un interval ocupat → 23P01 din constrangerea EXCLUDE
      (mesajul e tradus in lib/erori.ts); pe un interval liber → 204

RAMAS DE VERIFICAT MANUAL: tragerea cu mouse-ul, de la un cap la altul.
Instrumentul de drag din CDP emite evenimente HTML5 de drag, nu o secventa de
pointer, deci nu exercita acest handler; iar browserul din harness derivă intre
apeluri, ceea ce face imposibila o secventa sintetica lunga. Aritmetica e simpla
si acum protejata, dar nu am o dovada directa pentru gestul cu mouse-ul.

---
6octies. PANOU SUPER ADMIN (§43) — ✅ IMPLEMENTAT

6octies.1 O gaura de securitate gasita la construirea panoului

Politica "restaurants_actualizare_manager" (migratia 05) permite managerului sa
modifice ORICE coloana a restaurantului sau — o politica RLS nu poate restrange
coloane. Deci, cu un simplu apel REST, un manager putea:
  - sa treaca singur pe planul pro_floor
  - sa-si acorde discount sau sa-si prelungeasca perioada de proba
  - sa-si deblocheze floor plan-ul
  - sa-si scoata restaurantul din suspendare si sa stearga motivul
  - sa schimbe slug-ul, invalidand linkurile deja distribuite clientilor
Interfata nu oferea niciuna dintre acestea, dar API-ul e public.

Migratia 13 rezolva prin trigger (un CHECK nu vede cine face modificarea, iar
politici pe coloane nu exista in Postgres): coloanele privilegiate sunt refuzate
cu 42501 pentru oricine nu e in echipa TableX. Verificat pe toate cele sase
cazuri, inclusiv auto-desuspendarea cu restaurantul chiar suspendat.

6octies.2 Audit care nu poate fi ocolit

Enum-ul audit_actiune exista din migratia 01, tabela nu. Acum exista, iar
scrierea se face din trigger, nu din client: orice cale de modificare (panou,
REST, job viitor) lasa urma, cu autor, email si valori inainte/dupa. Nicio
politica de INSERT — la fel ca pentru notificari.

6octies.3 Panoul

/superadmin, cu trei tab-uri:
- Restaurante: cautare, schimbare plan, deblocare floor plan, suspendare /
  banare (dialog cu motiv obligatoriu, impus si de trigger) si reactivare
- Setari globale: preturi, mod mentenanta cu mesaj, retentie implicita. Doar
  rolul super_admin propriu-zis poate scrie; support si designer_architect
  vad datele dezactivate (§9.2.7).
- Registru: ultimele intervenții, cu autor si detalii

Verificat cu doi utilizatori reali (manager + echipa):
- [x] auditul e citibil de echipa, dar intoarce [] pentru manager si anon
- [x] echipa suspenda doar cu motiv; fara motiv → refuz din baza
- [x] fiecare intervenție a aparut in registru cu autorul corect
- [x] scrierea in app_settings de catre manager afecteaza ZERO randuri
      (RLS filtreaza; PostgREST raspunde 204/200 cu lista goala, iar serviciul
      verifica numarul de randuri si arata eroare explicita)

6octies.4 Ramas

- Coada de cereri floor plan (§41): tabela si RLS exista, lipseste ecranul.
- Prelungirea trialului si discountul: coloanele si auditul sunt gata, in panou
  lipsesc controalele (sunt doua campuri, nu o functionalitate noua).

---
6nonies. COADA DE CERERI FLOOR PLAN (§41) — ✅ IMPLEMENTATA

Bucla completa: restaurantul cere un plan 2D → echipa vede cererea in coada →
schimba statusul → restaurantul afla. Tabela si RLS existau din migratia 03;
lipseau fluxul, ecranele si notificarile.

- Restaurant (in Harta salii): formular cu numele zonei si descriere, plus lista
  cererilor proprii cu status. Planul NU se deseneaza de restaurant (§8.4).
- Echipa (/superadmin, tab "Cereri plan", cu contor de cereri in asteptare):
  preia in lucru → marcheaza publicat, sau respinge.
- Migratia 14: notificari in ambele sensuri, scrise din trigger. Cererea noua
  merge la destinatie 'super_admin' (deci cu restaurant_id NULL — notificarea
  aparține echipei); schimbarea de status merge la restaurant, galben pentru
  „in lucru" si albastru pentru „publicat".
- Serviciul nu selecteaza niciodata ai_rezultat: e instrument intern (§14) si nu
  trebuie sa ajunga nici accidental in bundle-ul restaurantului.

Doua defecte, ambele prinse la testare (migratia 15):

1. Acelasi CASE-care-produce-text intr-o coloana enum ca in migratia 12 —
   REINTRODUS de mine in 14, desi regula era scrisa in comentariul din 12.
   Rezultat: 42804 la orice schimbare de status, adica toata coada echipei era
   blocata. Acum valorile de enum stau in variabile tipizate.
2. Politica operationala a tabelei permitea restaurantului sa modifice ORICE
   coloana a cererii lui, deci managerul isi putea trece singur cererea pe
   „published". Verificat inainte de corectie: 1 rand modificat. Acum statusul,
   ai_rezultat, procesat_de si assigned_to sunt rezervate echipei.

Verificat cap-coada, cu manager + membru al echipei:
- [x] cererea creata de manager genereaza notificarea echipei; managerul NU o
      vede in clopotelul lui (destinatie diferita)
- [x] echipa muta cererea in_progress → published (204)
- [x] managerul primeste 403 pe status si pe ai_rezultat, dar poate corecta
      descrierea propriei cereri (204)
- [x] restaurantul primeste ambele notificari, cu urgentele corecte

6decies. INCARCAREA SCHITEI (Storage) — ✅ IMPLEMENTATA

Bucket privat "schite", cu izolare pe FOLDER: prima parte a caii e
restaurant_id, iar politicile compara acel folder cu current_restaurant_id().
Calea nu e un secret — accesul e verificat pe server.

- In coloana schita_image_url se salveaza CALEA, nu un URL: URL-urile semnate
  expira, deci un URL stocat ar deveni inutil. Se semneaza la afisare (o ora).
- Schita se incarca INAINTE de a crea cererea: daca incarcarea cade, nu rămâne
  o cerere fara imaginea pe care utilizatorul credea ca a trimis-o.
- Limitele (5 MB, PNG/JPG/WEBP/HEIC/PDF) sunt pe bucket, deci pe server;
  validarea din formular e doar pentru mesaj.

Verificat cu doua restaurante:
- [x] managerul incarca in folderul lui (200), dar e refuzat in folderul altui
      restaurant si in radacina bucket-ului
- [x] managerul citeste doar fisierele lui; echipa TableX citeste orice
- [x] anon: refuzat atat la incarcare cat si la citire
- [x] stergerea din folderul propriu functioneaza prin API (Storage interzice
      stergerea directa din SQL, prin protect_delete — util de stiut pentru
      scripturile de curatenie)

---
6undecies. EMAIL DE PRIMIRE DIN WIDGET, TRIAL/DISCOUNT, SCHITA IN COADA — ✅

Ultimele trei piese ramase din §6quater.5 si §6octies.4.

6undecies.1 Emailul "am primit cererea ta" (migratiile 16 si 17)

Piesa care lipsea din §6sexies: functia `trimite-email` citeste rezervarea cu
JWT-ul apelantului, deci prin RLS — corect, altfel ar fi releu de spam. Dar
clientul widgetului e ANONIM si prin RLS nu-si vede propria rezervare, deci
apelul nu putea porni din browserul lui. Acum il porneste baza, dupa commit,
printr-un trigger pg_net pe `reservations`.

Autentificarea apelului — de ce NU service_role in baza (ce face varianta
"Database Webhooks" din dashboard): acea cheie deschide toata baza, iar aici e
nevoie de exact o capabilitate. Deci trigger-ul trimite un secret propriu de
256 de biti, generat in baza, iar functia il valideaza inapoi prin RPC-ul
`verifica_secret_webhook` (raspunde doar da/nu). Scurgerea lui nu da acces la
date, iar rotirea e un `vault.update_secret`, fara redesfasurarea functiei.
Bonus practic: nu depinde de `supabase secrets set` — Edge Function-ul primeste
SUPABASE_SERVICE_ROLE_KEY automat de la platforma.

Configurarea sta in Vault (trei secrete, vezi .env.example). Daca lipseste
oricare, trigger-ul iese in tacere: rezervarea merge mai departe fara email,
exact ca atunci cand nu e conectat niciun furnizor.

In functie, tipul 'rezervare_noua' e rezervat webhook-ului: un apelant obisnuit
primeste 403, iar webhook-ul nu poate cere alt tip.

Defect prins de advisor, imediat dupa migratia 16 (corectat in 17):
ACEEASI greseala ca in migratia 05, pe care 07 o corectase deja — "revoke
execute from public" NU sterge drepturile acordate EXPLICIT rolurilor, iar
Supabase acorda din default privileges EXECUTE catre anon si authenticated pe
orice functie noua din public. Rezultat: `verifica_secret_webhook` era apelabila
cu cheia anon, adica un ORACOL pentru ghicirea secretului. Verificat dupa
corectie: anon primeste 42501 la nivel de privilegii.
(Al doilea avertisment, minor: pg_net ajunsese in schema `public`. Nu suporta
ALTER EXTENSION ... SET SCHEMA, deci recreat in `extensions`; functiile lui
rămân oricum in schema `net`.)

Verificat cap-coada, pe functia desfasurata (v2):
- [x] rezervare reala din widget, ca ANON → trigger → 200, cu destinatarul si
      subiectul corecte, in mod simulat (fara furnizor conectat)
- [x] rezervare din PANOU (sursa 'manual') → ZERO apeluri
- [x] rezervare din widget FARA email → ZERO apeluri
- [x] anon cere 'rezervare_noua' fara secret → 403
- [x] secret gresit → 401; secret prea scurt → 401
- [x] tot lantul retestat DUPA corectia de drepturi si mutarea pg_net

6undecies.2 Trial si discount in panou

Coloanele si auditul erau gata din migratia 13; lipseau doar controalele.
Dialog "Comercial" per restaurant (data de trial + procent), plus o coloana
care arata valorile curente. Limitele din interfata oglindesc CHECK-ul din
schema (0–100), ca peste tot.

Verificat in browser, cu date reale: discount 25% si trial pana la 15 oct. 2026
au ajuns in baza, celula s-a actualizat, iar ambele au aparut in registru cu
autorul corect (`extend_trial` si `discount`). Verificat si ca managerul
primeste 42501 pe ambele coloane prin REST, dar poate schimba numele (204).

6undecies.3 Schita in coada echipei

Bucket-ul e privat, deci nu exista URL permanent: se semneaza la afisare, o ora,
si se reimprospateaza la 50 de minute — altfel linkul expira sub degetul cuiva
care tine coada deschisa. Imaginile se arata ca miniatura, PDF-urile ca link.
Coada arata acum si RESTAURANTUL care a trimis cererea: fara el, cererea nu
inseamna nimic — planul se deseneaza pentru o sala anume. Statusurile se
traduceau doar in panoul restaurantului; eticheta s-a mutat in lib/etichete.ts
si acum coada nu mai arata valoarea bruta din enum.

Verificat in browser, cu manager + membru al echipei: schita incarcata de
manager se randeaza in coada (120×80, exact fisierul incarcat), cererea fara
schita arata "—", iar incarcarea in folderul altui restaurant e refuzata.

---
6duodecies. EDITORUL DE FLOOR PLAN (§8.4) — ✅ LAYER 2

Piesa care tinea bucla deschisa: coada de cereri permitea marcarea unei cereri
ca "publicat", dar NU exista nicio unealta care sa deseneze planul. Singura cale
de a crea geometria unei sali era SQL direct in baza — iar harta, calendarul si
widgetul public depind toate de ea.

/superadmin/editor/:restaurantId, doar pentru echipa TableX. RLS-ul era deja
pregatit (ALL pe zones/tables/floor_plan_layers pentru is_super_admin), deci
editorul e pur frontend — nicio politica noua.

6duodecies.1 Ce acopera si ce nu

Aceasta versiune acopera Layer 2 — zone si mese — adica exact ce au nevoie
rezervarile, harta si widgetul ca sa functioneze pentru un restaurant nou.
Layer 1 (pereti, bar, intrare, DJ) se tine in floor_plan_layers.continut si
URMEAZA separat: e decor, nu functionalitate. Editorul il deseneaza deja daca
exista, dar nu il editeaza.

- EditorZona.tsx — canvas SVG propriu, nu HartaZona: viewer-ul rămâne curat,
  fiindca e folosit si in widgetul public. Reutilizeaza Masa si
  ElementStructura pentru desen.
- Tragere cu mouse-ul, aliniere la grid, limitare in canvas. De la tastatura:
  sageti = un pas de grid, Shift + sageti = un pixel.
- Panou de proprietati: numar, locuri, forma, latime/inaltime, rotatie, activa.
- Zona: nume, dimensiuni canvas, pas grid, activa, stergere.

Aici clientX/clientY sunt CORECTE, spre deosebire de calendar (unde a trebuit
pageY): getScreenCTM() lucreaza tot in spatiul clientului, deci derularea
paginii se anuleaza de ambele parti ale transformarii.

6duodecies.2 Patru defecte reale, toate gasite la testare

1. NUMEROTAREA MESELOR se calcula din starea React si pe ZONA. Doua greseli
   intr-o bucata de cod: constrangerea e UNIQUE (restaurant_id, numar_masa) —
   pe restaurant, nu pe zona — iar cinci asezari rapide una dupa alta calculau
   toate acelasi numar dintr-un cache nereimprospatat. Verificat: din 3 mese
   asezate rapid se crea UNA. Acum numarul se calculeaza in serviciu, din baza,
   cu reincercare la 23505. Reverificat: 5 asezari rapide → 5 mese, numere 1-6.

2. releasePointerCapture ARUNCA daca pointerul nu mai e capturat, iar apelul era
   INAINTEA comiterii mutarii — deci exceptia abandona mutarea si lasa masa
   blocata in pozitia de previzualizare. Se manifesta la pointercancel, unde
   browserul a eliberat deja captura. Acum: curatam starea, apoi eliberam
   captura in try/catch, apoi comitem.

3. STERGEREA RUPEA REZERVARI. Cheile straine sunt permisive cu buna stiinta
   (table_allocations CASCADE, reservations.table_id SET NULL, tables.zone_id
   CASCADE), deci un DELETE pe o masa desprindea tacit rezervarile viitoare:
   raman in baza, fara masa, fara niciun mesaj. Pana acum nu conta — nimic din
   interfata nu stergea geometrie. Migratia 18 pune garda in BAZA, nu in
   interfata, din acelasi motiv ca la coloanele privilegiate: API-ul e public.

4. ...IAR GARDA A BLOCAT STERGEREA RESTAURANTULUI — aceeasi clasa de defect ca
   in migratia 08, reintrodusa de mine. Cascada restaurant → zone → tables
   aprindea garda in mijlocul ei si anula toata tranzactia, adica exact
   stergerea datelor la cerere (§22.1) si scoaterea unui cont (§43). Migratia 19
   aplica solutia din 08: garda se aplica doar cat timp PARINTELE exista;
   absenta lui e semnalul ca decizia a fost luata mai sus.
   A doua corectie in 19: garda pe zona numara doar reservations.zone_id, dar o
   rezervare poate avea table_id completat si zone_id gol — acum numaram si
   rezervarile legate de mesele zonei.

6duodecies.3 DEFECT DE APLICATIE gasit pe drum: erorile din baza nu ajungeau
la utilizator

Cel mai valoros lucru gasit in aceasta sesiune, si nu are legatura cu editorul.

`mesajEroare` incepea cu `eroare instanceof Error`. Dar erorile PostgREST NU
sunt instante de Error — supabase-js le intoarce ca obiecte simple
{message, details, hint, code}. Deci `brut` rămânea gol si ORICE eroare venita
din baza ajungea la utilizator ca „A aparut o eroare neasteptata":
  - mesajele CHECK-urilor (buffer, durata, scaune, retentie, culoare, slug)
  - conflictul EXCLUDE de la double-booking
  - refuzurile RLS si cele scrise anume in triggere
Toate erau scrise cu grija si niciunul nu se vedea vreodata.

Verificat direct: obiectul are `constructor: "Object"`, `esteError: false`, dar
`message` corect completat. Dupa corectie, acelasi flux arata mesajul real al
bazei. Numele constrangerilor apar adesea in `details`, nu in `message`, deci
cautam acum in message + details + hint — altfel tiparele existente rateaza.

6duodecies.4 Verificat cap-coada, in browser, cu date reale

- [x] zona creata din dialog; 6 mese asezate prin clic pe canvas, la pozitiile
      exacte cerute
- [x] tragere cu POINTER REAL: (200,160) → colt brut (477,353) → aliniat
      (480,360), exact cat prezicea aritmetica. Prima tragere verificata cu o
      secventa de pointer completa in acest proiect.
- [x] tastatura: 480 → 500 (pas de grid), 360 → 361 (Shift)
- [x] capacitate 4 → 6 salvata din panou
- [x] numar duplicat → mesaj romanesc, nu eroare bruta din Postgres
- [x] stergerea mesei cu rezervare viitoare → refuzata, cu mesajul bazei afisat
      in interfata
- [x] stergerea zonei → refuzata; stergerea restaurantului → REUSITA
- [x] BUCLA INCHISA: planul desenat de echipa apare in vederile publice
      (zone_publice, mese_publice) pentru un vizitator ANONIM, in timp ce
      zones si tables raman [] pentru el

---
6terdecies. EDITORUL — LAYER 1 (STRUCTURA SALII) — ✅

A doua jumatate a editorului: pereti, usi, bar, DJ, VIP, intrare, bucatarie,
plante, piscina. Cu asta echipa poate desena o sala intreaga din schita primita,
nu doar sa presare mese pe un fundal gol.

6terdecies.1 Unde stau datele si ce decurge de aici

Structura NU are tabela proprie: e un array jsonb in floor_plan_layers.continut,
cu UNIQUE (zone_id, tip). Deci o zona are exact un layer1, iar orice schimbare
rescrie tot randul. Doua consecinte de proiectare:

- Elementele se identifica prin INDICE in array, nu prin id. La stergere
  indicii se decaleaza, deci selectia se goleste — altfel panoul ar arata alt
  element decat cel evidentiat.
- Doi membri ai echipei care deseneaza aceeasi sala si-ar suprascrie tacit
  munca, ultimul castigand tot. Coloana `versiune` exista din migratia
  floor_plan si nu era folosita nicaieri — e exact instrumentul potrivit:
  scriem cu `.eq('versiune', versiuneCitita)` si tratam zero randuri ca un
  conflict, nu ca o reusita.

Salvarea intoarce starea NOUA, pe care o punem direct in cache. Daca am astepta
o reimprospatare, doua modificari rapide (doua apasari de sageata) ar pleca
amandoua cu versiunea veche, iar a doua ar raporta un conflict inexistent.

6terdecies.2 Un singur strat editabil odata

Mesele se deseneaza PESTE structura, deci un canvas care asculta ambele straturi
ar avea un test de lovire ambiguu: clicul pe un bar aflat sub o masa ar nimeri
mereu masa. Comutatorul Mese / Structura face stratul inactiv
`pointer-events-none` si il estompeaza, deci rămâne reper vizual fara sa fure
interactiunea.

Sabloanele de dimensiuni sunt per tip (un perete e 400x20, o planta 60x60):
daca toate ar aparea la aceeasi marime, fiecare asezare ar cere doua
redimensionari inainte de a fi utila.

Pereti in linie franta (`puncte`): ElementStructura ii deseneaza deja, dar
editorul nu ii creeaza — un perete dreptunghiular acopera nevoia de a inchide
o sala. Ramane daca apare cazul real.

6terdecies.3 Publicarea

Vederea structura_publica cere `tip='layer1' AND publicat AND vizibil AND
restaurant activ`. Cele doua comutatoare sunt separate cu rost: `vizibil` e
pentru lucrul intern (ascunzi structura ca sa asezi mesele), `publicat` e
decizia de a o arata clientilor. Mesele NU depind de asta — ele sunt randuri in
`tables` si se publica prin `activa`.

6terdecies.4 Verificat cap-coada, in browser

- [x] doua elemente asezate prin clic; randul de layer creat, versiune 1 → 2
- [x] tragere cu POINTER REAL a unui perete: (100,100) → (420,300), exact
      alinierea prezisa la grid
- [x] redimensionare din panou: latime 400 → 600
- [x] publicare → structura ajunge la vizitatorul ANONIM prin structura_publica,
      in timp ce floor_plan_layers ii ramane []
- [x] BLOCAJUL OPTIMIST: cu versiunea umflata din SQL (alt editor), salvarea din
      interfata a fost respinsa, datele au ramas neatinse (latime tot 600), iar
      utilizatorul a primit „Planul a fost modificat intre timp de altcineva"
      in loc sa piarda tacit munca celuilalt
- [x] stergerea unui element (2 → 1) si depublicarea → structura_publica [] 

Nota de testare, utila pentru urmatoarea sesiune: cand simulezi clicuri pe SVG,
recalculeaza getScreenCTM() la FIECARE eveniment. Prima mea incercare l-a
memorat o data, iar panoul de proprietati aparut intre clicuri a mutat layoutul
— al doilea element a cazut cu 100px mai sus decat cerusem. Aplicatia il
recalculeaza corect; testul era cel gresit.

---
6quaterdecies. PLASA DE SIGURANTA SI PUNCTELE RAMASE — ✅

6quaterdecies.1 Teste (71) si CI — cea mai mare gaura de pana acum

Pana aici nu exista niciun test. Tot ce s-a verificat s-a verificat manual, o
data, iar aplicatia are multe reguli care nu arunca erori cand se strica: dau
doar rezultatul gresit. `npm test` (vitest), `npm run test:watch`.

Acoperite intai cele in care o greseala e INVIZIBILA:
- erori.ts — regresia care ascundea toate mesajele bazei. Primul test din
  fisier exista ca sa nu revina.
- timp.ts — testele ruleaza cu TZ=UTC iar restaurantul e la Bucuresti, deci o
  confuzie intre fusul masinii si cel al restaurantului pica imediat.
- aranjare.ts — invariantul ca doua rezervari suprapuse nu ajung niciodata pe
  aceeasi banda.
- slug.ts — invariantul ca generatorul nu produce niciodata ceva ce CHECK-ul din
  baza refuza; ambele forme Unicode ale lui s/t.
- geometrie-plan.ts — aritmetica editorului, scoasa din componenta ca sa poata
  fi testata fara DOM.
- program.ts, validari.ts.

CI in .github/workflows/verificari.yml: testele si build-ul blocheaza, lint-ul
e informativ (cele 5 erori din components/ui sunt cod shadcn, §5.1.1).

6quaterdecies.2 Incadrarea automata a hartii

Ultimul punct din §6quater.5. Canvasul e 1200x800 implicit, dar o sala cu
putine mese le poate avea pe toate intr-un colt. Incadrarea pastreaza raportul
canvasului — fara asta, o sala lunga si ingusta ar fi intinsa de
preserveAspectRatio si mesele rotunde ar parea ovale.
Verificat prin widgetul public: doua mese intr-un colt dau viewBox
"60 46.67 280 186.67" in loc de "0 0 1200 800"; sala demo (plina) ramane la fel.

6quaterdecies.3 Walk-in fara telefon (§25.6) — decizia luata

Era lasat deschis fiindca cerea o decizie in baza. Am ales: telefonul devine
optional NUMAI pentru walk-in, impus printr-un CHECK.

Motivul pentru care NU am folosit o valoare sintetica: `customers` e unic pe
(restaurant_id, telefon), deci un "0000000000" folosit de doua ori ar contopi
doi oameni fara legatura intr-un singur client, cu nr_vizite umflat. Datele de
CRM ar fi devenit minciuni, tacut. Un walk-in fara telefon nu primeste deloc
customer_id: un oaspete anonim nu e o fisa de CRM.

Verificat pe ambele cai (INSERT direct si RPC): walk-in fara numar trece,
manual si widget refuzate, doi oaspeti anonimi lasa CRM-ul gol iar cel cu numar
isi primeste fisa.

6quaterdecies.4 Signup din invitatie (amanat in §6bis.4)

Se putea rezolva abia dupa ce au existat emailuri proprii. Acum linkul din
emailul de confirmare se intoarce la invitatie, nu in /app.

Pe drum am gasit si o problema de formular pe care planul nu o notase: pagina
de signup cerea NUMELE RESTAURANTULUI si celui invitat, desi el intra in echipa
unuia existent. Campul e ascuns cand se vine dintr-o invitatie.

Verificat in browser: descrierea se schimba, campul dispare, iar cererea de
signup pleaca cu redirect_to = /invitatie?token=...

6quaterdecies.5 Ce NU s-a putut face si de ce

- Furnizorul de email ramane neconectat: cere un cont Resend si un domeniu
  verificat, adica o decizie si niste credentiale care nu sunt in codul asta.
  Totul e scris si testat; conectarea e `supabase secrets set RESEND_API_KEY=...`
  Pana atunci functia raspunde 200 cu {simulat: true}.
- Tragerea cu mouse-ul pe CALENDAR ramane neverificata (§6septies). In editor
  am verificat-o cu o secventa reala de pointer; la calendar instrumentul emite
  evenimente HTML5 de drag, care nu trec prin acel handler.

---
6quindecies. PAGINA DE CLIENTI (CRM, §16) — ✅

Gaura cea mai mare ramasa, si nu era in nicio lista: ruta `appClienti`
('/app/clienti') exista in lib/rute.ts inca din Faza 1c, dar nu avea pagina, nu
era inregistrata in router si nu aparea in meniu. Tabela `customers` se umplea
singura la fiecare rezervare — nume, vizite, neprezentari, ultima vizita — si
nimeni nu putea vedea nimic din ea.

Fisele NU se creeaza din pagina: apar din RPC-ul de rezervare, cu telefonul
drept cheie, iar contoarele le intretine trigger-ul de la tranzitia de status.
Personalul scrie exact doua lucruri pe care baza nu le stie: note si etichete.
Contoarele raman ale trigger-ului, ca sa nu poata fi falsificate din interfata.

Lista exclude randurile arhivate si pe cele contopite (merged_into_id): un
client contopit e acelasi om, iar afisarea ambelor ar dubla statisticile.

Pagina e vizibila SI ospatarului, nu doar managerului: el are nevoie sa stie ca
oaspetele care intra pe usa are 12 vizite sau 3 neprezentari. Doar stergerea
datelor e rezervata managerului.

6quindecies.1 Stergerea la cerere, facuta cinstit (§22.1) — migratia 22

Descoperirea care a dat forma functionalitatii: `reservations` pastreaza COPII
ale datelor personale (client_nume, telefon, email, note_client), iar
reservations.customer_id e ON DELETE SET NULL. Deci un buton "sterge clientul"
ar fi sters fisa si ar fi lasat numele si telefonul persoanei in FIECARE
rezervare a ei — adica exact promisiunea pe care GDPR o cere, incalcata tacit.

Copiile nu sunt o greseala: rezervarea trebuie sa rămână lizibila si dupa ce
fisa dispare. Solutia e anonimizare, nu stergere: inregistrarea de business
(data, numar de persoane, masa, status) supravietuieste pentru statistici, dar
tot ce identifica persoana dispare, iar `anonimizat_la` ramane ca dovada.

A cerut o coloana noua tocmai pentru ca CHECK-ul din migratia 20 cere telefon
not null pentru orice nu e walk-in; fara a treia cale, rezervarile din widget —
tocmai cele cu clienti identificabili — n-ar fi putut fi anonimizate.

Operatia e un RPC, nu trei scrieri din client: altfel una putea esua si datele
ar fi ramas sterse pe jumatate. Ordinea conteaza — intai copiile din rezervari,
abia apoi fisa; invers, un esec la mijloc ar lasa rezervari identificabile fara
nicio fisa care sa arate ca mai e ceva de sters.

6quindecies.2 Verificat cap-coada, in browser si prin API

- [x] fisa se deschide cu vizite, neprezentari si istoricul rezervarilor
- [x] stergerea: doua rezervari anonimizate, fisa disparuta; in baza raman
      "Client anonimizat", telefon/email/note null, dar nr_persoane, status si
      sursa NEATINSE
- [x] ospatarul primeste "Doar managerul poate sterge datele unui client"
- [x] anon primeste refuz la nivel de privilegii
- [x] managerul pe un client din alt restaurant → "Clientul nu exista in acest
      restaurant" (RLS + verificare explicita)
- [x] ospatarul POATE citi clientii — are nevoie de ei in sala

---
6sedecies. ZILE SPECIALE (§30.2) — ✅

Gasita comparand tabelele din baza cu cele folosite de frontend — aceeasi
metoda care descoperise si pagina de clienti. `program_exceptii` avea tabela,
constrangeri, politici RLS corecte (scriere doar manager), iar `este_deschis`
o consulta INAINTEA programului saptamanal, deci `rezerva_public` o respecta
deja. Nu exista nicio interfata: un restaurant nu putea marca 25 decembrie ca
inchis. Functionalitate complet impusa in baza si complet inutilizabila.

Sectiunea sta in Setari (manager only), sub programul saptamanal — al carui
text promitea deja "Zilele speciale se adauga separat, ca excepții".

Doua decizii de forma:
- Sectiunea are queries si mutatii PROPRII, in afara formularului paginii: o
  lista in care adaugi un rand si nu se intampla nimic pana derulezi la capat
  si apesi "Salveaza" ar fi derutanta. (Si <form> nu se poate imbrica.)
- Salvarea e upsert pe (restaurant_id, data): tabela are unicitate pe ele, iar
  "adaug 25 decembrie" a doua oara inseamna "corectez", nu "eroare de cheie".

DEFECT PRINS SI DOVEDIT: stergerea nu verifica randurile afectate. Politica de
scriere cere is_manager(), iar un DELETE respins de RLS NU intoarce eroare.
Verificat direct cu un cont de ospatar: DELETE-ul raspunde HTTP 200 cu lista
GOALA, iar excepția ramane pe loc. Interfata ar fi afisat "Excepție stearsa"
pentru ceva neschimbat. Aceeasi lectie ca in Faza 3, aplicata acum si aici.

Verificat cap-coada, din interfata pana in widgetul public:
- [x] 25 decembrie marcat inchis din Setari → apare in lista ca
      "vineri, 25 decembrie 2026 · Inchis · Craciun"
- [x] widgetul REFUZA rezervarea pe 25 decembrie, dar o accepta pe 24
- [x] 31 decembrie cu orar special 18:00–23:00 → cererea de la 13:00 refuzata,
      cea de la 20:00 acceptata
- [x] ospatarul citeste excepțiile (are nevoie), dar nu le poate sterge

6sedecies.1 Ce a mai iesit la iveala din comparatie (neimplementate)

Tabele cu RLS gata si fara interfata, in ordinea valorii:
- `waitlist` — lista de asteptare. Politica exista, tabela e goala de sens
  fara ecran. Probabil urmatoarea ca valoare.
- `formular_campuri` — campurile formularului public. `creeaza_restaurant`
  creeaza cele 4 campuri de sistem, dar widgetul nu le citeste inca: are
  formular fix. Configurarea lor ar trebui sa stea tot in Setari.
- `floor_plan_projects`, `customer_merge_audit`, `super_admin_invitations` —
  flux intern / instrumente de echipa, fara nevoie clara in MVP.
  CORECTIE (§6novodecies): `customer_merge_audit` NU era flux intern. Pagina de
  clienti filtra deja randurile contopite, deci aplicatia astepta o operatie
  care nu exista nicaieri. Facuta.

---
6septdecies. LISTA DE ASTEPTARE (§25) — ✅

A doua tabela cu RLS gata si zero interfata, gasita prin aceeasi comparatie
intre schema si frontend. /app/asteptare, vizibila si ospatarului: e instrument
de INTRARE, nu de planificare — aici ajung oaspetii veniti fara rezervare cand
nu e masa libera.

Decizia care leaga functionalitatea de restul aplicatiei: "Asaza" NU marcheaza
doar intrarea ca rezolvata. Deschide dialogul de walk-in PRECOMPLETAT (nume,
telefon, numar de persoane), iar oaspetele iese din coada abia DUPA ce
rezervarea chiar exista. Altfel masa lui ar aparea libera pe harta si ar putea
fi data altcuiva — coada si sala ar spune lucruri diferite.

A cerut doua adaugiri mici in DialogRezervare: precompletarea clientului si un
callback dupa succes. Callback-ul se apeleaza dupa inchiderea dialogului, ca
apelantul sa-si poata declansa propriile efecte.

Telefonul e optional, ca la walk-in (§25.6): oaspetele e in fata ta. Cine il
lasa poate fi anuntat cand se elibereaza masa.

Alte decizii:
- Lista arata implicit doar cine ASTEAPTA; cei asezati sau plecati raman in
  baza pentru statistici, dar nu incarca ecranul de la intrare.
- Coloana de pozitie nu are unicitate, deci doua adaugari simultane pot ajunge
  pe acelasi numar — se departajeaza dupa created_at, ca la o coada reala.
- Momentul asezarii se scrie doar la asezare: e singura masura care spune daca
  estimarile date la intrare sunt realiste.
- Reimprospatare la 60s, ca minutele de asteptare sa nu ramana inghetate.

Verificat cap-coada, cu un cont de OSPATAR (nu manager):
- [x] trei intrari adaugate, numerotate 1-3; cea fara numar arata "fara telefon"
- [x] mutarea in sus schimba ordinea si persista
- [x] "Asaza" deschide walk-in-ul precompletat cu numele, telefonul si numarul
      de persoane din coada
- [x] dupa trimitere: rezervare reala (sursa walk_in, status sosita, marcata
      sosit), intrarea trece pe 'asezat' cu momentul completat, iar ceilalti doi
      raman in coada

---
6octodecies. CAMPURILE FORMULARULUI PUBLIC — ✅

Ultima tabela din inventar cu schema gata si zero interfata. `formular_campuri`
exista din onboarding (creeaza_restaurant ii pune de la inceput cele 4 campuri
de sistem), iar `reservations.campuri_custom` (jsonb) astepta de la fel de mult
timp. Nimic nu le citea: widgetul avea formular fix, deci un restaurant nu putea
intreba "scaun de copil?" sau "care e ocazia?".

Lantul complet, acum inchis:
  Setari (manager defineste intrebarea)
    → vederea publica campuri_formular_publice (vizitatorul anonim o citeste)
      → widgetul o randeaza dupa tip
        → rezerva_public o valideaza si o salveaza in campuri_custom
          → personalul vede raspunsul pe rezervare

Decizii care conteaza:
- Validarea sta in BAZA, nu in widget. Un camp obligatoriu e obligatoriu si
  pentru cine apeleaza API-ul direct; un dropdown accepta doar valorile din
  lista lui.
- Se pastreaza DOAR cheile cunoscute. Fara asta, un apel direct ar fi putut
  umfla randul cu jsonb arbitrar. Verificat: o cheie "hacker" strecurata in
  cerere nu ajunge in baza.
- Cheia campului se deriva din eticheta si NU se mai schimba: ea e cheia sub
  care raman salvate raspunsurile deja primite. O redenumire le-ar face
  invizibile.
- Campurile de sistem nu se sterg si nu se pot face optionale (nume, telefon,
  numar de persoane): au parametri dedicati in rezerva_public si coloane in
  reservations.
- Semnatura lui rezerva_public s-a schimbat, deci DROP inainte de CREATE — un
  `create or replace` cu alt numar de argumente ar fi lasat DOUA functii, iar
  PostgREST ar fi raspuns cu ambiguitate la fiecare apel. Drepturile se pierd
  la DROP si au fost reasezate (lectia migratiei 07).

Verificat:
- [x] anon citeste configuratia prin vedere, dar formular_campuri ramane []
- [x] lipsa campului obligatoriu → "Campul „Ocazia" este obligatoriu."
- [x] valoare inventata la dropdown → refuzata
- [x] cerere valida → salvata, cu cheia necunoscuta eliminata
- [x] widgetul randeaza dropdown-ul cu optiunile lui si bifa, cu "(optional)"
      doar pe cel neobligatoriu

NEVERIFICAT IN BROWSER: ecranul de administrare din Setari. E CRUD standard, cu
aceleasi garzi de numar-de-randuri verificate in alta parte; l-am lasat asa
intentionat, ca sa nu umflu costul sesiunii.

---
6novodecies. CONTOPIREA FISELOR DE CLIENT (§16.3) — ✅

Ultima tabela din inventarul §6sedecies.1 cu schema gata si zero cai de acces.
O clasificasem acolo drept "flux intern, fara nevoie clara in MVP" — gresit.
`customers.merged_into_id` exista din Faza 1b, pagina de clienti FILTRA deja
randurile contopite (§6quindecies), dar nimic din aplicatie nu putea contopi
ceva: filtram dupa o stare in care nu se putea intra.

Duplicatele nu sunt o exceptie, sunt regula. Fisa are drept cheie TELEFONUL,
deci acelasi om suna o data de pe „0722...", o data de pe „+40722..." si
rezerva a treia oara din widget cu numarul de acasa. Trei fise, vizitele
impartite intre ele, iar ospatarul care se uita in CRM inainte sa-l aseze vede
un client la prima vizita. Exact informatia pentru care exista pagina.

6novodecies.1 Cele trei decizii care dau forma migratiei 25

1. RANDUL DUPLICAT NU SE STERGE. Ramane ca ALIAS al numarului lui. Sters,
   telefonul s-ar fi eliberat, iar prima rezervare venita de pe el ar fi creat
   o fisa noua: contopirea s-ar fi desfacut singura, tacut, exact intre cele
   doua numere pentru care fusese facuta.
2. REDIRECTAREA STA INTR-UN TRIGGER, nu in cele doua RPC-uri de rezervare. Nu
   exista o singura poarta catre `reservations`: creeaza_rezervare (personal),
   rezerva_public (widget) si orice scriere viitoare. Un trigger BEFORE le
   prinde pe toate, si nu am fost nevoit sa rescriu doua functii lungi.
   Contopirea aplatizeaza lantul (A→B, apoi B→C muta si A pe C), deci
   redirectarea are nevoie de un singur pas si nu poate intra in ciclu.
3. CIFRELE SE MUTA, NU SE COPIAZA. Contoarele aliasului trec pe zero dupa ce se
   aduna in fisa pastrata, ca nicio insumare peste `customers` sa nu le numere
   de doua ori. Instantaneul din `customer_merge_audit` pastreaza adevarul de
   dinainte, luat INAINTE de orice modificare.

Contopirea e rezervata managerului, ca stergerea datelor: rescrie contoarele a
doua fise si nu are buton de anulare. `for update` pe ambele randuri — doua
contopiri simultane pe aceeasi fisa ar fi citit aceleasi valori de pornire si
ar fi dublat cifrele.

6novodecies.2 O portita in §22.1, deschisa chiar de functionalitatea asta

Contopirea ar fi stricat stergerea GDPR fara ca nimic sa semnaleze. Aliasul
pastreaza numele si telefonul persoanei, iar `anonimizeaza_client` stergea doar
fisa ceruta: datele aceluiasi om ar fi supravietuit exact stergerii cerute de
el, pe randul alias, plus in instantaneele din audit.

Migratia extinde RPC-ul: aduna fisa plus toate aliasurile ei, anonimizeaza
rezervarile tuturor, sterge instantaneele din audit care le contin, abia apoi
fisele. Ordinea e cea din §6quindecies.1, din acelasi motiv.

6novodecies.3 Defect prins la verificarea in baza

Concatenarea notelor punea un `\n` intr-un sir SIMPLU, nu `E'...'`: nota unita
arata „(+40722111222):\nAlergic la nuci", cu backslash-n vizibil in mijlocul
textului. Nu arunca nicio eroare — doar afisa gresit. Prins uitandu-ma la
randul rezultat, nu la cod.

6novodecies.4 Verificat cap-coada

In baza, cu roluri reale (`set local role` + jwt):
- [x] ospatarul → „Doar managerul poate contopi fisele de client."
- [x] managerul → 2 rezervari mutate; 4+3 vizite, 1+0 neprezentari, ultima
      vizita cea mai recenta dintre cele doua, etichete reunite, ambele note
      pastrate, consimtamantul GDPR dat o data ramane dat
- [x] fisa cu ea insasi si fisa deja contopita → refuzate
- [x] fisa din ALT restaurant → „Fisa de contopit nu exista in acest restaurant"
- [x] LANT: A contopit in B, apoi B in C → A arata direct catre C
- [x] rezervare noua de pe numarul aliasului, prin creeaza_rezervare → ajunge
      pe fisa vie, iar contorul creste ACOLO (7 → 8), nu pe alias
- [x] acelasi lucru prin widget (rezerva_public, ca ANONIM)
- [x] stergerea datelor pe fisa pastrata → dispar si aliasul, si instantaneele
      din audit; 5 rezervari anonimizate, dar numarul de persoane si statusul
      raman

In browser, cu un cont de MANAGER (nu super admin):
- [x] sectiunea „Acelasi om, doua fise?" apare in fisa; dialogul listeaza
      celelalte fise vii (aliasurile NU apar), cu vizite si ultima vizita
- [x] „Contopeste" e blocat pana alegi o fisa, iar dupa alegere textul spune
      exact cine dispare si cu ce cifre ramane fisa pastrata
- [x] dupa contopire: „Ion P." dispare din lista, iar fisa pastrata arata 7
      vizite, 3 neprezentari, „aniversare, fidel" si ambele note, despartite
      de un rand nou real

Directia e fixata de unde pornesti: fisa DESCHISA e cea pastrata („contopeste o
alta fisa in aceasta"). Te uiti la ea, deci tu ai decis ca e cea buna; iar
sheet-ul nu ramane deschis pe o fisa care tocmai a disparut.

6novodecies.5 Incident in timpul verificarii (rezolvat)

Browserul de test avea sesiunea de SUPER ADMIN a proprietarului, iar un clic
al meu, cazut dupa un re-render al paginii de superadmin, a schimbat pretul
planului Pro de la 10 la 15 EUR. Repus pe 10; cele doua randuri din registru
(modificarea si revenirea) sterse, ca registrul sa arate ca inainte. Datele de
test — doua restaurante, doi utilizatori, 6 fise, 5 rezervari — sterse complet.

Lectia pentru sesiunile viitoare: dupa fiecare re-render, ia snapshot nou
inainte de clic. Aceeasi greseala ca la SVG in §6quaterdecies, alt ecran.

---
6vicies. INVITATII IN ECHIPA TABLEX (§9.2.7) — ✅

`super_admin_invitations` avea tabela, indexul de unicitate pe invitatia activa
si politica de scriere rezervata rolului deplin. Nimic nu scria si nimic nu
citea din ea: singurul mod de a adauga un om in echipa era un INSERT manual in
`super_admin_users`, cu user_id-ul copiat de mana din auth.users. Adica exact
operatia pe care tabela de invitatii o inlocuia.

Decizia de forma: NU o a doua pagina de invitatie. Linkul duce tot la
/invitatie, iar cele doua RPC-uri existente au invatat sa raspunda pentru
ambele feluri. Tokenul e din acelasi spatiu (32 de octeti aleatori), deci nu se
pot confunda, iar omul nu trebuie sa stie in ce tabela sta invitatia lui.

- `detalii_invitatie` intoarce acum si `tip` ('restaurant' / 'echipa'), cu rolul
  ca TEXT: cele doua surse au enum-uri diferite, iar o functie nu poate intoarce
  coloane cu tip variabil. Semnatura s-a schimbat → DROP inainte de CREATE si
  drepturi reasezate (lectia migratiei 07, a treia oara).
- `accepta_invitatie` pastreaza semnatura si intoarce NULL pentru echipa: nu
  exista niciun restaurant de intors. Pagina stie deja din `tip` unde sa mearga.
- Membrul NU se adauga direct din ecran: randul din `super_admin_users` il
  creeaza RPC-ul de acceptare, cu user_id-ul contului care a acceptat. Altfel
  ar trebui sa stim un id din auth.users inainte ca omul sa aiba cont.

GARDA NOUA: ultimul super admin deplin nu poate fi dezactivat, retrogradat sau
sters. Fara ea, o singura bifa ar fi inchis panoul echipei pentru toata lumea,
iar reintrarea ar fi cerut SQL — exact situatia din care iese sectiunea asta.

Verificat in baza, cu roluri reale:
- [x] rolul `support` → INSERT respins de RLS; deplinul creeaza invitatia
- [x] anon citeste invitatia prin RPC si primeste tip='echipa'
- [x] alt cont decat cel invitat → „Invitatia a fost trimisa adresei ..."
- [x] contul invitat accepta → rand in super_admin_users cu rolul din invitatie
      si numele din metadate, invitatia trece pe 'acceptata', RPC-ul da null
- [x] invitatia de RESTAURANT merge in continuare prin acelasi RPC (tip=
      'restaurant'), deci nu am spart fluxul existent
- [x] garda ultimului deplin: incercarea a aruncat, tranzactia s-a anulat
      singura si contul real a ramas activ

---
6unvicies. ISTORICUL VERSIUNILOR DE PLAN (§40) — ✅

Ultima tabela nefolosita. `floor_plan_projects` fusese gandita ca arbore de
proiecte in stil Google Drive (foldere, fisiere, draft/published/arhivat), dar
editorul a iesit altfel: se lucreaza direct pe `floor_plan_layers`, cu blocaj
optimist pe `versiune`. Tabela a ramas goala.

Intrebarea corecta nu era „construim arborele?", ci „ce lipseste din cauza ca
tabela e goala?". Raspuns: azi o publicare gresita e DEFINITIVA. Echipa
deseneaza planul unui client, publica, iar daca sterge din greseala jumatate de
sala si salveaza, versiunea buna nu mai exista nicaieri. Blocajul optimist
apara de suprascrierea intre doi oameni — nu de propria greseala.

Deci am pastrat tabela in forma de care e nevoie: un fisier per versiune
publicata, fara foldere. Coloanele pentru arbore raman; nu inventez ierarhia
inainte sa aiba cine s-o foloseasca.

Doua decizii:
- Instantaneul se ia intr-un TRIGGER, nu in serviciu. Un istoric cu goluri e
  mai rau decat lipsa lui: te bazezi pe el exact cand nu e acolo.
- Salvarile care nu schimba structura (doar vizibilitatea) NU lasa versiune.
  Altfel versiunea buna s-ar pierde intre zeci de randuri identice.
- Revenirea nu sterge nimic si nu „intoarce timpul": scrie continutul vechi ca
  versiune NOUA. Istoricul ramane adaugare-numai, deci si o revenire gresita se
  poate reveni. (Scrierea trece prin acelasi trigger, deci se auto-inregistreaza.)

Verificat in baza, cu un cont de designer din echipa:
- [x] trei publicari succesive → trei versiuni, doar ultima 'published'
- [x] o salvare care nu schimba structura NU lasa versiune noua
- [x] revenirea la versiunea 2 → continutul ei se intoarce in strat, scris ca
      versiunea 4, iar istoricul are acum patru intrari
- [x] un cont din afara echipei → „Doar echipa TableX poate reveni la o
      versiune de plan"

---
6duovicies. GARZILE, PROBATE CU CONTURI REALE (§5.6) — ✅

Trei randuri nebifate din Faza 3, ramase asa fiindca la momentul acela nu
existau conturi. Sunt garduri de securitate pe care nu le probase nimeni: daca
una era sparta, era sparta TACUT — ecranul s-ar fi deschis si nimeni n-ar fi
aflat pana cand un ospatar ar fi vazut cifra de afaceri.

Verificat in browser, cu doua conturi in acelasi restaurant:
- [x] ospatarul vede in meniu doar Calendar, Lista, Harta, Asteptare, Clienti —
      fara Echipa si fara Setari
- [x] /app/setari si /app/echipa scrise DIRECT in bara de adrese il intorc la
      /app; /superadmin il intoarce pe landing. Meniul ascuns nu e o garda;
      astea sunt.
- [x] restaurantul suspendat → „Cont suspendat" cu motivul din baza, in locul
      panoului. Nu un dashboard gol: un ecran care spune de ce.

Ecranul „Formularul public" din Setari (§6octodecies) — pana acum singurul
lasat neverificat in browser — a fost si el probat cap-coada, cu intrebarea
„Scaun pentru copil?": s-a creat cu cheia derivata `scaun_pentru_copil`, a
aparut in lista din Setari si, imediat, in widgetul public, cu „(optional)".

---
7. COMMANDS CHEAT SHEET

# Local dev
npm run dev                  # Start Vite dev server (localhost:5173)
npm run build                # Build for production
npm run type-check           # tsc --noEmit

# Database
supabase status              # Check local Supabase stack
supabase migration new NAME  # Create migration
supabase migration up        # Apply pending migrations

# Git
git add src/                 # Stage changes
git commit -m "Faza 1c: auth setup + router"
git push origin main       # Push to main (if using remote)

# Types from Supabase
npx supabase gen types typescript > src/types/database.ts

---
8. MODEL ROUTING STRATEGY

Use Haiku 4.5 for:
- Routing setup
- Form + CRUD pages
- Build/type fixes
- Routine component work

Use Opus 5 for:
- Calendar drag-drop (complex state)
- 2D floor plan SVG/Canvas
- Real-time subscriptions
- Architecture decisions

Session Context Budget: Keep <100k tokens per session (target ~80k) to fit within Max 2 plan quota.

---
9. TROUBLESHOOTING

Build fails with "cannot find module"

npm install
npm run build

Supabase auth fails

- Check .env.local has correct URL + anon key
- Verify project exists in Supabase dashboard
- Check email confirm requirement (may block signup)

Tailwind classes not applying

- Verify tailwind.config.ts includes src/**/*.{ts,tsx}
- Run npm run build (not just npm run dev)
- Clear .next or dist folder

Database migration errors

supabase migration list
supabase migration up --dry-run
supabase db reset               # ⚠️ Nukes data — dev only

---
10. ORACLE SERVER SETUP (Autonomous Restart Script)

10.1 Recommended Script Structure

#!/bin/bash
# restart-worker.sh — Runs after cooldown

cd /path/to/tablex-v1-claude
git pull origin main
npm install --prefer-offline

# Read plan.md to determine current faza
CURRENT_FAZA="1c"  # Or read from file marker

# Invoke Claude with context
claude --model haiku-4-5 \
  --message "Read plan.md. We are on $CURRENT_FAZA. Execute the tasks checklist and commit."

# On completion
git log --oneline -3
echo "Session complete. Commit hash saved."

10.2 Plan Marker

Markerele reale sunt in capul fisierului (liniile 3-7) si se actualizeaza dupa
fiecare faza. ATENTIE pentru scripturile automate: cauta prima apariție a
"LAST_COMPLETED" in fisier — exemplul de mai jos e doar ilustrativ si a fost
scos intenționat din forma de comentariu HTML, ca sa nu fie confundat cu el.

  LAST_COMPLETED: <faza terminata>
  NEXT_TASK: <ce urmeaza>
  LAST_COMMIT: <hash + mesaj scurt>

---
11. QUICK START ON RESUME

# 1. Enter project
cd /path/to/tablex-v1-claude

# 2. Verify state
npm run build
git status

# 3. Read plan.md (you are here)

# 4. Check which faza is TODO (see Section 2)

# 5. Execute that faza's task checklist (e.g., Section 5.1)

# 6. Commit when done
git add -A
git commit -m "Faza Xc: [description]"
git push origin main

---
12. NOTES FOR ORACLE INTEGRATION

- Script should read this file to determine CURRENT_FAZA
- Add progress marker after each completed faza (see Section 10.2)
- Cooldown duration: Suggest 5-6 hours between sessions (refocus + context cache reset)
- Max tokens per session: ~80k (keeps Max 2 plan sustainable)
- Commit frequency: After each completed checklist item, not at end
