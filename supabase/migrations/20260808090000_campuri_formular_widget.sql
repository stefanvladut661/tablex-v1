-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 23. Campurile formularului public, folosite in sfarsit
--
-- `formular_campuri` exista din migratia de onboarding, iar creeaza_restaurant
-- ii pune de la inceput cele 4 campuri de sistem (nume, telefon, email,
-- nr_persoane). `reservations.campuri_custom` (jsonb) exista de la fel de mult
-- timp. Nimic nu le citea: widgetul avea formular fix, deci un restaurant nu
-- putea intreba "scaun de copil?" sau "ocazie speciala?".
--
-- Aici legam cele doua capete:
--   1. o vedere publica, ca vizitatorul ANONIM sa poata randa formularul
--   2. rezerva_public primeste raspunsurile si le valideaza
--
-- Validarea sta in BAZA, nu in widget, din acelasi motiv ca peste tot: API-ul
-- e public. Un camp marcat obligatoriu trebuie sa fie obligatoriu si pentru
-- cine ocoleste interfata.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Vederea publica ──────────────────────────────────────────────────────
-- Pe modelul celorlalte (restaurante_publice, zone_publice, mese_publice):
-- coloane alese explicit, doar pentru restaurante active, fara nicio politica
-- noua pe tabela de baza. `sistem` NU se expune — vizitatorului nu-i spune
-- nimic, iar widgetul stie oricum ce campuri de sistem sa randeze dupa cheie.
create or replace view public.campuri_formular_publice as
  select f.restaurant_id, f.cheie, f.eticheta, f.tip, f.obligatoriu,
         f.optiuni, f.ordine, f.placeholder
    from public.formular_campuri f
    join public.restaurants r on r.id = f.restaurant_id
   where f.activ and r.status = 'activ';

grant select on public.campuri_formular_publice to anon, authenticated;

-- ── rezerva_public: primeste si valideaza raspunsurile ───────────────────
-- Semnatura se schimba, deci DROP inainte de CREATE: un `create or replace`
-- cu alt numar de argumente ar lasa DOUA functii cu acelasi nume, iar PostgREST
-- ar raspunde cu eroare de ambiguitate la fiecare apel.
drop function if exists public.rezerva_public(
  text, text, text, integer, timestamptz, uuid, text, text, boolean
);

