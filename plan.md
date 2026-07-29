# TableX.ro v1 - Plan de Dezvoltare & Checkpoint

<!-- LAST_COMPLETED: Faza 1c (auth + router + contexte) + Faza 1d (RLS) -->
<!-- NEXT_TASK: Faza 2 - Landing page completa + 2D floor plan viewer -->
<!-- LAST_COMMIT: main branch synced to GitHub -->
<!-- GITHUB_REPO: https://github.com/stefanvladut661/tablex-v1.git -->
<!-- BRANCH: main (NU master) -->

**Data creării:** 2026-07-29
**Status:** ~15% MVP implementat
**Model:** Haiku 4.5 (context <100k pe sesiune) | Opus 5 (faze complexe)
**Ultima sesiune:** Faza 1c (client Supabase, 3 contexte, 5 garzi, 9 pagini) + Faza 1d (RLS pe 19 tabele)
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
| **2** | **Landing + 2D Floor Plan Viewer** | 🔴 TODO | ~1.5 sessions | Marketing site + interactive seating demo |
| 3 | Onboarding Flow | 🔴 TODO | ~1 session | Org creation, user invitation, slug generator |
| 4 | Dashboard & Calendar | 🔴 TODO | ~3 sessions | HEAVIEST — navbar+sidebar+calendar (D/W/M)+list+walk-in |
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
6. FAZA 2: LANDING PAGE + 2D FLOOR PLAN (AFTER 1c)

Duration: ~1.5 sessions (Opus for canvas/SVG work)
Complexity: High
Dependencies: Faza 1c complete

6.1 Landing Page

- Hero section (pitch + CTA)
- Feature cards (4-5 features)
- Pricing table (3 tiers)
- FAQ section
- Footer

6.2 2D Floor Plan Viewer

- SVG/Canvas renderer for seat positions
- Interactive seating selection (click to book)
- Seat status colors (available, reserved, walk-in, occupied)
- Zoom + pan controls
- Real-time sync with DB

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
