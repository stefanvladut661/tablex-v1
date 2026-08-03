-- ═══════════════════════════════════════════════════════════════════════════
-- Starea de citit a notificarilor devine A UTILIZATORULUI, nu a restaurantului
--
-- PANA ACUM: „citit" era coloana `notificari.citita_la`, pe randul notificarii.
-- Randul e insa UNUL SINGUR pentru tot restaurantul, deci primul care deschidea
-- clopotelul stingea bulina pentru toata echipa. Iar §24.5 cere marcarea
-- automata la deschiderea listei, ceea ce transforma orice privire intamplatoare
-- in stergere definitiva pentru colegi: ospatarul apuca sa vada cererea venita
-- din widget, managerul nu mai afla niciodata de ea. Nimic nu semnala pierderea,
-- fiindca interfata arata exact ce arata baza — zero necitite.
--
-- FORMA ALEASA: notificarea ramane una singura, iar CITIREA devine un rand
-- intr-un tabel de legatura. §33 cere `user_id` chiar pe tabela de notificari,
-- adica un rand per destinatar (fan-out la generare). Ne abatem deliberat:
--   1. Cele sapte functii care genereaza notificari sunt SECURITY DEFINER si
--      unele pornesc din pg_cron. Cu fan-out ar trebui sa stie, in momentul
--      inserarii, cine e echipa restaurantului, si sa scrie N randuri. Un
--      ospatar angajat maine n-ar vedea niciodata ce s-a intamplat ieri, iar
--      unul plecat ar lasa randuri orfane in clopotelul nimanui.
--   2. Deduplicarile existente sunt scrise pe „exista deja o notificare pentru
--      restaurantul asta"; cu fan-out fiecare ar deveni „pentru fiecare membru".
--   3. Textul e identic pentru toti; difera DOAR starea de citit. Exact
--      definitia unui tabel de legatura.
-- Abaterea e trecuta si in CLAUDE.md, la „Abateri asumate fata de spec".
--
-- UN SINGUR tabel, desi exista DOUA clopotele (restaurantul si echipa TableX):
-- cititorul e in ambele cazuri un `auth.users.id`, iar cine are voie sa marcheze
-- ce se deduce COMPLET din RLS-ul tabelei `notificari`. Politica de INSERT de
-- mai jos face un `exists` pe `notificari`, iar acel subselect e la randul lui
-- filtrat de politicile lui `notificari`: nimeni nu poate marca drept citit ceva
-- ce n-are voie sa vada, si asta fara sa repetam nicaieri regula de tenancy.
--
-- TREI REGULI IMPUSE AICI, NU IN INTERFATA:
--   1. Nimeni nu scrie starea de citit a altcuiva (`with check` pe auth.uid()).
--      Nici macar echipa TableX — pe tabela asta NU exista politica de super
--      admin, tocmai ca „Marcheaza tot" al unui coleg sa nu stinga bulina
--      celorlalti. E exact bugul reparat aici; ar fi absurd sa-l reintroducem
--      un etaj mai sus.
--   2. Nimeni nu mai scrie NIMIC pe randul notificarii: `notificari_marcare_admin`
--      dispare odata cu coloana. Pana azi ea dadea UPDATE pe TOATE coloanele
--      randului (o politica nu poate restrange coloane), deci un Admin isi putea
--      rescrie titlul unei notificari dintr-o consola de browser.
--   3. Marcarea in masa nu se poate exprima in PostgREST, deci trece prin doua
--      functii — dar SECURITY INVOKER, nu DEFINER: ele nu adauga niciun drept,
--      doar fac operatia set-based. Filtrul ramane RLS-ul, evaluat pentru contul
--      care apeleaza.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabelul de legatura ────────────────────────────────────────────────────
-- Fara restaurant_id: restaurantul e al notificarii, nu al citirii, iar o a
-- doua copie a lui ar putea sa divergeze.
create table if not exists public.notificari_citite (
  notificare_id uuid not null
    references public.notificari(id) on delete cascade,
  -- Default-ul face inserarea din client minimala (trimite doar notificare_id)
  -- si NU tine loc de politica: `with check` verifica oricum egalitatea cu
  -- auth.uid(). Daca scrie cineva cu service_role, auth.uid() e NULL si NOT
  -- NULL-ul opreste scrierea zgomotos, in loc s-o atribuie nimanui.
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  citita_la timestamptz not null default now(),
  primary key (notificare_id, user_id)
);

