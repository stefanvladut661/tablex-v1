-- Mesajele oprite din lipsa de credite primesc statusul lor, nu „esuat"
--
-- Enumul wa_mesaj_status are de la inceput valoarea 'fara_credite', iar ecranul
-- Communications (§45.3) are deja eticheta „Fara credite" si culoarea de
-- avertisment pentru ea. Numai ca nimeni nu o scria: consuma_credit_intern
-- insera 'esuat' si punea motivul in coloana `eroare`. Rezultatul era o valoare
-- de enum moarta si o ramura moarta in interfata.
--
-- Distinctia conteaza in operare, nu doar la curatenie. „Esuat" inseamna ceva
-- stricat la noi si se investigheaza; „fara credite" inseamna un restaurant
-- care trebuie doar sa reincarce, si se rezolva cu un telefon. In System Logs
-- cele doua se vad acum diferit dintr-o privire: rosu pentru defect, chihlimbar
-- pentru sold epuizat. Fara asta, un restaurant ramas fara credite arata la fel
-- ca o defectiune reala a gateway-ului.
--
-- Semnatura ramane identica, deci `create or replace` e suficient si drepturile
-- nu se pierd (regula 7). Se schimba un singur literal.

create or replace function public.consuma_credit_intern(
  p_restaurant_id uuid,
  p_telefon text,
  p_sablon text,
  p_continut text default null,
  p_reservation_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_restaurant_id is null or nullif(btrim(coalesce(p_telefon, '')), '') is null then
    return false;
  end if;

  if public.credite_whatsapp(p_restaurant_id) < 1 then
    insert into public.whatsapp_mesaje
      (restaurant_id, telefon, sablon, continut, status, eroare, reservation_id)
    values
      (p_restaurant_id, p_telefon, p_sablon, p_continut,
       'fara_credite', 'Fara credite disponibile', p_reservation_id);

    perform public.anunta_credite_epuizate(p_restaurant_id);
    return false;
  end if;

  insert into public.whatsapp_tranzactii (restaurant_id, tip, credite, descriere)
  values (p_restaurant_id, 'consum', -1, format('Mesaj: %s', p_sablon));

  insert into public.whatsapp_mesaje
    (restaurant_id, telefon, sablon, continut, status, reservation_id)
  values
    (p_restaurant_id, p_telefon, p_sablon, p_continut, 'trimis', p_reservation_id);

  -- Anuntam si la ATINGEREA lui zero, nu doar la urmatorul mesaj respins:
  -- adminul afla ca a ramas fara credite inainte sa piarda un mesaj.
  if public.credite_whatsapp(p_restaurant_id) = 0 then
    perform public.anunta_credite_epuizate(p_restaurant_id);
  end if;

  return true;
end;
$$;

-- Randurile deja scrise cu vechea conventie. Se recunosc fara ambiguitate dupa
-- pereche (status, eroare) — motivul era scris de functie, mereu identic.
update public.whatsapp_mesaje
   set status = 'fara_credite'
 where status = 'esuat'
   and eroare = 'Fara credite disponibile';
