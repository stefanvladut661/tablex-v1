-- ═══════════════════════════════════════════════════════════════════════════
-- Contopirea fiselor duplicate de client (§16.3)
--
-- `customer_merge_audit` si `customers.merged_into_id` existau din Faza 1b, cu
-- politici RLS corecte si zero cai de a ajunge la ele: nicio functie, niciun
-- ecran. Pagina de clienti FILTREAZA deja randurile contopite, dar nimic nu
-- putea contopi ceva. Acelasi tipar ca la zilele speciale si lista de
-- asteptare: schema gata, functionalitate inexistenta.
--
-- Duplicatele apar singure. Cheia fisei e telefonul, iar acelasi om suna o
-- data de pe "0722...", o data de pe "+40722..." si rezerva a treia oara din
-- widget cu numarul de acasa. Trei fise, vizitele impartite intre ele, iar
-- ospatarul care se uita in CRM vede un client la prima vizita.
--
-- Trei decizii care dau forma migratiei:
--
-- 1. Randul duplicat NU se sterge. Ramane ca ALIAS, cu merged_into_id catre
--    fisa pastrata. Sters, numarul lui de telefon s-ar fi eliberat, iar prima
--    rezervare venita de pe el ar fi creat o fisa noua — contopirea s-ar fi
--    desfacut singura, tacut, exact intre cele doua numere pentru care a fost
--    facuta.
-- 2. Redirectarea sta intr-un TRIGGER, nu in cele doua RPC-uri de rezervare.
--    Nu exista o singura poarta catre `reservations`: creeaza_rezervare,
--    rezerva_public si orice scriere viitoare. Un trigger le prinde pe toate.
-- 3. Anonimizarea trebuie sa urmareasca aliasurile. Fara asta, "sterge datele
--    clientului" ar fi lasat numele si telefonul aceleiasi persoane pe randul
--    alias — promisiunea din §22.1 incalcata tacit, tocmai la clientii despre
--    care stim cel mai mult.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Redirectarea rezervarilor catre fisa pastrata ───────────────────────
create or replace function public.redirectioneaza_client_contopit()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_principal uuid;
begin
  if new.customer_id is null then
    return new;
  end if;

  -- Un singur pas: contopirea aplatizeaza lantul (vezi mai jos), deci un alias
  -- arata mereu direct catre fisa vie.
  select c.merged_into_id into v_principal
    from public.customers c
   where c.id = new.customer_id;

  if v_principal is not null then
    new.customer_id := v_principal;
  end if;

  return new;
end;
$$;

comment on function public.redirectioneaza_client_contopit() is
  'Rezervarea ajunsa pe o fisa contopita se muta pe fisa pastrata. Altfel '
  'numarul de telefon al aliasului ar reinvia fisa duplicata la prima rezervare.';

drop trigger if exists trg_rezervare_client_contopit on public.reservations;
create trigger trg_rezervare_client_contopit
  before insert or update of customer_id on public.reservations
  for each row execute function public.redirectioneaza_client_contopit();

-- Triggerul nu are ce cauta in API-ul public (lectia migratiei 24).
revoke execute on function public.redirectioneaza_client_contopit() from public;