comment on table public.notificari_citite is
  'Cine a citit ce (§33). Un rand = "utilizatorul X a vazut notificarea Y". '
  'Lipsa randului INSEAMNA necitit; nu exista stare "necitita" scrisa.';

-- Niciun index in plus: singurul drum de acces e perechea completa
-- (notificare_id, user_id) — anti-join-ul din vedere si din functiile de
-- marcare — iar PK-ul il acopera.

alter table public.notificari_citite enable row level security;

create policy notificari_citite_citire on public.notificari_citite
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notificari_citite_marcare on public.notificari_citite
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notificari n where n.id = notificare_id)
  );

-- Nicio politica de UPDATE: momentul primei citiri e un fapt, nu se rescrie.
-- Nicio politica de DELETE: spec-ul nu cere „marcheaza ca necitit", iar
-- stergerea vine oricum prin cascada. Consecinta deliberata: un DELETE din
-- consola raspunde 200 cu ZERO randuri.
revoke all on public.notificari_citite from anon;
grant select, insert on public.notificari_citite to authenticated;

-- ── Vederea: notificarile mele, cu starea MEA de citit ─────────────────────
-- security_invoker = true: politicile lui `notificari` SI ale lui
-- `notificari_citite` se evalueaza pentru contul care intreaba. Vederea nu e un
-- ocol, e doar o forma — starea de citit a colegului nu iese, fiindca politica
-- de SELECT de pe notificari_citite o ascunde chiar in interiorul join-ului.
drop view if exists public.notificari_mele;

create view public.notificari_mele
with (security_invoker = true) as
  select n.id,
         n.restaurant_id,
         n.destinatie,
         n.tip,
         n.urgenta,
         n.titlu,
         n.mesaj,
         n.reservation_id,
         n.created_at,
         c.citita_la
    from public.notificari n
    left join public.notificari_citite c
      on c.notificare_id = n.id
     and c.user_id = (select auth.uid());

revoke all on public.notificari_mele from anon;
grant select on public.notificari_mele to authenticated;

-- ── Marcarea ───────────────────────────────────────────────────────────────
-- Ambele intorc cate au RAMAS necitite: 0 inseamna „s-a aplicat". Regula 6 cere
-- ca interfata sa nu scrie „gata" pentru o scriere pe care RLS a refuzat-o
-- tacut, iar aici refuzul chiar E tacut: INSERT-ul e alimentat de un SELECT deja
-- filtrat de RLS, deci nu arunca eroare, doar insereaza mai putin.
--
-- Numaratoarea din `marcheaza_notificari_citite` pleaca de la ID-URILE CERUTE
-- (unnest), nu de la notificarile vizibile. Diferenta conteaza: daca as numara
-- „cate dintre notificarile vizibile au ramas necitite", o notificare pe care
-- utilizatorul n-are voie s-o vada ar iesi din calcul cu totul si functia ar
-- raspunde 0 — adica „am marcat-o" pentru ceva ce nici macar nu exista pentru el.

