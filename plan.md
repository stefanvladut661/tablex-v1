# TableX.ro v1 - Plan de Dezvoltare & Checkpoint

<!-- LAST_COMPLETED: Faza 3 (onboarding + invitatii + RPC-uri) -->
<!-- NEXT_TASK: Faza 4 - Dashboard & Calendar (navbar, sidebar, calendar D/W/M, lista, walk-in) -->
<!-- LAST_COMMIT: main branch synced to GitHub -->
<!-- GITHUB_REPO: https://github.com/stefanvladut661/tablex-v1.git -->
<!-- BRANCH: main (NU master) -->

**Data creării:** 2026-07-29
**Status:** ~35% MVP implementat
**Model:** Haiku 4.5 (context <100k pe sesiune) | Opus 5 (faze complexe)
**Ultima sesiune:** Fazele 1c, 1d (RLS), 2 (landing + harta 2D), 3 (onboarding + invitatii)
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
| **4** | **Dashboard & Calendar** | 🔴 TODO | ~3 sessions | HEAVIEST — navbar+sidebar+calendar (D/W/M)+list+walk-in |
| 5 | Real-time + Remaining Features | 🔴 TODO | ~2 sessions | Subscriptions, notifications, edge cases |

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

- [ ] login complet → profil incarcat → /app afiseaza restaurantul
- [ ] ospatar vs manager: garda RutaManager blocheaza ospatarul
- [ ] restaurant suspendat → ecran de blocaj, nu dashboard

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

10.2 Plan Marker (Insert at top after this session)

<!-- LAST_COMPLETED: Faza 1b (schema SQL) -->
<!-- NEXT_TASK: Faza 1c - Supabase client + Auth contexts + Router -->
<!-- LAST_COMMIT: ab46811 Faza 1a: fundatie proiect + design system -->

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
