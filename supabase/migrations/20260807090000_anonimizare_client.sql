-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 22. Stergerea datelor la cerere, facuta cinstit (§22.1)
--
-- PROBLEMA, gasita construind pagina de clienti:
-- `reservations` pastreaza COPII ale datelor personale — client_nume, telefon,
-- email, note_client — iar reservations.customer_id e ON DELETE SET NULL.
-- Deci un buton "sterge clientul" ar fi sters fisa de CRM si ar fi lasat
-- numele si telefonul persoanei in fiecare rezervare a ei. Adica exact
-- promisiunea pe care GDPR o cere, incalcata in tacere.
--
-- Copiile NU sunt o greseala: rezervarea trebuie sa rămână lizibila si daca
-- fisa de client dispare, iar personalul vede numele cu care s-a facut
-- rezervarea, nu numele curent din CRM.
--
-- SOLUTIA: anonimizare, nu stergere. Inregistrarea de business (data, numarul
-- de persoane, masa, statusul) supravietuieste — e nevoie de ea pentru
-- statistici si contabilitate — dar tot ce identifica persoana dispare.
-- `anonimizat_la` ramane ca dovada ca operatia s-a facut si cand.
--
-- De ce e nevoie de coloana noua: CHECK-ul din migratia 20 cere telefon not
-- null pentru orice ce nu e walk-in. Fara o a treia cale, anonimizarea unei
-- rezervari din widget ar fi imposibila — si tocmai alea au cei mai multi
-- clienti identificabili.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.reservations
  add column anonimizat_la timestamptz;

comment on column public.reservations.anonimizat_la is
  'Cand au fost sterse datele personale la cererea clientului (§22.1). '
  'Randul rămâne pentru statistici, dar fara nimic care identifica persoana.';

alter table public.reservations drop constraint reservations_telefon_obligatoriu;
alter table public.reservations
  add constraint reservations_telefon_obligatoriu
  check (telefon is not null or sursa = 'walk_in' or anonimizat_la is not null);

-- ── Operatia propriu-zisa ────────────────────────────────────────────────
-- SECURITY INVOKER: apelantul e deja personal al restaurantului, deci RLS
-- rămâne activ si nu poate atinge alt restaurant. Rostul functiei e sa faca
-- ATOMIC ce altfel ar fi trei scrieri separate din client — dintre care una
-- ar putea esua, lasand datele sterse pe jumatate.
create or replace function public.anonimizeaza_client(p_customer_id uuid)
returns integer
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_restaurant uuid := public.current_restaurant_id();
  v_rezervari  integer;
begin
  if v_restaurant is null then
    raise exception 'Contul nu este asociat niciunui restaurant.' using errcode = '42501';
  end if;

  -- Stergerea datelor unei persoane nu e o operatie de ospatar.
  if not public.is_manager() then
    raise exception 'Doar managerul poate sterge datele unui client.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.restaurant_id = v_restaurant
  ) then
    raise exception 'Clientul nu exista in acest restaurant.' using errcode = 'P0002';
  end if;

  -- Intai copiile din rezervari; abia apoi fisa. In ordinea inversa, un esec
  -- la mijloc ar lasa rezervari identificabile fara nicio fisa care sa arate
  -- ca mai e ceva de sters.
  update public.reservations
     set client_nume   = 'Client anonimizat',
         telefon       = null,
         email         = null,
         note_client   = null,
         anonimizat_la = now()
   where customer_id = p_customer_id
     and restaurant_id = v_restaurant;

  get diagnostics v_rezervari = row_count;

  delete from public.customers
   where id = p_customer_id and restaurant_id = v_restaurant;

  return v_rezervari;
end;
$$;

revoke execute on function public.anonimizeaza_client(uuid) from public, anon;
grant execute on function public.anonimizeaza_client(uuid) to authenticated;