create or replace function public.marcheaza_notificari_citite(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ramase integer;
begin
  insert into public.notificari_citite (notificare_id)
  select n.id from public.notificari n where n.id = any(p_ids)
  on conflict do nothing;

  select count(*)::integer into v_ramase
    from unnest(p_ids) as cerute(id)
    left join public.notificari_citite c
      on c.notificare_id = cerute.id
     and c.user_id = (select auth.uid())
   where c.notificare_id is null;

  return v_ramase;
end;
$$;

create or replace function public.marcheaza_toate_citite(
  p_destinatie public.notificare_destinatie
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ramase integer;
begin
  insert into public.notificari_citite (notificare_id)
  select n.id from public.notificari n where n.destinatie = p_destinatie
  on conflict do nothing;

  select count(*)::integer into v_ramase
    from public.notificari n
    left join public.notificari_citite c
      on c.notificare_id = n.id
     and c.user_id = (select auth.uid())
   where n.destinatie = p_destinatie
     and c.notificare_id is null;

  return v_ramase;
end;
$$;

-- `revoke ... from public` NU inchide accesul lui anon: Supabase acorda EXECUTE
-- explicit rolurilor anon si authenticated, iar un grant pe rol nu se stinge
-- revocand de la public. Rolul se numeste explicit. (Lectie invatata, migratia
-- 20260831090000.)
revoke all on function public.marcheaza_notificari_citite(uuid[]) from public, anon;
revoke all on function public.marcheaza_toate_citite(public.notificare_destinatie) from public, anon;
grant execute on function public.marcheaza_notificari_citite(uuid[]) to authenticated;
grant execute on function public.marcheaza_toate_citite(public.notificare_destinatie) to authenticated;

-- ── Deduplicarea creditelor epuizate nu se mai poate sprijini pe „necitit" ──
-- Pana acum functia nu insera un al doilea anunt cat timp exista unul NECITIT.
-- Cu starea de citit devenita personala, „necitit" nu mai e o proprietate a
-- notificarii, deci conditia si-ar pierde intelesul: coloana disparand, testul
-- ar fi mereu adevarat si restaurantul ar primi cate un anunt la FIECARE mesaj
-- respins. Il inlocuim cu o fereastra de timp — acelasi scop (sa nu spamam),
-- dar exprimat in ceva ce ramane al notificarii, nu al cititorului.
--
-- 24 de ore, nu mai putin: lipsa creditelor e o problema pe care proprietarul o
-- rezolva intr-o zi de lucru, si merita reamintita zilnic pana o rezolva. E si
-- mai putin zgomotos decat inainte: varianta veche insera un anunt nou imediat
-- ce cineva il citea pe cel precedent.
create or replace function public.anunta_credite_epuizate(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nume text;
begin
  select r.nume into v_nume from public.restaurants r where r.id = p_restaurant_id;

  if not exists (
    select 1 from public.notificari n
    where n.destinatie = 'super_admin'
      and n.tip = 'credite_epuizate'
      and n.restaurant_id = p_restaurant_id
      and n.created_at > now() - interval '24 hours'
  ) then
    insert into public.notificari (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
    values (
      p_restaurant_id, 'super_admin', 'credite_epuizate', 'galben',
      'Fara credite WhatsApp: ' || coalesce(v_nume, 'restaurant'),
      'Mesajele automate nu se mai trimit pana la reincarcare.'
    );
  end if;

  if not exists (
    select 1 from public.notificari n
    where n.destinatie = 'admin'
      and n.tip = 'credite_epuizate'
      and n.restaurant_id = p_restaurant_id
      and n.created_at > now() - interval '24 hours'
  ) then
    insert into public.notificari (restaurant_id, destinatie, tip, urgenta, titlu, mesaj)
    values (
      p_restaurant_id, 'admin', 'credite_epuizate', 'galben',
      'Creditele WhatsApp s-au terminat',
      'Confirmarile si reminderele WhatsApp nu se mai trimit. Reincarca din Setari.'
    );
  end if;
end;
$$;

-- ── Coloana veche dispare ──────────────────────────────────────────────────
-- Se STERGE, nu se pastreaza-si-ignora. Daca ar ramane, ar fi doua surse de
-- adevar, iar politica de UPDATE ar continua sa permita rescrierea intregului
-- rand din consola. Stergerea rupe `select('*')` si tipul generat — adica
-- esueaza la COMPILARE, zgomotos, exact unde vrem.
drop policy if exists notificari_marcare_admin on public.notificari;
drop index if exists public.notificari_necitite_idx;
alter table public.notificari drop column if exists citita_la;
