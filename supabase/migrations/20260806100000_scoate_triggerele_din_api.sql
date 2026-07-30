-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 21. Functiile de trigger nu au ce cauta in API-ul public
--
-- A TREIA oara cand aceeasi capcana apare (dupa migratiile 07 si 17):
-- "revoke execute ... from public" NU sterge drepturile acordate EXPLICIT
-- rolurilor, iar Supabase le da din default privileges catre anon si
-- authenticated pentru orice functie noua din schema `public`. Toate
-- trigger-ele scrise pana acum au ramas asadar expuse ca
-- /rest/v1/rpc/<nume>.
--
-- Riscul practic e mic: un apel direct esueaza cu "trigger functions can only
-- be called as triggers". Dar principiul e acelasi ca peste tot in proiect —
-- suprafata expusa sa fie exact cat trebuie, nu cat s-a intamplat sa rămână.
--
-- Revocarea NU afecteaza declansarea trigger-elor: acelea sunt invocate de
-- sistem, nu de utilizator, deci nu trec prin verificarea de EXECUTE.
--
-- CE NU ATINGEM, INTENTIONAT:
--
-- 1. current_restaurant_id(), is_manager(), is_super_admin(),
--    is_super_admin_deplin() — sunt folosite IN interiorul politicilor RLS.
--    Expresiile de politica se evalueaza cu drepturile utilizatorului care
--    interogheaza, deci revocarea lui EXECUTE ar rupe accesul la toate
--    tabelele. In plus nu scurg nimic: iti spun despre propriul cont.
--
-- 2. Vederile publice (restaurante_publice, zone_publice, mese_publice,
--    structura_publica) — linter-ul le marcheaza ca "security definer view",
--    dar exact asta e rostul lor: sunt SINGURA cale prin care un vizitator
--    anonim poate citi ceva, cu coloane alese explicit, in timp ce tabelele de
--    baza raman inchise. Transformate in security_invoker, widgetul public ar
--    inceta sa functioneze. Avertismentul rămâne, cu bunastiinta.
-- ═══════════════════════════════════════════════════════════════════════

do $$
declare
  v_nume text;
begin
  foreach v_nume in array array[
    'actualizeaza_crm_client',
    'auditeaza_interventie_restaurant',
    'auditeaza_setari_globale',
    'notifica_cerere_floor_plan',
    'notifica_rezervare_noua',
    'notifica_status_floor_plan',
    'protejeaza_coloane_privilegiate',
    'protejeaza_status_cerere_fp'
  ]
  loop
    execute format(
      'revoke execute on function public.%I() from public, anon, authenticated, service_role',
      v_nume
    );
  end loop;
end $$;
