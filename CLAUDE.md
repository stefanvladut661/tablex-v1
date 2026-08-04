# TableX.ro — context permanent de proiect

SaaS B2B de rezervari si management al meselor pentru restaurante (§0).
React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui + Supabase.

## Specificatia e sursa de adevar

**`docs/tablex-prompt-complet.md`** — 52 de sectiuni, promptul initial plus cinci
addendumuri. Toate referintele de tip §8.4, §28.12, §47.2 din cod, din migratii
si din `plan.md` trimit acolo. Addendumurile au prioritate asupra promptului
initial oriunde se contrazic (ex. §38.2 elimina complet Impersonate).

Documentul a lipsit din repo pana in sesiunea din 31 iulie 2026, iar absenta lui
a costat: verificarea „mai avem ceva de facut?" s-a facut luni de zile fata de
`plan.md` — jurnalul intern al sesiunilor — in loc de fata de specificatie. Asa
au ramas neobservate module intregi (Evenimente, pagina Acasa). **Cand raspunzi
la „e gata?", citeste spec-ul, nu jurnalul.**

`plan.md` ramane jurnalul: ce s-a facut, ce s-a decis si DE CE. Se completeaza la
finalul fiecarei sesiuni, nu inainte.

## Reguli ne-negociabile

1. **Interfata e 100% in romana.** Textele vizibile poarta diacritice; numele de
   fisiere, variabile, functii si tabele NU (`rezervari`, nu `rezervări`).
2. **Niciodata culori hardcodate.** Doar variabilele din `src/index.css`
   (60-30-10 + Traffic Light, §3). O culoare scrisa direct intr-o componenta e
   un bug, nu o scurtatura.
3. **Terminologie stricta** (§2): Super Admin (echipa TableX) / Admin (managerul
   restaurantului) / Client (cine rezerva). Nicaieri alti termeni.
4. **RLS obligatoriu** pe orice tabela noua legata de `restaurant_id`.
5. **Regula se impune in BAZA, nu in interfata.** Interfata doar nu arata butoane
   care ar esua. Orice regula aparata numai in React se ocoleste dintr-o consola
   de browser.
6. **Un UPDATE/DELETE respins de RLS raspunde 200 cu ZERO randuri, nu cu eroare.**
   Deci fiecare scriere din servicii cere `.select('id')` si verifica numarul de
   randuri. Fara asta, interfata scrie „Salvat" pentru ceva ce nu s-a intamplat.
   Lectia a fost invatata de trei ori; a treia oara pe stergerea zilelor speciale.
7. **`create or replace` nu schimba semnatura unei functii.** Daca se schimba
   lista de parametri sau coloanele intoarse, e nevoie de DROP + CREATE, iar
   drepturile (`grant execute`) se pierd la DROP si trebuie reasezate. Altfel
   PostgREST vede doua functii si raspunde cu ambiguitate la fiecare apel.

## Ce NU se face in v1 (§14)

- **Fara Stripe si fara procesare reala de plati** — nici abonamente, nici bilete.
  Se construiesc doar ecranele, fluxurile si structura de date, gata de conectat.
- **Fara WhatsApp real** — Meta Cloud API ramane UI si log simulat.
- **Fara Impersonate** (§38.2) — eliminat explicit din specificatie.
- **Rezultatul Generarii AI Best-Guess nu ajunge niciodata la Admin** — e unealta
  interna a echipei. `services/floor-plan.ts` evita intentionat sa selecteze
  `ai_rezultat`; pastreaza asta.
- **Adminul nu editeaza Layer 1** (pereti, usi, bar, zone speciale). Din migratia
  26, politica RLS o si impune.

## Abateri asumate fata de spec

Toate deliberate — daca schimbi una, schimba si randul ei de aici:

- **Rutele sunt `/app/...`, fara slug**, desi §4 cere `/app/[slug]`. Un cont
  apartine unui singur restaurant (§20.1), deci slug-ul in URL ar fi decorativ,
  iar prezenta lui ar cere validare pe fiecare ruta.
- **Sidebar-ul are 8 intrari, nu 7** (§24.1): Clienti (CRM, §11) e a opta.
  Spec-ul cere CRM-ul ca modul, dar nu-l listeaza in sidebar; e folosit zilnic,
  la telefon, iar ascunderea lui ar fi un regres.