create or replace function public.rezerva_public(
  p_slug text,
  p_client_nume text,
  p_telefon text,
  p_nr_persoane integer,
  p_data_ora timestamptz,
  p_zone_id uuid default null,
  p_email text default null,
  p_note_client text default null,
  p_gdpr boolean default false,
  p_campuri_custom jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_rest      public.restaurants;
  v_nume      text := nullif(btrim(p_client_nume), '');
  v_telefon   text := nullif(btrim(p_telefon), '');
  v_customer  uuid;
  v_status    public.rezervare_status;
  v_id        uuid;
  v_recente   integer;
  v_camp      public.formular_campuri;
  v_valoare   text;
  v_custom    jsonb := coalesce(p_campuri_custom, '{}'::jsonb);
begin
  select * into v_rest
    from public.restaurants r
   where r.slug = p_slug and r.status = 'activ';

  if not found then
    raise exception 'Restaurantul nu a fost gasit sau nu accepta rezervari.'
      using errcode = 'P0001';
  end if;

  if v_nume is null or v_telefon is null then
    raise exception 'Numele si telefonul sunt obligatorii.' using errcode = 'P0001';
  end if;

  if not p_gdpr then
    raise exception 'Rezervarea necesita acordul pentru prelucrarea datelor.'
      using errcode = 'P0001';
  end if;

  if p_nr_persoane is null or p_nr_persoane < 1 or p_nr_persoane > 50 then
    raise exception 'Numarul de persoane trebuie sa fie intre 1 si 50.'
      using errcode = 'P0001';
  end if;

  if p_data_ora <= now() then
    raise exception 'Alege un interval din viitor.' using errcode = 'P0001';
  end if;

  if p_data_ora > now() + interval '6 months' then
    raise exception 'Rezervarile se accepta cu maximum 6 luni inainte.'
      using errcode = 'P0001';
  end if;

  if not public.este_deschis(v_rest.id, p_data_ora) then
    raise exception 'Restaurantul este inchis in intervalul ales.'
      using errcode = 'P0001';
  end if;

  -- ── Campurile proprii ale restaurantului ──────────────────────────────
  -- Doar cele ACTIVE si NON-sistem: cele de sistem au deja parametri proprii,
  -- iar duplicarea lor in jsonb ar face posibile doua adevaruri diferite
  -- despre acelasi lucru.
  if v_custom is not null and jsonb_typeof(v_custom) <> 'object' then
    raise exception 'Raspunsurile la campurile suplimentare trebuie sa fie un obiect.'
      using errcode = 'P0001';
  end if;

  for v_camp in
    select * from public.formular_campuri f
     where f.restaurant_id = v_rest.id and f.activ and not f.sistem
  loop
    v_valoare := nullif(btrim(coalesce(v_custom ->> v_camp.cheie, '')), '');

    if v_camp.obligatoriu and v_valoare is null then
      raise exception 'Campul "%" este obligatoriu.', v_camp.eticheta
        using errcode = 'P0001';
    end if;

    -- Un dropdown accepta doar valorile din lista lui: altfel un apel direct
    -- ar putea strecura orice text intr-un camp care in interfata are optiuni.
    if v_valoare is not null and v_camp.tip = 'dropdown'
       and jsonb_typeof(v_camp.optiuni) = 'array'
       and not (v_camp.optiuni ? v_valoare) then
      raise exception 'Valoare invalida pentru campul "%".', v_camp.eticheta
        using errcode = 'P0001';
    end if;
  end loop;

  -- Pastram DOAR cheile cunoscute: fara asta, oricine ar putea umfla randul cu
  -- jsonb arbitrar printr-un apel direct la API.
  select coalesce(jsonb_object_agg(f.cheie, v_custom -> f.cheie), '{}'::jsonb)
    into v_custom
    from public.formular_campuri f
   where f.restaurant_id = v_rest.id and f.activ and not f.sistem
     and v_custom ? f.cheie;

  select count(*) into v_recente
    from public.reservations res
   where res.restaurant_id = v_rest.id
     and res.telefon = v_telefon
     and res.created_at > now() - interval '24 hours';

  if v_recente >= 5 then
    raise exception 'Prea multe cereri de la acest numar. Contacteaza restaurantul telefonic.'
      using errcode = 'P0001';
  end if;

  insert into public.customers (restaurant_id, telefon, nume, email, gdpr_consimtamant)
  values (v_rest.id, v_telefon, v_nume, p_email, p_gdpr)
  on conflict (restaurant_id, telefon) do update
     set nume              = coalesce(customers.nume, excluded.nume),
         email             = coalesce(customers.email, excluded.email),
         gdpr_consimtamant = customers.gdpr_consimtamant or excluded.gdpr_consimtamant
  returning id into v_customer;

  v_status := case when v_rest.aprobare_automata then 'confirmata' else 'pending' end;

  insert into public.reservations (
    restaurant_id, zone_id, customer_id, client_nume, telefon, email,
    nr_persoane, data_ora, durata_minute, buffer_minute, se_termina_la,
    blocat_pana_la, status, sursa, note_client, gdpr_consimtamant, campuri_custom
  )
  values (
    v_rest.id, p_zone_id, v_customer, v_nume, v_telefon, p_email,
    p_nr_persoane, p_data_ora, null, null, null,
    null, v_status, 'widget', p_note_client, p_gdpr, v_custom
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'status', v_status, 'restaurant', v_rest.nume);
end;
$function$;

-- Drepturile se pierd la DROP; le reasezam ca in migratia 07.
revoke execute on function public.rezerva_public(
  text, text, text, integer, timestamptz, uuid, text, text, boolean, jsonb
) from public;
grant execute on function public.rezerva_public(
  text, text, text, integer, timestamptz, uuid, text, text, boolean, jsonb
) to anon, authenticated;
