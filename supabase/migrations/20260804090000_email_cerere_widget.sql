-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 16. Emailul "am primit cererea ta", trimis clientului widgetului
--
-- PROBLEMA (ramasa deschisa din §6sexies): Edge Function-ul `trimite-email`
-- citeste rezervarea cu JWT-ul apelantului, deci prin RLS. E decizia corecta —
-- asa endpoint-ul nu poate fi folosit ca releu de spam. Dar clientul care
-- rezerva din widget e ANONIM, iar RLS (tot corect) nu-i da acces la propria
-- rezervare. Deci apelul nu poate porni din browserul lui.
--
-- SOLUTIA: il porneste baza de date, dupa commit, prin pg_net.
--
-- Autentificarea apelului — de ce NU service_role in baza:
-- Varianta uzuala (si ce face "Database Webhooks" din dashboard) e sa pui
-- cheia service_role in antetul trigger-ului. Am evitat-o: acea cheie deschide
-- TOATA baza, iar aici avem nevoie de exact o capabilitate — "trimite emailul
-- de primire pentru rezervarea X". Deci trigger-ul trimite un secret propriu,
-- generat in baza, iar functia il valideaza inapoi prin RPC-ul de mai jos.
-- Secretul nu poate face nimic altceva; scurgerea lui nu da acces la date.
--
-- Al doilea motiv, practic: nu depinde de `supabase secrets set`. Edge
-- Function-ul primeste SUPABASE_SERVICE_ROLE_KEY automat de la platforma, deci
-- poate apela RPC-ul de validare fara nicio configurare manuala.
--
-- Antetul Authorization ramane cheia ANON: functia e desfasurata cu
-- verify_jwt = true, deci platforma cere un JWT valid inainte sa ajunga la
-- codul nostru. Cheia anon e publica prin definitie (e in bundle-ul din
-- browser), deci nu adauga niciun secret nou.
-- ═══════════════════════════════════════════════════════════════════════

-- In schema `extensions`, nu in `public` (linter-ul Supabase: extension_in_public).
-- pg_net nu suporta ALTER EXTENSION ... SET SCHEMA, deci schema se alege la
-- creare. Functiile lui rămân oricum in schema `net`, pe care si-o creeaza singur.
create extension if not exists pg_net with schema extensions;

-- ── Validarea secretului, fara sa-l divulge ──────────────────────────────
-- Functia raspunde doar da/nu. Nu exista nicio cale prin care apelantul sa
-- citeasca secretul, nici macar cu service_role: schema `vault` nu e expusa
-- in PostgREST.
create or replace function public.verifica_secret_webhook(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asteptat text;
begin
  if p_secret is null or length(p_secret) < 16 then
    return false;
  end if;

  select decrypted_secret into v_asteptat
  from vault.decrypted_secrets
  where name = 'tablex_secret_webhook';

  return v_asteptat is not null and v_asteptat = p_secret;
end;
$$;

revoke execute on function public.verifica_secret_webhook(text) from public;
grant execute on function public.verifica_secret_webhook(text) to service_role;

-- ── Declansarea, dupa commit ─────────────────────────────────────────────
create or replace function public.email_cerere_widget()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url    text;
  v_anon   text;
  v_secret text;
begin
  -- Doar cererile venite din widget: personalul care introduce o rezervare in
  -- panou nu trimite clientului un "am primit cererea ta". La fel ca la
  -- notificari (migratia 11).
  if new.sursa <> 'widget' or new.email is null then
    return null;
  end if;

  select decrypted_secret into v_url    from vault.decrypted_secrets where name = 'tablex_url_functii';
  select decrypted_secret into v_anon   from vault.decrypted_secrets where name = 'tablex_cheie_anon';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'tablex_secret_webhook';

  -- Configurarea lipseste => aplicatia merge mai departe fara email, exact ca
  -- atunci cand nu e conectat niciun furnizor (§6sexies). Vezi .env.example
  -- pentru cele trei `vault.create_secret`.
  if v_url is null or v_anon is null or v_secret is null then
    return null;
  end if;

  -- pg_net e ASINCRON: pune cererea intr-o coada si o trimite dupa commit.
  -- Deci un email nu poate pleca pentru o rezervare care a fost anulata prin
  -- rollback, iar o retea lenta nu tine rezervarea in asteptare.
  perform net.http_post(
    url     := rtrim(v_url, '/') || '/trimite-email',
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'Authorization',    'Bearer ' || v_anon,
                 'x-tablex-webhook', v_secret
               ),
    body    := jsonb_build_object('tip', 'rezervare_noua', 'id', new.id),
    timeout_milliseconds := 5000
  );

  return null;
exception when others then
  -- Best-effort, ca peste tot la emailuri: rezervarea e deja inregistrata si
  -- clientul o vede confirmata in widget. Un email care nu pleaca nu are voie
  -- sa anuleze cererea.
  raise warning 'Emailul de primire nu a putut fi programat: %', sqlerrm;
  return null;
end;
$$;

create trigger trg_email_cerere_widget
  after insert on public.reservations
  for each row execute function public.email_cerere_widget();

revoke execute on function public.email_cerere_widget() from public;
