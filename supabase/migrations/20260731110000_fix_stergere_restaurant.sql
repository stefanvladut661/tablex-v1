-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 08. Corectie: stergerea unui restaurant era imposibila
--
-- Descoperit la testarea fluxului de onboarding: "delete from restaurants"
-- eșuează mereu cu
--   P0001: Campul Telefon nu poate fi sters ... (spec §27.3)
-- fiindca stergerea cascadeaza in formular_campuri, iar trigger-ul
-- protejeaza_camp_telefon refuza randul 'telefon' indiferent de context.
--
-- Consecinta reala nu e doar la teste: stergerea la cerere a datelor (§22.1
-- GDPR) si scoaterea definitiva a unui cont (§43) ar fi fost blocate.
--
-- Regula corecta: campul Telefon e protejat cat timp EXISTA restaurantul.
-- Intr-o cascada, Postgres sterge intai randul-parinte, deci absenta lui e
-- exact semnalul "nu mai e nimic de protejat".
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.protejeaza_camp_telefon()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    -- Cascada de la stergerea restaurantului.
    if not exists (select 1 from public.restaurants r where r.id = old.restaurant_id) then
      return old;
    end if;

    if old.cheie = 'telefon' then
      raise exception 'Campul Telefon nu poate fi sters: e identificatorul unic al Clientului (spec §27.3).'
        using errcode = 'P0001';
    end if;
    return old;
  end if;

  if new.cheie = 'telefon' and (not new.activ or not new.obligatoriu) then
    raise exception 'Campul Telefon trebuie sa ramana activ si obligatoriu (spec §27.3).'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Functia e apelata doar de trigger; nu are ce sa caute in API-ul REST.
revoke execute on function public.protejeaza_camp_telefon() from public;
