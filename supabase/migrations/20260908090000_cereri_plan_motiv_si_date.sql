-- Coada de cereri capata ce-i lipsea ca sa devina Queue + Projects
--
-- Ecranul Floor Plan Studio se imparte in doua: „Queue", unde stau DOAR cererile
-- noi (status pending) pentru recunoastere rapida, si „Projects", unde ajung
-- cele preluate in lucru. Impartirea se poate face si azi, din status — enumul
-- fp_request_status are deja pending / in_progress / published / respins.
-- Lipseau insa trei informatii pe care tabelul de proiecte trebuie sa le arate,
-- si o regula pe care interfata singura n-o poate garanta.
--
-- CE SE ADAUGA:
--   motiv_respingere — respingerea unei cereri fara motiv scris nu ajuta pe
--     nimeni: Adminul primeste un refuz si nu stie ce sa corecteze, iar echipa
--     nu-si mai aminteste peste o luna de ce a respins. Obligatoriu, si impus
--     AICI: un formular care cere motivul se ocoleste dintr-un PATCH.
--   preluat_la, publicat_la — coloana „data preluarii" si „publicat (si data
--     publicarii)" din tabelul de proiecte. Nu le cerem clientului sa le
--     trimita: sunt fapte despre CAND s-a intamplat ceva, nu date de intrare.
--     Trigger-ul le stampileaza singur la trecerea de status, deci nu pot fi
--     nici uitate, nici falsificate.
--
-- De ce stampilare automata si nu default pe coloana: default-ul se aplica la
-- INSERT, iar aici momentul care conteaza e o TRANZITIE — cererea se creeaza
-- pending si abia mai tarziu e preluata. La fel, o cerere republicata isi
-- pastreaza prima data de publicare doar daca nu suprascriem orbeste; de aceea
-- stampilam doar cand valoarea lipseste.
--
-- ATENTIE, corectat de migratia 20260909090000: versiunea de mai jos DOAR
-- completeaza cand valoarea e NULL — nu respinge una trimisa de client. Iar
-- protejeaza_status_cerere_fp nu acopera coloanele astea noi, deci politica
-- floor_plan_requests_personal lasa Adminul sa scrie `preluat_la` cu orice data
-- pe propria cerere. Promisiunea „nu pot fi falsificate" a devenit adevarata
-- abia in migratia urmatoare, care rescrie trigger-ul.

alter table public.floor_plan_requests
  add column if not exists motiv_respingere text,
  add column if not exists preluat_la timestamptz,
  add column if not exists publicat_la timestamptz;

comment on column public.floor_plan_requests.motiv_respingere is
  'Obligatoriu cand status = respins. Il vede Adminul care a facut cererea.';

create or replace function public.completeaza_datele_cererii_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Respingerea fara motiv nu e o respingere, e o tacere.
  if new.status = 'respins'
     and nullif(btrim(coalesce(new.motiv_respingere, '')), '') is null then
    raise exception 'Respingerea unei cereri cere un motiv scris: Adminul trebuie sa stie ce anume sa corecteze.'
      using errcode = 'P0001';
  end if;

  -- Motivul se sterge singur daca cererea e reluata: altfel ar ramane agatat de
  -- o cerere care nu mai e respinsa si ar deruta la urmatoarea citire.
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

revoke execute on function public.completeaza_datele_cererii_plan() from public, anon, authenticated;

drop trigger if exists trg_cerere_plan_date on public.floor_plan_requests;

create trigger trg_cerere_plan_date
  before insert or update on public.floor_plan_requests
  for each row execute function public.completeaza_datele_cererii_plan();
