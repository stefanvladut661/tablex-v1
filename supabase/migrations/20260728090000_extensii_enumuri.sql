-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 01. Extensii + tipuri enum
--
-- btree_gist este OBLIGATORIU pentru constrangerea EXCLUDE anti-double-booking
-- (spec §15.3): fara el, "table_id WITH =" nu are clasa de operatori gist.
-- Pe Supabase extensiile stau in schema "extensions", deci orice migratie care
-- creeaza un index gist trebuie sa inceapa cu:
--     set local search_path = public, extensions;
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Tenancy / conturi ────────────────────────────────────────────────────
create type public.plan_tip              as enum ('start', 'pro_floor');
create type public.restaurant_status     as enum ('activ', 'suspendat', 'banat');
create type public.admin_rol             as enum ('manager', 'ospatar');
create type public.super_admin_rol       as enum ('super_admin', 'designer_architect', 'support');
create type public.invitatie_status      as enum ('trimisa', 'acceptata', 'expirata', 'anulata');

-- ── Rezervari ────────────────────────────────────────────────────────────
-- 'pending' NU expira niciodata (spec §15.2); tratarea e exclusiv manuala.
create type public.rezervare_status      as enum ('pending', 'confirmata', 'sosita', 'anulata', 'no_show', 'respinsa');
create type public.rezervare_sursa       as enum ('widget', 'manual', 'walk_in', 'telefon');

-- ── Floor plan ───────────────────────────────────────────────────────────
create type public.masa_forma            as enum ('rotunda', 'patrata', 'dreptunghiulara');
create type public.layer_tip             as enum ('layer1', 'layer2');

-- Spec §48 cere un singur set de statusuri, dar 'pending'/'in_progress' descriu
-- SOLICITARI, iar 'draft'/'published'/'arhivat' descriu HARTI SALVATE. Doua
-- concepte diferite => doua enum-uri. Vezi planul, "Decizii", punctul 5.
create type public.fp_request_status     as enum ('pending', 'in_progress', 'published', 'respins');
create type public.fp_project_status     as enum ('draft', 'published', 'arhivat');
create type public.fp_nod_tip            as enum ('folder', 'fisier');

-- ── Waitlist / evenimente / bilete ───────────────────────────────────────
create type public.waitlist_status       as enum ('asteptare', 'asezat', 'plecat');
create type public.event_status          as enum ('draft', 'publicat', 'anulat', 'incheiat');
create type public.ticket_plata_status   as enum ('neplatit', 'platit', 'rambursat', 'anulat');

-- ── WhatsApp / comunicatii ───────────────────────────────────────────────
create type public.wallet_tranzactie_tip as enum ('reincarcare', 'consum', 'ajustare_manuala', 'rambursare');
create type public.wa_mesaj_status       as enum ('trimis', 'esuat', 'fara_credite', 'simulat');

-- ── Support / sanatate sistem ────────────────────────────────────────────
create type public.support_status        as enum ('nou', 'deschis', 'in_lucru', 'rezolvat', 'inchis');
create type public.support_prioritate    as enum ('normal', 'nou', 'urgent');
create type public.serviciu_extern       as enum ('supabase', 'stripe', 'meta_whatsapp');
create type public.serviciu_status       as enum ('ok', 'degradat', 'indisponibil');

-- ── Notificari / audit / formular ────────────────────────────────────────
create type public.notificare_urgenta    as enum ('rosu', 'galben', 'albastru');
create type public.notificare_destinatie as enum ('admin', 'super_admin');

create type public.notificare_tip as enum (
  'rezervare_noua', 'rezervare_pending', 'masa_expirare', 'credite_epuizate',
  'floor_plan_status', 'floor_plan_request', 'conflict_layer', 'ticket_suport', 'sistem'
);

create type public.audit_actiune as enum (
  'suspend', 'unsuspend', 'ban', 'extend_trial', 'discount',
  'manual_floor_plan_unlock', 'schimbare_plan', 'nota',
  'schimbare_preturi', 'maintenance_toggle'
);

create type public.camp_formular_tip     as enum ('text', 'checkbox', 'dropdown', 'numar');
