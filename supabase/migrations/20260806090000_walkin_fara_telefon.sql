-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 20. Walk-in fara telefon (§25.6)
--
-- Punct lasat deschis inca din Faza 4: reservations.telefon era NOT NULL,
-- deci un oaspete care intra si se aseaza nu putea fi inregistrat fara numar.
-- In practica personalul ar fi inventat unul — si exact asta trebuie evitat:
-- `customers` e unic pe (restaurant_id, telefon), deci un "0000000000" folosit
-- de doua ori ar contopi doi oameni fara legatura intr-un singur client, cu
-- nr_vizite umflat. Datele de CRM ar deveni minciuni, tacut.
--
-- DECIZIA: telefonul devine optional, dar NUMAI pentru walk-in.
--
-- De ce nu peste tot: pentru o rezervare (widget, telefonic, manual) numarul e
-- singurul mod de a anunta clientul daca ceva se schimba, iar §16.1 il cere ca
-- identificator. Un walk-in e altceva: clientul e deja in sala, in fata
-- ospatarului — nu e nimic de anuntat.
--
-- Un walk-in fara telefon NU primeste customer_id. Nu e o scapare: un oaspete
-- anonim nu e o fisa de CRM. Trigger-ul actualizeaza_crm_client iese deja din
-- prima linie cand customer_id e null, deci contoarele raman corecte.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.reservations alter column telefon drop not null;

-- Regula sta in baza, nu doar in formular: interfata poate fi ocolita.
alter table public.reservations
  add constraint reservations_telefon_obligatoriu
  check (telefon is not null or sursa = 'walk_in');

create or replace function public.creeaza_rezervare(
  p_client_nume text,
  p_telefon text,
  p_nr_persoane integer,
  p_data_ora timestamp with time zone,
  p_table_id uuid default null,
  p_zone_id uuid default null,
  p_durata_minute integer default null,
  p_status public.rezervare_status default 'confirmata',
  p_sursa public.rezervare_sursa default 'manual',
  p_email text default null,
  p_note_interne text default null,
  p_note_client text default null,
  p_gdpr boolean default false
)
returns uuid
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
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

  -- Singura exceptie de la §16.1, si numai aici.
  if v_telefon is null and p_sursa <> 'walk_in' then
    raise exception 'Telefonul este obligatoriu: identifica unic clientul.'
      using errcode = 'P0001';
  end if;

  -- Fara telefon nu exista cheie de client, deci nici fisa de CRM. Cu numar,
  -- upsert-ul rămâne exact cel de dinainte.
  if v_telefon is not null then
    insert into public.customers (restaurant_id, telefon, nume, email, gdpr_consimtamant)
    values (v_restaurant, v_telefon, v_nume, p_email, p_gdpr)
    on conflict (restaurant_id, telefon) do update
       set nume  = coalesce(customers.nume, excluded.nume),
           email = coalesce(customers.email, excluded.email)
    returning id into v_customer;
  end if;

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
$function$;