- **Ospatarul NU muta mesele**, desi matricea §31 ii da „acces complet" pe
  Floor Plan. El foloseste harta (rezervari, walk-in, bara orara), dar mobila
  o rearanjeaza doar managerul — impus si de RLS pe `tables`. Un deget
  alunecat pe tableta, in sala plina, nu are voie sa strice planul.
- **rezerva_public are rate-limiting** (5 cereri/24h per telefon), desi §16.3
  cere explicit „nimic anti-spam in v1". API-ul e public si anonim; fara
  limita, un script poate umple sala cu cereri false intr-un minut.
- **Design: accent albastru royal, titluri Plus Jakarta Sans, colturi
  rounded-lg/xl si carduri flat cu ring**, fata de §3 (verde smarald) si §50
  (Inter peste tot, rounded-md, umbre subtile). Alegeri de directie vizuala
  facute la constructia landing-ului, comentate in `src/index.css`; schimba
  tokenii de acolo daca vrei alinierea la litera spec-ului.
- **Incadrarea publicata e CANVASUL zonei, nu o scara salvata.** §9.2.2 lasa
  echipa sa fixeze incadrarea, si asa a si fost: `zones.zoom_implicit`, aplicata
  peste un viewBox strans automat pe continut. Doua mecanisme suprapuse care nu
  se stiau unul pe altul — cu putine mese intr-un colt, „auto-centrarea" cerea o
  scara de sapte ori, iar la publicare planul aparea impins in coltul
  stanga-sus. Acum viewBox-ul E canvasul, containerul primeste raportul lui, iar
  un `clipPath` taie ce a ramas afara: se publica exact ce incape in chenar.
  `zoom_implicit` ramane coloana in baza (o vedere recreata cu DROP + CREATE
  si-ar pierde grant-urile catre `anon` — regula 7), dar n-o mai citeste nimeni.
- **Harta salii e mereu pe tema inchisa**, indiferent de tema aleasa in rest.
  Clasa `dark` sta pe containerul din `HartaZona` si `EditorZona`, deci rescrie
  tokenii doar inauntru. Planul se citeste de la distanta, in sala: pe fundal
  inchis mesele colorate ies in fata, iar tableta nu arunca lumina alba in ochii
  clientilor. Bulinele din `LegendaStatus` intra si ele in `dark`, altfel
  „inactiv" — singurul status care difera intre teme — ar arata alta culoare in
  legenda decat pe harta. La fel si `BaraOrara`: sta lipita deasupra planului si
  se citeste impreuna cu el, iar o bara alba peste un plan de noapte taia
  ecranul in doua exact acolo unde se uita ospatarul cel mai des.
- **Starea de citit a notificarilor sta intr-un tabel de legatura**
  (`notificari_citite`), nu ca `user_id` pe randul notificarii, cum arata
  definitia din §33. Forma din spec implica fan-out la generare: cele sapte
  functii care scriu notificari (SECURITY DEFINER, unele din pg_cron) ar trebui
  sa stie echipa restaurantului si sa scrie N randuri, un angajat nou n-ar mai
  vedea nimic din trecut, iar unul plecat ar lasa randuri orfane. Textul e
  identic pentru toti; difera doar cine a citit.

## Cum se verifica o functionalitate

Ritualul, in ordine:

1. **In baza, cu roluri reale.** `set local role authenticated` +
   `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'`,
   pe rand ca manager, ca ospatar si ca `anon`. Se verifica si refuzurile, nu
   doar reusitele.
2. **In browser**, intr-un context izolat (nu in sesiunea reala a
   proprietarului — o data s-a schimbat din greseala pretul planului Pro).
3. **`npm test` si `npm run build`** inainte de commit.
4. **Datele de test se sterg**, inclusiv utilizatorii din `auth.users` si
   randurile de audit produse pe drum.

Testele acopera in primul rand locurile unde o greseala e INVIZIBILA: nu arunca
eroare, doar da rezultatul gresit (fusuri orare, aranjarea in benzi, generarea
de slug, aritmetica editorului, tragerea pe calendar).

## Comenzi

```bash
npm run dev            # Vite
npm test               # vitest run
npm run build          # tsc + build
```

Migratiile stau in `supabase/migrations/`, un fisier per schimbare, cu
comentariu lung in capul lui care explica DE CE, nu doar CE. Se aplica pe
proiectul remote `xrwyscszfpiqeupqnahy`.