-- ── 2. Contopirea propriu-zisa ─────────────────────────────────────────────
create or replace function public.contopeste_clienti(
  p_principal_id uuid,
  p_duplicat_id  uuid
)
returns integer
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_principal  public.customers;
  v_duplicat   public.customers;
  v_rezervari  integer;
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  -- Contopirea rescrie contoarele a doua fise si nu are buton de anulare:
  -- aceeasi bariera ca la stergerea datelor (§22.1).
  if not public.is_manager() then
    raise exception 'Doar managerul poate contopi fisele de client.' using errcode = '42501';
  end if;

  if p_principal_id = p_duplicat_id then
    raise exception 'Nu poti contopi o fisa cu ea insasi.' using errcode = 'P0001';
  end if;

  -- FOR UPDATE: doua contopiri simultane pe aceeasi fisa ar dubla contoarele,
  -- fiindca amandoua ar citi aceleasi valori de pornire.
  select * into v_principal
    from public.customers
   where id = p_principal_id and restaurant_id = v_restaurant
   for update;
  if not found then
    raise exception 'Fisa pastrata nu exista in acest restaurant.' using errcode = 'P0002';
  end if;

  select * into v_duplicat
    from public.customers
   where id = p_duplicat_id and restaurant_id = v_restaurant
   for update;
  if not found then
    raise exception 'Fisa de contopit nu exista in acest restaurant.' using errcode = 'P0002';
  end if;

  if v_principal.merged_into_id is not null or v_duplicat.merged_into_id is not null then
    raise exception 'Una dintre fise a fost deja contopita in alta.' using errcode = 'P0001';
  end if;

  -- Instantaneul se ia INAINTE de orice modificare: e singura dovada a ceea ce
  -- a existat, daca cineva contopeste doi oameni diferiti din greseala.
  insert into public.customer_merge_audit (
    restaurant_id, principal_id, duplicat_id, snapshot_duplicat, efectuat_de
  )
  values (v_restaurant, p_principal_id, p_duplicat_id, to_jsonb(v_duplicat), auth.uid());

  -- Istoricul trece la fisa pastrata. `trg_crm_client` asculta doar de
  -- coloana status, deci mutarea NU reincrementeaza contoarele.
  update public.reservations
     set customer_id = p_principal_id
   where customer_id = p_duplicat_id
     and restaurant_id = v_restaurant;

  get diagnostics v_rezervari = row_count;

  update public.customers
     set nume  = coalesce(v_principal.nume, v_duplicat.nume),
         email = coalesce(v_principal.email, v_duplicat.email),
         -- Notele sunt scrise de om: niciuna nu se pierde.
         note = case
                  when nullif(btrim(coalesce(v_duplicat.note, '')), '') is null
                    then v_principal.note
                  when nullif(btrim(coalesce(v_principal.note, '')), '') is null
                    then v_duplicat.note
                  -- E'' pe AMBELE bucati: un '\n' fara prefix e text, nu rand
                  -- nou, si asa a si aparut in prima incercare.
                  else v_principal.note || E'\n\n— din fisa contopita ('
                       || v_duplicat.telefon || E'):\n' || v_duplicat.note
                end,
         taguri = array(
           select distinct t
             from unnest(v_principal.taguri || v_duplicat.taguri) as t
            order by t
         ),
         nr_vizite  = v_principal.nr_vizite + v_duplicat.nr_vizite,
         nr_no_show = v_principal.nr_no_show + v_duplicat.nr_no_show,
         -- GREATEST ignora NULL-urile: o fisa fara nicio vizita nu sterge data.
         data_ultima_vizita = greatest(
           v_principal.data_ultima_vizita, v_duplicat.data_ultima_vizita
         ),
         -- Consimtamantul dat o data ramane dat.
         gdpr_consimtamant = v_principal.gdpr_consimtamant or v_duplicat.gdpr_consimtamant
   where id = p_principal_id;

  -- Aplatizarea lantului: aliasurile duplicatului arata de acum direct catre
  -- fisa pastrata. Fara asta, A→B→C ar cere o cautare recursiva la fiecare
  -- rezervare, si ar face posibil un ciclu.
  update public.customers
     set merged_into_id = p_principal_id
   where restaurant_id = v_restaurant
     and merged_into_id = p_duplicat_id;

  -- Aliasul isi pastreaza telefonul (asta e tot rostul lui) si numele, ca
  -- auditul sa fie citibil. Cifrele se muta la zero: raman in fisa pastrata,
  -- iar o insumare peste `customers` nu are cum sa le numere de doua ori.
  update public.customers
     set merged_into_id     = p_principal_id,
         arhivat            = true,
         nr_vizite          = 0,
         nr_no_show         = 0,
         data_ultima_vizita = null,
         note               = null,
         taguri             = '{}'
   where id = p_duplicat_id;

  return v_rezervari;
end;
$$;

comment on function public.contopeste_clienti(uuid, uuid) is
  'Contopeste doua fise ale aceleiasi persoane. Duplicatul ramane ca alias de '
  'telefon, ca rezervarile viitoare de pe acel numar sa ajunga la fisa pastrata.';

revoke execute on function public.contopeste_clienti(uuid, uuid) from public;
grant execute on function public.contopeste_clienti(uuid, uuid) to authenticated;

-- ── 3. Stergerea la cerere urmareste aliasurile ────────────────────────────
-- Fara aceasta modificare, contopirea ar fi deschis o portita in §22.1: fisa
-- pastrata se stergea, iar aliasul ramanea cu numele si telefonul aceleiasi
-- persoane. Datele ar fi supravietuit exact stergerii cerute de ea.
create or replace function public.anonimizeaza_client(p_customer_id uuid)
returns integer
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_rezervari  integer;
  v_fise       uuid[];
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  if not public.is_manager() then
    raise exception 'Doar managerul poate sterge datele unui client.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.restaurant_id = v_restaurant
  ) then
    raise exception 'Clientul nu exista in acest restaurant.' using errcode = 'P0002';
  end if;

  -- Fisa ceruta plus toate aliasurile ei: acelasi om, mai multe numere.
  select array_agg(c.id) into v_fise
    from public.customers c
   where c.restaurant_id = v_restaurant
     and (c.id = p_customer_id or c.merged_into_id = p_customer_id);

  -- Intai copiile din rezervari, abia apoi fisele: invers, un esec la mijloc
  -- ar lasa rezervari identificabile fara nicio fisa care sa arate ca mai e
  -- ceva de sters.
  update public.reservations
     set client_nume   = 'Client anonimizat',
         telefon       = null,
         email         = null,
         note_client   = null,
         anonimizat_la = now()
   where customer_id = any(v_fise)
     and restaurant_id = v_restaurant;

  get diagnostics v_rezervari = row_count;

  -- Instantaneele din audit contin datele personale ale duplicatului: ele sunt
  -- primele care trebuie sa dispara.
  delete from public.customer_merge_audit
   where restaurant_id = v_restaurant
     and (principal_id = any(v_fise) or duplicat_id = any(v_fise));

  delete from public.customers
   where id = any(v_fise) and restaurant_id = v_restaurant;

  return v_rezervari;
end;
$$;
