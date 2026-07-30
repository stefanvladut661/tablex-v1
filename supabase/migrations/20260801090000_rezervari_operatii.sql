-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 09. Operatii pe rezervari: creare + sincronizare CRM
--
-- creeaza_rezervare e SECURITY INVOKER (implicit), NU definer: cel care o
-- apeleaza e deja admin al restaurantului, deci politicile RLS trebuie sa
-- rămână active. Functia nu primeste nici restaurant_id — il ia din
-- current_restaurant_id(), asa incat nu poate fi folosita pentru a scrie in
-- alt restaurant, oricat de creativ ar fi apelul.
--
-- Rostul ei nu e sa ocoleasca RLS, ci sa tina intr-un singur loc regulile de
-- business care altfel s-ar duplica in fiecare client:
--   1. clientul e identificat prin telefon (§16.1) → upsert in customers
--   2. rezervarea primeste customer_id, deci CRM-ul se construieste singur
--   3. intervalele rămân treaba trigger-ului rezervare_calculeaza_interval
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.creeaza_rezervare(
  p_client_nume   text,
  p_telefon       text,
  p_nr_persoane   integer,
  p_data_ora      timestamptz,
  p_table_id      uuid    default null,
  p_zone_id       uuid    default null,
  p_durata_minute integer default null,
  p_status        public.rezervare_status default 'confirmata',
  p_sursa         public.rezervare_sursa  default 'manual',
  p_email         text    default null,
  p_note_interne  text    default null,
  p_note_client   text    default null,
  p_gdpr          boolean default false
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_nume       text := nullif(btrim(p_client_nume), '');
  v_telefon    text := nullif(btrim(p_telefon), '');
  v_customer   uuid;
  v_id         uuid;
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;
  if v_nume is null then
    raise exception 'Numele clientului este obligatoriu.' using errcode = 'P0001';
  end if;
  if v_telefon is null then
    raise exception 'Telefonul este obligatoriu: identifica unic clientul (§16.1).'
      using errcode = 'P0001';
  end if;

  -- Un client existent nu se suprascrie: completam doar ce lipsea.
  insert into public.customers (restaurant_id, telefon, nume, email, gdpr_consimtamant)
  values (v_restaurant, v_telefon, v_nume, p_email, p_gdpr)
  on conflict (restaurant_id, telefon) do update
     set nume  = coalesce(customers.nume, excluded.nume),
         email = coalesce(customers.email, excluded.email)
  returning id into v_customer;

  -- durata_minute, buffer_minute, se_termina_la si blocat_pana_la se lasa NULL
  -- intentionat: NOT NULL se verifica DUPA trigger-ele BEFORE, iar trigger-ul
  -- rezervare_calculeaza_interval e sursa unica de adevar pentru ele.
  insert into public.reservations (
    restaurant_id, table_id, zone_id, customer_id,
    client_nume, telefon, email, nr_persoane, data_ora,
    durata_minute, buffer_minute, se_termina_la, blocat_pana_la,
    status, sursa, note_interne, note_client, gdpr_consimtamant, creat_de, sosit_la
  )
  values (
    v_restaurant, p_table_id, p_zone_id, v_customer,
    v_nume, v_telefon, p_email, p_nr_persoane, p_data_ora,
    p_durata_minute, null, null, null,
    p_status, p_sursa, p_note_interne, p_note_client, p_gdpr, auth.uid(),
    case when p_status = 'sosita' then now() end
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.creeaza_rezervare is
  'Creeaza o rezervare in restaurantul contului curent, cu upsert de client pe telefon. Conflictul de masa iese ca SQLSTATE 23P01 din constrangerea EXCLUDE.';

revoke execute on function public.creeaza_rezervare(
  text, text, integer, timestamptz, uuid, uuid, integer,
  public.rezervare_status, public.rezervare_sursa, text, text, text, boolean
) from public;

grant execute on function public.creeaza_rezervare(
  text, text, integer, timestamptz, uuid, uuid, integer,
  public.rezervare_status, public.rezervare_sursa, text, text, text, boolean
) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- CRM: numarul de vizite si de neprezentari se intretin in baza de date
-- (§16, §19.1), nu in client. Orice cale de modificare a statusului — panou,
-- widget, job automat — actualizeaza aceleasi contoare.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function public.actualizeaza_crm_client()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.customer_id is null then
    return null;
  end if;

  -- Doar tranzitiile reale de status conteaza; un UPDATE care nu schimba
  -- statusul nu are voie sa mai numere o vizita.
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return null;
  end if;

  if new.status = 'sosita' then
    update public.customers
       set nr_vizite = nr_vizite + 1,
           data_ultima_vizita = coalesce(new.sosit_la, now())
     where id = new.customer_id;
  elsif new.status = 'no_show' then
    update public.customers
       set nr_no_show = nr_no_show + 1
     where id = new.customer_id;
  end if;

  return null;
end;
$$;

create trigger trg_crm_client
  after insert or update of status on public.reservations
  for each row execute function public.actualizeaza_crm_client();

revoke execute on function public.actualizeaza_crm_client() from public;
