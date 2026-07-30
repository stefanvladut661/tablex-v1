-- ═══════════════════════════════════════════════════════════════════════
-- TableX — 12. Corectie: trigger-ul de notificare bloca rezervarile din widget
--
-- Simptom, prins la primul apel real al lui rezerva_public:
--   42804: column "tip" is of type notificare_tip but expression is of type text
--
-- Cauza: intr-un INSERT ... VALUES, o expresie CASE care produce literali text
-- NU se converteste implicit la enum. Trigger-ul e AFTER INSERT, deci eroarea
-- lui anula toata tranzacția — adica orice cerere venita din widget.
--
-- Lecția, notata aici pentru viitor: fiecare valoare de tip enum calculata
-- dintr-un CASE are nevoie de cast explicit.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.notifica_rezervare_noua()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fus     text;
  v_ora     text;
  v_tip     public.notificare_tip;
  v_urgenta public.notificare_urgenta;
  v_titlu   text;
begin
  -- Doar cererile venite din widget; ce introduce personalul nu se anunta.
  if new.sursa <> 'widget' then
    return null;
  end if;

  select r.fus_orar into v_fus from public.restaurants r where r.id = new.restaurant_id;
  v_ora := to_char(new.data_ora at time zone coalesce(v_fus, 'Europe/Bucharest'), 'DD.MM HH24:MI');

  -- Tipurile se stabilesc in variabile tipizate, nu in CASE-uri inline.
  if new.status = 'pending' then
    v_tip     := 'rezervare_pending';
    v_urgenta := 'galben';   -- cere o decizie umana
    v_titlu   := 'Cerere de rezervare: ' || new.client_nume;
  else
    v_tip     := 'rezervare_noua';
    v_urgenta := 'albastru'; -- informativ
    v_titlu   := 'Rezervare noua: ' || new.client_nume;
  end if;

  insert into public.notificari (
    restaurant_id, destinatie, tip, urgenta, titlu, mesaj, reservation_id
  )
  values (
    new.restaurant_id, 'admin', v_tip, v_urgenta, v_titlu,
    v_ora || ' · ' || new.nr_persoane || ' persoane · ' || new.telefon,
    new.id
  );

  return null;
end;
$$;

revoke execute on function public.notifica_rezervare_noua() from public;
