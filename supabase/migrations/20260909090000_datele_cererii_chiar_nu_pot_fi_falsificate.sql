-- Datele de preluare si publicare chiar nu mai pot fi falsificate
--
-- Migratia precedenta promitea, in comentariul ei, ca `preluat_la` si
-- `publicat_la` „nu pot fi nici uitate, nici falsificate". Prima jumatate era
-- adevarata; a doua, nu. Trigger-ul doar COMPLETA cand valoarea lipsea si nu
-- respingea una trimisa de client, iar protejeaza_status_cerere_fp (care apara
-- status, ai_rezultat, ai_generat_la, procesat_de si assigned_to) nu stia de
-- coloanele nou adaugate. Politica floor_plan_requests_personal da Adminului
-- UPDATE pe cererea lui, deci un PATCH din consola putea scrie
-- `preluat_la = '2020-01-01'` sau rescrie motivul propriei respingeri.
--
-- Nu era o gaura de date critice, dar era exact tiparul pe care proiectul il
-- interzice: o regula scrisa in comentariu si nicaieri altundeva. Un comentariu
-- care minte e mai rau decat unul care lipseste, fiindca opreste urmatoarea
-- verificare.
--
-- ACUM: cele doua date se INTORC la valoarea veche la fiecare UPDATE, inainte
-- de orice altceva. Singurul drum prin care se schimba ramane stampilarea de
-- mai jos, care se declanseaza la tranzitia de status. La INSERT se golesc: o
-- cerere se naste pending, deci n-are cum sa fie deja preluata sau publicata.
--
-- Motivul respingerii ramane al echipei. Verificarea se face doar cand statusul
-- NU se schimba: cand se schimba, decizia apartine oricum lui
-- protejeaza_status_cerere_fp, care cere deja identitate de echipa — a duplica
-- regula aici ar insemna doua locuri de tinut minte si un mesaj de eroare care
-- s-ar putea contrazice cu celalalt.
--
-- Mesajul catre utilizator capata diacritice: ajunge verbatim in interfata,
-- prin mesajEroare, deci intra sub regula 1. Restul mesajelor din migratiile
-- vechi raman de corectat, nu le atingem aici.

create or replace function public.completeaza_datele_cererii_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.preluat_la := null;
    new.publicat_la := null;
  else
    -- Se ignora complet ce a trimis clientul pe cele doua coloane.
    new.preluat_la := old.preluat_la;
    new.publicat_la := old.publicat_la;

    if new.motiv_respingere is distinct from old.motiv_respingere
       and new.status is not distinct from old.status
       and not public.is_echipa_studio() then
      raise exception 'Motivul respingerii se scrie doar de echipa TableX.'
        using errcode = '42501';
    end if;
  end if;

  if new.status = 'respins'
     and nullif(btrim(coalesce(new.motiv_respingere, '')), '') is null then
    raise exception 'Respingerea unei cereri cere un motiv scris: Adminul trebuie să știe ce anume să corecteze.'
      using errcode = 'P0001';
  end if;

  if new.status is distinct from 'respins' then
    new.motiv_respingere := null;
  end if;

  if new.status = 'in_progress' and new.preluat_la is null then
    new.preluat_la := now();
  end if;

  if new.status = 'published' and new.publicat_la is null then
    new.publicat_la := now();
  end if;

  return new;
end;
$$;
