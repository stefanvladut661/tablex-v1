-- ═══════════════════════════════════════════════════════════════════════════
-- Mentenanta se impune in BAZA, nu in React (§9.2.7, §47.2)
--
-- §47.2 cere ca activarea Maintenance Mode sa blocheze accesul la aplicatie
-- pentru Admin si pentru Client, lasand deschis doar Command Center-ul. Pana
-- acum regula traia exclusiv in React: rute-protejate redirecta Adminul spre
-- /mentenanta, iar WidgetRezervarePage randa ecranul de mentenanta. Amandoua
-- apara doar NAVIGAREA, adica exact stratul care nu conteaza:
--
--   • widgetul public e gandit sa traiasca in iframe, pe site-ul altcuiva. Un
--     vizitator care avea pagina deschisa cand s-a pornit mentenanta nu
--     re-randeaza nimic: apasa „Trimite" si rezervarea INTRA in baza, in plina
--     actualizare de schema.
--   • rezerva_public are grant EXECUTE catre anon, iar cheia publishable e
--     publica prin definitie. Un curl catre /rest/v1/rpc/rezerva_public nu
--     trece niciodata prin React.
--   • un Admin cu tabul deja deschis are un JWT valid; PostgREST nu stie nimic
--     despre redirectul din router.
--
-- DE CE TRIGGER, NU O VERIFICARE IN rezerva_public. Verificarea inauntrul
-- functiei ar fi acoperit doar drumul acela. Trigger-ul prinde ORICE scriere,
-- inclusiv un INSERT direct in reservations din consola unui Admin — si nu cere
-- reproducerea byte-cu-byte a unei functii de doua sute de linii, unde o
-- greseala de transcriere ar fi mai scumpa decat gaura pe care o inchidem.
--
-- CINE TRECE MAI DEPARTE, si de ce in ordinea asta:
--   1. Cererile FARA context web (pg_cron, service_role, consola SQL). Ele nu
--      sunt „aplicatia", sunt intretinerea ei — si daca le-am bloca, joburile
--      de remindere si de retentie ar cadea tocmai in fereastra de mentenanta.
--   2. Echipa TableX. Verificarea e is_super_admin(), NU is_super_admin_deplin():
--      §47.2 tine deschis Command Center-ul, iar acolo intra si Designer, si
--      Support (§9.2.7).
-- Nimeni nu se poate auto-incuia: app_settings NU primeste trigger-ul, deci
-- oprirea mentenantei ramane posibila chiar daca restul e blocat.
--
-- CITIRILE RAMAN DESCHISE, deliberat. §47.2 cere sa se AFISEZE un mesaj de
-- mentenanta; ca sa-l vezi, aplicatia trebuie sa se incarce si sa poata citi
-- app_settings. Din acelasi motiv nu atingem autentificarea: cine nu se poate
-- autentifica primeste o eroare de autentificare, nu mesajul cerut de spec.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Un singur loc care stie unde sta comutatorul ───────────────────────────
-- SECURITY DEFINER ca sa nu depinda de politica de SELECT de pe app_settings:
-- daca maine citirea se restrange, garda n-are voie sa devina permisiva.
-- STABLE, nu IMMUTABLE — se reevalueaza la fiecare instructiune, deci oprirea
-- mentenantei se vede imediat, fara reconectare.
create or replace function public.in_mentenanta()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select s.maintenance_mode from public.app_settings s where s.id), false)
$$;

comment on function public.in_mentenanta() is
  'Sursa unica de adevar pentru Maintenance Mode (§47.2). Nu se citeste '
  'app_settings.maintenance_mode direct din alte functii.';

revoke execute on function public.in_mentenanta() from public, anon, authenticated;

-- ── Garda propriu-zisa ─────────────────────────────────────────────────────
-- FOR EACH STATEMENT, nu FOR EACH ROW: refuzam INCERCAREA, nu randurile. Un
-- UPDATE respins de RLS atinge zero randuri, iar un trigger pe rand n-ar mai
-- avea ce refuza — exact capcana din regula 6.
create or replace function public.blocheaza_in_mentenanta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_rol    text;
begin
  -- Fara context de cerere web: pg_cron, service_role prin conexiune directa,
  -- consola SQL. Nu sunt aplicatia, sunt intretinerea ei.
  if v_claims is null then
    return null;
  end if;

  v_rol := v_claims::jsonb ->> 'role';
  -- service_role trece prin PostgREST cu claims proprii; el face migratii si
  -- Edge Functions, deci nu se blocheaza.
  if v_rol is distinct from 'anon' and v_rol is distinct from 'authenticated' then
    return null;
  end if;

  if not public.in_mentenanta() then
    return null;
  end if;

  if public.is_super_admin() then
    return null;
  end if;

  raise exception 'TableX este in mentenanta. Rezervarile nu se pot inregistra acum; incearca din nou in scurt timp.'
    using errcode = 'P0001';
end;
$$;

revoke execute on function public.blocheaza_in_mentenanta() from public, anon, authenticated;

-- Cele doua tabele pe care le scrie drumul public de rezervare. Ele sunt si
-- singurele in care poate intra ceva din afara, fara sesiune de personal.
create trigger trg_mentenanta_reservations
  before insert or update or delete on public.reservations
  for each statement execute function public.blocheaza_in_mentenanta();

create trigger trg_mentenanta_customers
  before insert or update or delete on public.customers
  for each statement execute function public.blocheaza_in_mentenanta();
