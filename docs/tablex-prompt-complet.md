Construiește o aplicație SaaS B2B numită *TableX.ro* — sistem de rezervări și management al meselor pentru restaurante, cafenele și locații HoReCa.

## 0. VIZIUNE & POZIȚIONARE (context de business — folosește-l pentru copywriting pe landing page și pentru tonul general al UI-ului)

- *Poziționare:* Disruptor de piață — "alegerea incontestabilă": cea mai ieftină, simplă, rapidă și performantă soluție de pe piață.
- *Competitori vizați:* iaLoc Business, Restograf, OpenTable, SevenRooms.
- *Avantaje competitive de comunicat pe landing page:* Zero comisioane per rezervare, fără contracte pe termen lung, onboarding ultra-rapid, prețuri de până la 10x mai mici decât concurența.
- *Faza 1 — independență de POS:* Aplicația funcționează 100% independent de casa de marcat. Restaurantul folosește TableX pe tabletă/telefon/web doar pentru organizarea meselor; casa de marcat rămâne un sistem separat, fără integrare în acest v1.

## 1. STACK TEHNIC
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL, Auth, Realtime, Row Level Security, Edge Functions, Storage)
- Nu există niciun proiect Supabase existent — pornește de la zero (creează schema completă din prompt).
- Limba interfeței: *Română* (toate textele, butoanele, mesajele de eroare, emailuri).
- Nu integra Stripe sau procesare reală de plăți în acest v1 — construiește doar UI-ul, fluxurile și structura de date, gata de conectat printr-un prompt separat ulterior.

## 2. TERMINOLOGIE — respectă STRICT aceste denumiri peste tot (UI, denumiri de tabele, cod)

- *Super Admin* — tu și echipa TableX. Gestionează întreaga platformă, toate conturile de restaurante, și Floor Plan Studio-ul intern. Acces la tablex.ro/superadmin.
- *Admin* — business owner-ul / managerul restaurantului. Are cont propriu de restaurant, acces la tablex.ro/app/[slug].
- *Client* — persoana care face o rezervare. Nu are cont în platformă; interacționează doar prin widgetul public de rezervare sau iframe-ul embed pe site-ul restaurantului.

## 3. DESIGN SYSTEM — regula 60-30-10 (obligatorie)

*60% — Culoare dominantă (fundal/canvas):*
- Light mode: #F8FAFC (Slate 50) — fără efect de orbire la soare, util pe terase.
- Dark mode: #090D16 / #0F172A — pentru ambianța de seară/fine dining.

*30% — Culoare secundară (structură & navigație):*
- #1E293B (Slate-Navy închis / Carbon Slate) — transmite stabilitate B2B, precizie, ordine.

*10% — Culoare de accent (acțiuni principale, status "liber"):*
- #059669 / #10B981 (Verde Smarald) — calmează anxietatea pe teren, transmite control și eficiență.

*Traffic Light System pentru statusul meselor pe Harta 2D:*
- 🟢 Verde #10B981 — Masă liberă / confirmată
- 🔴 Roșu #EF4444 — Masă ocupată / în conflict
- 🟡 Galben/Amber #F59E0B — Masă în expirare (ultimele 15-20 min) / rezervare în așteptare
- 🟣 Violet #8B5CF6 — Masă cu bilet eveniment / VIP

Implementează Light Mode și Dark Mode complet (toggle), pentru ambele portaluri (Admin și Super Admin). Utilizatorul va încărca separat logo/paletă extinsă/fonturi de brand — folosește variabile CSS/theme, niciodată culori hardcodate în componente, ca să poată fi înlocuite ușor.

## 4. ARHITECTURA DE LINK-URI

- tablex.ro — Landing page public (single page, anchor scroll): Hero cu mesajul de poziționare, Prezentare funcționalități, Prețuri (ambele planuri), Demo interactiv/screenshot-uri, CTA înregistrare, Autentificare.
- tablex.ro/app/[nume-restaurant] — *Portalul Admin*, după login (routing path-based, NU subdomenii).
- tablex.ro/superadmin — *Super-Admin Command Center*, portal complet separat, securizat, acces exclusiv echipei TableX.
- tablex.ro/r/[nume-restaurant] — Pagină publică de rezervare pentru Clienți (standalone, pentru bio Instagram/Facebook + sursă pentru <iframe> embed pe site-ul restaurantului).

## 5. AUTENTIFICARE & ONBOARDING

- *Admin (self-service):* signup → creare cont → creare restaurant (nume, adresă, tip locație) → alegere plan (Start / Pro Floor) → pas de plată = placeholder UI ("Se va activa în curând", fără procesare reală) → acces la /app/[slug]/dashboard.
- Slug unic generat automat la signup, cu validare de unicitate și sugestii dacă e ocupat.
- Roluri în contul Admin: *Manager/Owner* (acces total) și *Ospătar/Staff* (acces limitat: floor plan live, check-in, fără settings/billing).
- *Super Admin* nu se înregistrează public — cont creat manual/prin invitație de un alt Super Admin, cu roluri interne (vezi secțiunea 8.7).
- RLS (Row Level Security) pe toate tabelele legate de restaurant_id, astfel încât un Admin să nu poată vedea date din alt restaurant. Super Admin are acces controlat, cu audit log pentru orice acțiune de tip Impersonate.

## 6. SCHEMA DE DATE (Supabase) — entități principale, toate cu RLS

- restaurants (id, slug, nume, adresă, plan curent, status — activ/suspendat, setări aprobare automată/manuală, durata implicită masă, buffer time)
- admin_users (id, restaurant_id, user_id, rol — manager/ospătar)
- super_admin_users (id, user_id, rol — Super-Admin / Designer-Architect / Support)
- zones (id, restaurant_id, nume zonă, ordine afișare)
- tables (id, zone_id, table_number, capacitate/nr scaune, poziție x/y pe canvas, formă — rotundă/pătrată/dreptunghiulară, status curent, table_id stabil folosit pentru legarea de rezervări — NU coordonatele vizuale)
- floor_plan_layers — separă Layer 1 (structură: pereți, uși, bar, zone speciale — editabil DOAR de Super Admin) de Layer 2 (mese/scaune — editabil de Admin)
- floor_plan_projects — organizare stil Google Drive: folders (per restaurant, cu sub-foldere per zonă/etaj) și files (versiuni de hartă salvate), gestionate exclusiv din Floor Plan Studio (Super Admin)
- floor_plan_requests (id, restaurant_id, zone_name, sketch_image_url, status — pending/in_progress/published, assigned_to, created_at)
- reservations (id, restaurant_id, table_id, client_nume, telefon, nr_persoane, data_ora, durata, status, sursă — widget/manual/walk-in/telefon)
- customers (id, restaurant_id, telefon, nume, tag-uri, istoric_vizite, nr_no_show)
- waitlist (id, restaurant_id, client, nr_persoane, timp_asteptare_estimat)
- events (id, restaurant_id, nume, data, descriere, tip, popup_alert_enabled, popup_alert_start_offset)
- tickets (id, event_id, table_id, client, cod_qr, status_plată, preț, comision_calculat)
- whatsapp_credits_wallet (id, restaurant_id, credite_disponibile, istoric_tranzacții)
- support_tickets (id, restaurant_id, subiect, mesaje, status, note_interne — vizibile doar Super Admin)
- system_health_logs (servicii: Supabase, Stripe, Meta WhatsApp Cloud API — status ultimul check)

## 7. REGULI DE BUSINESS LOGIC & OPERAȚIONAL (aplicabile în tot fluxul de rezervări)

1. *Durata implicită a mesei:* 2 ore (configurabilă între 1.5h și 3h din Setări) + *Buffer Time automat de 15–30 minute* între rezervări, pentru igienizare/debarasare — blocat automat în calendar.
2. *Alertă No-Show:* telefonul clientului e salvat pe customers. La 2+ neprezentări în istoric, sistemul afișează un *Red Flag* vizual (badge roșu) în CRM și la crearea unei noi rezervări pentru acel număr.
3. *Aprobare rezervări:* setare configurabilă per restaurant — Aprobare Automată vs. Aprobare Manuală/Pending.
4. *Traffic Light System* pe Harta 2D — conform culorilor din secțiunea 3.
5. *Gestionarea Overtime / Conflicte:*
   - Alertă vizuală pe masă cu 20 min înainte de expirarea rezervării curente.
   - Acțiuni rapide 1-click pentru Admin/Ospătar: Re-alocare pe altă masă liberă, Prelungire timp, Notificare WhatsApp de scurtă întârziere către clientul următor (UI pregătit, trimiterea reală rămâne mock în acest v1).
6. *Mecanismul Hărții 2D — Hybrid Layer:*
   - Layer 1 (structură — pereți, uși, bar, zone speciale): creat și editat EXCLUSIV de Super Admin, prin Floor Plan Studio.
   - Layer 2 (mese/scaune): editabil de Admin — poate muta, renumerota, schimba capacitatea sau uni mese (drag & drop), fără a putea strica structura de la Layer 1.
   - Identificator unic: rezervarea/comanda e legată de table_id (Supabase), nu de coordonatele vizuale — mutarea unei mese pe ecran nu pierde datele.

---

# 8. PORTALUL ADMIN — tablex.ro/app/[slug]

Sidebar cu exact 6 pagini principale, în această ordine:

## 8.1 📅 Calendar (Istoric & Volum Zilnic)
- Calendar lunar/săptămânal curat.
- Fiecare zi afișează: nr. total rezervări, nr. persoane sosite fizic (In-House/Completed), indicator vizual rapid (verde = zi plină, gri = zi slabă).
- *Buton Master „+ Walk-In"* — vizibil permanent, colț dreapta-sus. Caz de utilizare: intră un grup de pe stradă → Admin/Ospătar apasă „+ Walk-In" → alege nr. persoane + masă direct din aplicație → masa se blochează instant pe Harta 2D și pe widget/iFrame public, prevenind suprapunerea cu o rezervare online.

## 8.2 📑 List View (Registrul Operativ de Rezervări)
- Default: se deschide automat pe *Ziua Curentă*.
- Click pe o dată din Calendar → redirect automat în List View pe acea dată, în mod *Read-Only* (zile trecute/viitoare — doar pentru raportare).
- Pe *Ziua Curentă* (mod editabil, control live):
  - Tab-uri de filtrare rapidă: În Așteptare (Pending) | Confirmate | Sosite (In-House) | Anulate / No-Show.
  - Acțiuni: *[Acceptă]* / *[Respinge]*, re-alocare pe altă masă (dropdown mese libere), bifă „Marchează ca Sosit" / „Marchează No-Show".

## 8.3 📝 Formular (Form Builder — disponibil în toate planurile)
- Editor vizual drag-and-drop / toggle-uri.
- Câmpuri standard (sistem): Nume, Prenume, Telefon, Email, Data, Ora, Număr persoane.
- Câmpuri custom (adăugate de Admin): text liber (ex: „Preferințe alimentare/Alergii", „Scenariu Aniversare/Business") și checkbox/toggle (ex: „Doresc scaun de copil", „Accept politica de No-Show").
- Output: generare automată cod <iframe> pentru site + link direct scurt (bio Instagram/WhatsApp).

## 8.4 🗺️ Floor Plan (vizualizare & gestiune mese — NU structură)
- *Regulă critică de permisiuni: Admin poate edita DOAR mese și scaune (Layer 2). NU poate edita pereți, uși, bar sau zone speciale (Layer 1) — acestea sunt gestionate exclusiv de Super Admin prin Floor Plan Studio.*
- Buton permanent vizibil: *[➕ Solicită o nouă zonă / etaj]* — vizibil doar dacă restaurantul are Planul Pro Floor activ. Deschide formular de upload schiță/plan + descriere → creează un floor_plan_request, care intră în coada Super Admin.
- Când Super Admin publică o hartă: apare *instant (Realtime, Supabase)* în această pagină, fără reload/reinstall.
- În harta publicată, Admin poate: adăuga/muta/redimensiona mese, seta capacitatea (nr. scaune generate/distanțate automat în jurul mesei, vedere de sus), uni mese pentru grupuri — toate în interiorul structurii de pereți deja fixate de Super Admin.
- Status mese conform Traffic Light System.
- Export: cod <iframe> dedicat pentru Harta 2D + link direct pentru rezervări vizuale + comutator simplu între zone (Terasă, Salon, Etaj 1).
- *Pentru Planul Start:* pagina e vizibilă în navigație dar afișată cu *blur + lock overlay* și buton clar de upsell: „Deblochează Harta 2D — Upgrade la Pro Floor".

## 8.5 🎷 Evenimente (Bilete & Pop-up Alertă)
- Creare eveniment (nume, dată, descriere, capacitate, afiș/poză).
- *Switch automat de Zi de Eveniment:* în ziua stabilită, interfața Floor Plan trece automat în *Mod Eveniment* (plată per masă/bilet, via Stripe — UI pregătit, fără procesare live în acest v1).
- *Toggle „Afișează Pop-up Alertă Eveniment pe Site":* activează un pop-up/banner pe widgetul public, cu perioadă configurabilă înainte de eveniment (ex: 1 săptămână / câteva zile). Conține poza de afiș, descrierea, prețul biletului și un buton CTA de tipul „Descoperă Evenimentul →" spre pagina evenimentului/rezervare.
- Alocare locuri/mese pe Harta 2D pentru eveniment (culoare Violet #8B5CF6).
- Bilet generat cu Cod QR (mock, fără plată reală — marcat clar în UI) + ecran de scanare QR (folosind camera telefonului/tabletei) pentru validare la intrare.

## 8.6 ⚙️ Setări
- Program de lucru (ore deschidere/închidere per zi).
- Durata implicită a unei rezervări + Buffer Time (vezi regulile din secțiunea 7).
- Gestionare conturi de acces (Manager vs. Ospătar).
- Balanță credite WhatsApp + buton „Reîncarcă" (20€ → 200 credite — funcțional în UI, fără procesare reală de plată în acest v1).
- Planul curent de abonament (Start/Pro Floor) + upsell.

---

# 9. SUPER-ADMIN COMMAND CENTER — tablex.ro/superadmin

Panou ultra-securizat, minimalist, proiectat pentru viteză operațională maximă, dedicat exclusiv echipei TableX.

## 9.1 Header / Nav-bar de sus

*Colț stânga sus:*
- Logo TableX Admin, cu insignă [SUPER-ADMIN].
- *Tenant Switcher* (Quick Jump, Cmd+K / Ctrl+K): căutare rapidă după numele oricărui restaurant → intrare instantă în mod *Impersonate/Masquerade* (vezi exact ce vede Admin-ul în dashboard-ul lui — ideal pentru suport tehnic).

*Colț dreapta sus:*
- *Server Health Indicator:* punct verde/roșu pentru starea Supabase, Stripe și Meta WhatsApp Cloud API.
- *Notificări interne grupate pe urgență:*
  - 🔴 Roșu: solicitare nouă de Floor Plan nepreluată.
  - 🟡 Galben: un restaurant a rămas fără credite WhatsApp.
  - 🔵 Albastru: ticket nou de suport.
- Profil Super Admin + toggle Light/Dark Mode + Log Out.

## 9.2 Sidebar — 7 secțiuni

### 9.2.1 📊 Overview / Dashboard Global
- Top Metric Bar (KPI-uri realtime): *MRR Total* (Plan Start 5€ + Plan Pro 10€), *Net Profit Credite WhatsApp* (marja din pachetele vândute), *Volum & Comisioane Evenimente* (total procesat prin Stripe + comisionul 3-5% colectat), *Restaurante Active* (defalcat Start vs. Pro Floor).
- Harta Live a Rezervărilor: grafic realtime al fluxului global de rezervări din toată rețeaua de restaurante.

### 9.2.2 🎨 Floor Plan Studio (modulul central — tratează-l cu maximă atenție)

*Organizare stil Google Drive:*
- Structură de foldere: un folder per restaurant, cu sub-foldere per zonă/etaj. Fiecare hartă salvată e un fișier versionat în interiorul folderului corespunzător.
- Navigare tip file explorer: listă/grid de foldere, breadcrumb, creare folder nou, redenumire, mutare, arhivare.

*Tab 1 — Queue (Lista de Solicitări):*
- Toate solicitările noi de la restaurantele cu Planul Pro Floor activ.
- Fiecare solicitare afișează desenul/schița grafică încărcată de Admin la trimitere.
- Buton principal per solicitare: *[ACCEPTĂ]*.

*Fluxul de procesare (declanșat la ACCEPTĂ):*
1. Se rulează *Generarea Automată AI (Best Guess): sistemul analizează desenul grafic încărcat de Admin (via Anthropic API cu suport de imagine, printr-o Supabase Edge Function) și creează instant o primă variantă vectorială estimativă — pereți principali, mese și scaune poziționate automat. **Acest rezultat AI este vizibil și utilizabil DOAR de echipa Super Admin — NU este niciodată expus Admin-ului ca opțiune rapidă.* E strict punctul de plecare intern al echipei.
2. Se deschide ecranul full-screen *Canvas Builder*, cu varianta auto-generată suprapusă peste schiță (schița originală rămâne vizibilă ca imagine de fundal, cu opacitate reglabilă printr-un slider).
3. *Ajustare manuală:* operatorul Super Admin finisează rapid detaliile — potrivește ușile/pereții, verifică numerotarea meselor, corectează erorile AI-ului.
4. Buton *[FINALIZAT & PUBLICĂ]:* schimbă statusul în Supabase (published), iar harta e trimisă automat pe contul restaurantului solicitant, devenind activă instant (Realtime) — vizibilă în pagina lor Floor Plan (secțiunea 8.4) fără reload.

*Tab 2 — Builder-ul Propriuzis (Manager Direct Clienți):*
- Selector/search rapid pentru a alege oricare dintre restaurantele existente.
- Manager centralizat al tuturor planurilor și zonelor deja create (Salon, Terasă, Etaj 1 etc.).
- Navigare instant între proiecte, adăugare zone noi, reconfigurări/modificări rapide la cererea clienților.

*Specificații tehnice ale Canvas Builder-ului:*
- *Fundal tip grid, toate elementele trase (drag & drop) fac **snap automat pe grid* — poziționare pixel-perfect.
- *Legendă/Paletă de elemente* (panel lateral, drag-in-drop pe canvas):
  - Mese rotunde
  - Mese pătrate / dreptunghiulare
  - La fiecare masă: setare număr de scaune → scaunele se generează și se *distanțează dinamic automat* în jurul mesei, corect poziționate în vedere de sus (top-down/upper view)
  - Pereți (segmente de linie)
  - Uși
  - Bar
  - Zone speciale (DJ, VIP, intrare, bucătărie)
- *Pereți cu snapping/continuitate:* când doi pereți sunt conectați manual (capăt lângă capăt), trebuie să se *unească vizual* (colțuri corecte, fără goluri) — pentru continuitate structurală reală.
- *Permisiuni pe Layer:* Layer 1 (pereți, uși, bar, zone speciale) — editabil DOAR din acest Builder, de Super Admin. Layer 2 (mese, scaune) — editabil și de Admin din portalul lui (secțiunea 8.4), cu aceleași reguli de grid/snap.
- table_id rămâne stabil în Supabase indiferent de poziția vizuală.

### 9.2.3 🏢 Restaurant Management
- Tabel complet cu toate restaurantele. Filtre rapide: Toate | Numai Start | Numai Pro | Suspendate/Neplătite.
- Acțiuni per restaurant (meniu 3 puncte):
  - *View Details:* date firmă, CUI, adresă, persoană de contact.
  - *Impersonate Account:* intrare directă în dashboard-ul Admin-ului, fără parolă.
  - *Extend Trial / Give Discount:* acordare zile gratuite sau reduceri tarifare.
  - *Suspend / Ban Account:* blocare temporară sau definitivă (neplată).
  - *Manual Floor Plan Unlock:* deblocare manuală a hărții 2D (util dacă plata s-a făcut prin transfer bancar/cash, în afara Stripe).

### 9.2.4 💰 Finance & Monetization (versiune DEMO / Placeholder în acest v1)
- Layout demo/mockup cu grafice, structuri vizuale de facturare și tabele simulate.
- Notă vizibilă în UI: automatizarea facturilor, integrarea webhooks Stripe, ledger-ul de plăți și rapoartele contabile detaliate se implementează printr-un prompt dedicat, ulterior.

### 9.2.5 💬 Communications (WhatsApp & Communications Gateway)
- Balanță Meta: creditul/bugetul rămas în contul oficial Meta API pentru trimiterea mesajelor.
- Template Manager: creare + trimitere spre aprobare Meta a șabloanelor oficiale (ex: „Confirmare Rezervare", „Reminder 2 ore").
- System Logs: jurnal detaliat cu starea tuturor mesajelor trimise și eventualele erori (ex: numere de telefon invalide).

### 9.2.6 🎫 Support (Support & Ticketing System)
- Inbox unificat: chat direct realtime + tichete generate din dashboard-ul Admin-ilor.
- Șabloane de răspuns rapid (1-click) pentru problemele frecvente.
- Sistem de note interne pe tichete, vizibile doar echipei TableX (ex: „I-am prelungit accesul cu 3 zile pentru reconfigurarea terasei").

### 9.2.7 ⚙️ Setări (System Settings & Staff Management)
- Roluri interne:
  - *Super-Admin* (tu): acces 100% — setări financiare, ștergeri, configurări de sistem, useri.
  - *Designer / Architect:* acces EXCLUSIV la modulul Floor Plan Studio (generare + desenare hărți), fără acces la date financiare sau suport.
  - *Support:* acces limitat doar la chat, tichete și vizualizarea datelor de contact ale clienților.
- Global App Settings: modificare prețuri globale ale abonamentelor, setare comision bilete (%), comutare în Maintenance Mode pentru actualizări majore.

## 9.3 Footer (colț dreapta jos)
- Versiunea aplicației: TableX v1.0.0 (Production).
- Indicator Webhook Supabase Realtime: confirmă conexiunea socket-to-socket live cu baza de date.

---

## 10. STRUCTURA DE PRICING ȘI MONETIZARE (referință completă pentru landing page, checkout, și Setări)

### 10.1 Abonamente Recurente (SaaS)

*🟢 Planul „START" — 5€/lună*
- Target: cafenele, bistro-uri, restaurante mici.
- Funcționalități: Registru digital de rezervări (Calendar + List View), Formular/Widget integrabil (Instagram/Facebook/Site), Notificări gratuite (Email + Push), CRM de bază, rezervări și useri nelimitați.
- *NU* are acces la Floor Plan (afișat cu blur + lock + upsell).

*🔵 Planul „PRO FLOOR" — 10€/lună + Setup Unic*
- Target: restaurante medii/mari, cu mai multe zone (Salon, Terasă, Etaj, Separeu).
- Funcționalități: tot din Start + Harta interactivă 2D (desenată de echipa Super Admin), status mese realtime, drag-and-drop mese (de către Admin), waitlist, alocare mese pe ospătari, organizare grupuri/unire mese, buton de solicitare zone noi.

### 10.2 Monetizare Hărți 2D (Floor Plan Setup) — model actualizat

- *Setup unic: 100€ acoperă până la 50 de mese, indiferent de câte zone/etaje sunt incluse.*
- *Peste 50 de mese: +2€ per masă suplimentară*, calculat automat.
- Taxa se încasează 100% în avans, printr-un calculator automat afișat în checkout-ul Admin-ului (UI pregătit, fără procesare live de plată în acest v1).
- Modificările din primele 30 de zile de la publicare sunt gratuite; reconfigurările ulterioare de sezon se taxează 25€–50€/intervenție.

### 10.3 Credite Notificări WhatsApp (Pay-As-You-Go)
- Model: pachet de credite preplătite (Prepaid Wallet).
- Preț: *20€ → 200 Credite WhatsApp* (0.10€/mesaj).
- 1 Notificare WhatsApp trimisă (confirmare/reminder) = 1 Credit consumat.
- Email & Push Notifications: 100% gratuit și nelimitat în toate planurile.

### 10.4 Modulul de Evenimente & Bilete (Monetizare pe Comision)
- Vânzare bilete/locuri la evenimente speciale (Party, Seara Jazz, Revelion).
- Procesare plăți: prevăzută via Stripe Connect (structură de date pregătită, fără integrare live în acest v1).
- Model financiar: comision automat de *3%–5% per bilet tranzacționat*, restul ajunge la restaurant.
- Securitate anti-fentare: locul/masa pe Harta 2D se blochează DOAR la plata efectivă cu cardul. La finalizare, clientul primește un Bilet cu Cod QR (Email/WhatsApp), scanat de Admin/Ospătar la intrare.

## 11. MODULUL CRM

- Listă Clienți cu telefon, nume, tag-uri custom, istoric vizite (dată, nr persoane, masă), badge Red Flag pentru no-show recurent (2+).
- Filtrare și căutare rapidă (după nume/telefon/tag).

## 12. WIDGET DE REZERVARE (Public, pentru Clienți)

- tablex.ro/r/[slug]: formular de rezervare (dată, oră, nr persoane, nume, telefon + câmpuri custom definite de Admin) → trimite cerere conform regulii de aprobare a restaurantului (automată/manuală).
- Afișează pop-up-ul de eveniment dacă e activat de Admin (secțiunea 8.5).
- Din pagina Formular (Admin): generator cod <iframe> gata de copiat + preview live al widgetului cu branding-ul restaurantului.

---

## 13. PRIORITATE DE CONSTRUCȚIE SUGERATĂ PENTRU LOVABLE

1. Auth (Admin + Super Admin, roluri separate) + schema Supabase completă + RLS + routing multi-tenant path-based
2. Landing page (tablex.ro) — cu mesajele de poziționare din secțiunea 0
3. Onboarding/signup Admin + selecție plan (Start/Pro Floor)
4. Portal Admin: Calendar + List View + buton Walk-In
5. Portal Admin: Formular (Form Builder) + Widget public de rezervare (/r/[slug])
6. Super-Admin Command Center: Overview + Restaurant Management
7. Super-Admin: Floor Plan Studio complet (structură foldere stil Drive + Queue + Canvas Builder cu AI best-guess intern + grid snap + legendă drag&drop + wall-snapping)
8. Portal Admin: Floor Plan (vizualizare hartă publicată + editare mese/scaune + buton solicitare zonă nouă + blur/lock pentru Start)
9. Portal Admin + widget public: Evenimente & Bilete (inclusiv pop-up alertă pe site)
10. CRM
11. Super-Admin: Communications, Support, Finance (demo), Setări & Roluri interne
12. Portal Admin: Setări (echipă, reguli rezervare, wallet WhatsApp, plan curent)

## 14. CE NU TREBUIE FĂCUT ACUM
- Nu integra Stripe sau orice procesor de plăți real (nici pentru abonamente, nici pentru bilete evenimente).
- Nu trimite notificări WhatsApp reale — Meta Cloud API rămâne doar UI/log simulat în Communications.
- Nu expune Generarea AI Best-Guess către Admin — este strict un instrument intern Super Admin, folosit doar în Floor Plan Studio.
- Nu permite Admin-ului să editeze pereți/uși/bar/zone speciale — doar mese și scaune (Layer 2).
- Nu presupune un logo/font fix — folosește variabile de theme ușor de înlocuit cu brandingul pe care utilizatorul îl va încărca separat.
- Nu integra sisteme POS/casă de marcat în acest v1.

---
---

# TableX.ro — ADDENDUM: Decizii de Business Logic (completare la promptul inițial)

> Acest document se lipește **imediat după secțiunea 14** a promptului inițial ("CE NU TREBUIE FĂCUT ACUM") și are prioritate asupra oricărei ambiguități rămase în textul original. Fiecare punct de mai jos e o decizie fermă, nu o sugestie.

---

## 15. REGULI DE REZERVARE — CLARIFICĂRI FINALE

15.1. **Anulare/modificare de către Client:** Clientul NU are niciun mecanism self-service de anulare sau modificare (fără link unic, fără portal). Orice schimbare a unei rezervări existente se face EXCLUSIV prin contactarea directă a restaurantului (telefon), iar modificarea efectivă în sistem e făcută manual de Admin/Ospătar din List View.

15.2. **Cereri Pending:** NU expiră automat niciodată. O cerere rămâne în starea "Pending" la nesfârșit până când Admin/Ospătar o tratează manual (Acceptă/Respinge). Nu implementa job-uri de auto-expirare pentru rezervări.

15.3. **Suprapunere mese (double-booking):** Blocare DURĂ la nivel de business logic + constraint în Supabase. Sistemul NU permite în niciun caz alocarea a 2 rezervări active pe aceeași masă în intervale orare care se suprapun (ținând cont și de buffer time din secțiunea 7.1 a promptului original). Acțiunea de re-alocare/confirmare eșuează cu mesaj de eroare clar dacă apare conflict — nicio opțiune de forțare/override pentru Admin.

15.4. **Grupuri mari / unire mese:** 100% manual. Sistemul NU sugerează automat combinații de mese. Admin selectează manual 2+ mese libere și le unește prin acțiunea existentă de pe Harta 2D (secțiunea 8.4 din promptul original).

15.5. **Prag minim de anticipare pe widget:** NU există. Clientul poate trimite o cerere de rezervare prin widget chiar și pentru câteva minute în viitor (nu pentru trecut, evident — validare de bază: data/ora trebuie să fie ≥ momentul curent).

---

## 16. WIDGET PUBLIC (/r/[slug]) — CLARIFICĂRI FINALE

16.1. **Câmp obligatoriu:** *Telefon* este singurul câmp de contact obligatoriu în formularul de rezervare. Email rămâne opțional (câmp normal, needitabil ca obligatoriu din Form Builder pentru câmpurile de sistem).

16.2. **Canal de confirmare:** La trimiterea cererii (și la Acceptare/Respingere), sistemul încearcă trimiterea prin *Email* (dacă a fost completat) ȘI prin *WhatsApp*, DAR mesajul WhatsApp se trimite DOAR dacă restaurantul are credite disponibile în `whatsapp_credits_wallet` (consumă 1 credit per mesaj). Dacă nu are credite, mesajul WhatsApp pur și simplu nu pleacă (fără eroare vizibilă către Client) — Admin vede în Setări balanța scăzută.

16.3. **Anti-spam/bot:** NU implementa nimic în v1 (fără captcha, fără rate-limiting special). Poate fi adăugat printr-un prompt separat ulterior.

16.4. **Widget dezactivat la suspendare:** Dacă `restaurants.status = suspended`, pagina `/r/[slug]` afișează automat un ecran de tip "Acest restaurant nu este disponibil momentan" în loc de formular, iar iframe-ul embed pe site-ul restaurantului afișează același mesaj. Cererile existente rămân în baza de date, doar trimiterea de cereri noi e blocată.

---

## 17. HARTA 2D / FLOOR PLAN — CLARIFICĂRI FINALE

17.1. **Conflict Layer 1 / Layer 2 după editare Super Admin:** Dacă Super Admin modifică structura (pereți) și rezultă suprapunere cu mese existente pe Layer 2, sistemul NU blochează și NU realiniază automat nimic. Generează doar o *alertă vizuală* (badge/notificare) vizibilă exclusiv în Super-Admin Command Center (secțiunea 9.1 — notificări interne), semnalând conflictul, ca operatorul să-l rezolve manual din Canvas Builder. Admin-ul restaurantului nu vede nimic special — mesele rămân afișate cum erau, urmând să fie corectate de Super Admin.

17.2. **Structura "Etaj/Zonă":** NU implementa o ierarhie de date separată Etaj → Zonă. Rămâne structura flat existentă din `zones` (secțiunea 6 din promptul original). Practic, fiecare `zone` (Terasă, Salon, Etaj 1, etc.) este propriul ei canvas independent, complet — cu propriul Layer 1 și Layer 2. UI-ul (atât în Floor Plan Studio pentru Super Admin, cât și în pagina Floor Plan pentru Admin — secțiunea 8.4) afișează un comutator/dropdown vizibil sus, tip buton de selecție, prin care se schimbă între zone; la schimbare, canvas-ul se reîncarcă complet cu schița arhitecturală a zonei alese.

17.3. **Elemente noi în Legenda Canvas Builder-ului** (adaugă la lista din secțiunea 9.2.2 a promptului original):
   - Mese rotunde, pătrate, dreptunghiulare (confirmat, deja existent)
   - Pereți, Uși, Bar (confirmat, deja existent)
   - Zone speciale: DJ Booth, Zonă VIP, Intrare, Bucătărie (confirmat, deja existent)
   - **NOU: Plantă** (element decorativ, fără funcție logică — doar vizual pe canvas)
   - **NOU: Piscină** (element de zonă specială, dreptunghi/formă liberă, marchează suprafață neutilizabilă pentru mese)

17.4. **Validare capacitate masă:** La setarea numărului de scaune pentru o masă (atât în Floor Plan Studio de Super Admin, cât și în editarea Admin din secțiunea 8.4), sistemul aplică o *limită maximă rezonabilă* per masă individuală (ex: maxim 12 scaune per masă — valoare implicită, ajustabilă ulterior din config). Nu se pot adăuga numere nerealiste (ex: 50 de scaune la o singură masă) — validare hard la nivel de formular/UI.

17.5. **Istoric versiuni hărți:** Vizibil și accesibil DOAR de Super Admin, din `floor_plan_projects` (organizarea stil Google Drive — secțiunea 9.2.2). Admin-ul, în pagina lui Floor Plan (8.4), vede DOAR ultima variantă publicată — fără acces la istoric/versiuni vechi, fără opțiune de revenire.

---

## 18. EVENIMENTE & BILETE — CLARIFICĂRI FINALE

18.1. **Capacitate eveniment = scaune fizice existente.** NU există concept de "standing"/locuri fără masă. Capacitatea maximă a unui eveniment e determinată strict de numărul total de scaune generate pe Harta 2D a zonei alocate evenimentului. Dacă Admin are nevoie de mai multe locuri, trebuie mai întâi să adauge scaune la mese existente (respectând plafonul din 17.4) din secțiunea de editare mese — sistemul recalculează automat capacitatea maximă disponibilă pentru evenimente pe baza scaunelor curente.

18.2. **No-show la eveniment ≠ No-show din CRM.** Neprezentarea la un eveniment cu bilet NU incrementează contorul `nr_no_show` din `customers` și NU declanșează Red Flag-ul din CRM. Cele două logici (rezervare de masă standard vs. bilet eveniment) rămân complet separate în date și în UI.

---

## 19. CRM — CLARIFICĂRI FINALE

19.1. **Red Flag (2+ no-show):** Rămâne STRICT un badge vizual de avertizare (roșu) — informativ. Admin decide manual, de la caz la caz, dacă acceptă sau nu o rezervare nouă de la un număr cu Red Flag. NU implementa auto-blocare a rezervărilor online pentru numere marcate.

19.2. **Merge clienți duplicați:** Adaugă în CRM (secțiunea 11 din promptul original) o acțiune manuală "Unește clienți" — Admin selectează 2 profile din `customers` (de obicei aceeași persoană, numere de telefon diferite), alege care e profilul "principal", iar sistemul consolidează istoricul de vizite, tag-urile și contorul de no-show în profilul principal, arhivând/ștergând duplicatul.

---

## 20. CONTURI & ROLURI — CLARIFICĂRI FINALE

20.1. **Restaurante multiple (lanț):** NU implementa switcher multi-restaurant pentru un singur cont Admin. Fiecare restaurant necesită cont Admin separat, cu login separat, chiar dacă aparțin aceluiași proprietar/business.

20.2. **Trial gratuit:** NU există. Flow-ul de signup rămâne exact cel din promptul original (secțiunea 5): signup → creare restaurant → alegere plan (Start/Pro Floor) → placeholder de plată → acces la dashboard. Nicio perioadă gratuită intermediară.

20.3. **Suspendare restaurant de către Super Admin:**
   - Admin/Ospătar: blocare TOTALĂ a autentificării — la încercarea de login pe un restaurant suspendat, primește un mesaj clar ("Contul este suspendat, contactați echipa TableX") și nu ajunge deloc în dashboard.
   - Widget public (`/r/[slug]` + iframe): dezactivat automat, vezi punctul 16.4 de mai sus.

---

## 21. NOTIFICĂRI — CLARIFICĂRI FINALE

21.1. **Notificare Admin la rezervare nouă (mai ales Pending):** trimisă simultan prin *Push în aplicație* (badge + indicator vizual în sidebar/List View, conform mecanismului Realtime existent) ȘI *Email*. Ambele canale sunt implicite, gratuite, nelimitate — nu depind de credite.

21.2. **Reminder automat către Client (cu 2h înainte de rezervare):** trimis EXCLUSIV prin WhatsApp și DOAR dacă restaurantul are credite disponibile în wallet. NU există fallback automat pe email/push pentru acest reminder specific — dacă nu sunt credite, reminder-ul pur și simplu nu se trimite (Admin vede balanța scăzută în Setări/Communications).

---

## 22. TEHNIC & COMPLIANCE — CLARIFICĂRI FINALE

22.1. **GDPR:**
   - Checkbox de consimțământ OBLIGATORIU pe widgetul public (`/r/[slug]`), la trimiterea oricărei cereri de rezervare — text standard tip "Sunt de acord cu prelucrarea datelor mele (nume, telefon) în scopul gestionării rezervării, conform Politicii de Confidențialitate."
   - Politică de retenție date: adaugă un job/regulă configurabilă în Setări (Super Admin — Global App Settings, secțiunea 9.2.7) pentru ștergere/anonimizare automată a clienților inactivi după un număr de ani configurabil (implicit: 3 ani de la ultima vizită — Super Admin poate ajusta global).

22.2. **Export date:** Admin poate exporta din portalul lui (buton vizibil în List View și în CRM) datele de Rezervări și Clienți în format CSV/Excel, cu filtrele active aplicate (interval de dată, status etc.).

22.3. **Nivel tehnic de livrare:** Web responsive (mobil + tabletă + desktop) + PWA instalabilă (icon pe homescreen pentru tabletele de pe terasă/salon, folosite de Ospătari pentru Harta 2D live). Suport offline rămâne minimal/opțional în v1 — nu implementa sincronizare offline complexă, doar comportamentul standard de PWA (installable, splash screen).

---

## 23. IMPACT ASUPRA SCHEMEI DE DATE (completări la secțiunea 6 din promptul original)

- `customers`: adaugă câmp `gdpr_consimtamant` (boolean) și `data_ultima_vizita` (pentru job-ul de retenție).
- `reservations`: fără câmp de anulare de către client (nu există flow self-service); statusurile rămân gestionate exclusiv de Admin/Ospătar.
- `tables`: adaugă validare/constraint `max_scaune` (implicit 12) la nivel de aplicație.
- `floor_plan_requests` / `floor_plan_projects`: fără acces Admin la istoricul de versiuni — RLS trebuie să restricționeze `SELECT` pe versiuni vechi doar la `super_admin_users`.
- `events`: capacitatea maximă se calculează dinamic din suma scaunelor disponibile în zona alocată, nu se stochează ca număr fix editabil liber.
- `tickets` / `reservations`: fără legătură logică între `nr_no_show` (din `customers`) și no-show-uri la evenimente — se ține un contor separat (ex: `events.nr_no_show_eveniment`, dacă vrei tracking, dar fără efect asupra Red Flag-ului din CRM).
- Nou: tabel/funcție pentru **merge clienți** (audit — cine a unit, când, ce profiluri).
- Nou: câmp `restaurants.data_retentie_ani` (Super Admin global setting) pentru politica GDPR.

---

*Acest addendum + promptul inițial TableX.ro formează specificația completă v1. Nu mai există ambiguități de business logic în afara celor marcate explicit ca fiind lăsate pentru prompturi separate ulterioare (Stripe, POS, WhatsApp real, AI generation expusă Admin-ului).*
---
---

# TableX.ro — ADDENDUM PARTEA 2: Interfața Portalului Admin (Detaliu Complet)

> Completare la promptul inițial + Addendumul din Partea 1 (secțiunile 15-23). Acest document detaliază exact structura, comportamentul și interacțiunile din tablex.ro/app/[slug]. Are prioritate asupra oricărei ambiguități rămase.

---

## 24. LAYOUT GENERAL & NAVIGAȚIE

24.1. **Sidebar-ul are acum 7 pagini** (nu 6 ca în promptul original — se adaugă o pagină nouă înaintea Calendarului):

1. 🏠 **Acasă / Overview** (NOUĂ)
2. 📅 Calendar
3. 📑 List View
4. 📝 Formular
5. 🗺️ Floor Plan
6. 🎷 Evenimente
7. ⚙️ Setări (ascunsă complet pentru rolul Ospătar — vezi secțiunea 31)

24.2. **Sidebar desktop:** fix, mereu extins (nu colapsabil manual). Pe mobil (telefon): se transformă în hamburger menu clasic — icon sus-stânga, deschide un overlay peste tot ecranul cu cele 7 (sau 6, pentru Ospătar) opțiuni.

24.3. **Header (bară de sus), conține:**
   - Stânga: numele/logo-ul restaurantului (branding încărcat de Admin).
   - Dreapta: clopoțel de notificări (vezi 24.5), toggle Light/Dark Mode, profil utilizator (avatar + dropdown cu Nume, Rol, Log Out).
   - NU are search global în v1 — fiecare pagină (List View, CRM) are propriul search local.

24.4. **Pagina Acasă/Overview — conținut complet:**
   - Top Metric Bar cu KPI-uri realtime: Rezervări azi (total), Nr. persoane așteptate azi, % Ocupare mese (curent), Rezervări Pending nerezolvate (cu buton rapid spre List View filtrat), No-show-uri recente (ultimele 7 zile), Următoarele sosiri (mini-listă cronologică, următoarele 3-5 rezervări care urmează).
   - Layout: carduri KPI sus (grid), listă "Următoarele sosiri" dedesubt.
   - Vizibilă pentru ambele roluri (Manager și Ospătar).

24.5. **Clopoțel de notificări:** badge cu număr (notificări necitite) + dropdown la click, afișând ultimele notificări (rezervare Pending nouă, masă în expirare <20 min, credite WhatsApp epuizate). Click pe o notificare din listă → redirect direct la rezervarea/pagina relevantă. Notificările necitite se marchează automat ca citite la deschiderea dropdown-ului.

24.6. **Alertă realtime (toast) pentru evenimente noi (ex: rezervare Pending nouă via widget):** toast vizual în colțul ecranului + un sunet scurt de alertă (doar dacă Admin/Ospătar e activ/logat în aplicație în acel moment). Toast-ul dispare automat după câteva secunde sau la click.

24.7. **Confirmări pentru acțiuni importante:** orice acțiune distructivă sau cu impact (Respinge rezervare, Șterge masă, Suspendă cont staff) declanșează un popup de confirmare explicit ("Sigur vrei să...?") înainte de execuție. Nu se folosește pattern de tip "Undo toast" în v1.

24.8. **Empty states:** pentru orice listă/pagină goală (ex: List View fără rezervări în ziua curentă), afișează un mesaj prietenos + ilustrație/icon simplu + un buton CTA relevant pentru contextul respectiv (ex: "Nicio rezervare azi încă — adaugă un Walk-In" cu buton direct spre modalul de Walk-In).

24.9. **Loading states:** skeleton loaders (contur gri animat, forma aproximativă a conținutului care urmează) pentru orice zonă care așteaptă date din Supabase — nu spinner-uri generice.

---

## 25. CALENDAR (pagina 2 din sidebar) — DETALIU COMPLET

25.1. **3 tab-uri de vedere sus:** Lunar | Săptămânal | Zilnic.

25.2. **Vederea Zilnică:** timeline orar vertical (stil Google Calendar) — sloturi pe ore, toate rezervările din ziua respectivă plasate vizual pe axa orară, cu durata lor reprezentată ca bloc de înălțime proporțională.

25.3. **Vederile Lunar/Săptămânal:** fiecare zi afișează: nr. total rezervări, nr. persoane sosite fizic (In-House/Completed), indicator vizual rapid (verde = zi plină, gri = zi slabă) — conform promptului original.

25.4. **Click pe numărul/celula unei zile:** redirect direct în List View, pe acea dată, în mod Read-Only (pentru zile trecute/viitoare — vezi promptul original secțiunea 8.2).

25.5. **Filtru rapid pe zonă:** dacă restaurantul are mai multe zone (Terasă/Salon/Etaj 1 etc.), Calendarul afișează un selector/dropdown de filtrare rapidă pe zonă, vizibil în toate cele 3 vederi.

25.6. **Buton Master „+ Walk-In":** vizibil permanent colț dreapta-sus (pe desktop) / buton mare fix jos pe ecran, ușor de apucat cu degetul mare (pe mobil/tabletă). La apăsare, deschide un modal cu **Harta 2D live în miniatură** — Admin/Ospătar introduce nr. persoane, apoi dă click direct pe masa dorită de pe hartă (nu selectează dintr-un dropdown text). Masa se blochează instant (Realtime) pe Harta 2D principală și pe widget/iframe public.

25.7. **Caz limită — nicio masă liberă disponibilă la Walk-In:** sistemul afișează un mesaj simplu ("Nu există mese libere momentan") direct în modal. Nu se oferă auto-adăugare în Waitlist din acest flow — Admin decide manual dacă adaugă clientul în Waitlist separat (din Floor Plan, secțiunea 28).

---

## 26. LIST VIEW (pagina 3 din sidebar) — DETALIU COMPLET

26.1. **Format vizual:** carduri verticale (nu tabel clasic) — o rezervare = un card, afișate într-o listă derulabilă.

26.2. **Câmpuri afișate pe card:** configurabile de Admin (poate alege ce informații apar pe fiecare card — ex: poate ascunde "Sursă" dacă nu-l interesează, sau poate afișa mereu Masa). Setarea se salvează per cont Admin (preferință personală, nu globală per restaurant).

26.3. **Toate acțiunile sunt vizibile direct pe card** — fără a necesita un click suplimentar pentru a deschide un modal/panel separat. Card-ul conține direct: butoanele [Acceptă]/[Respinge], dropdown re-alocare masă, bife "Marchează Sosit"/"Marchează No-Show", și un câmp expandabil pentru note interne.

26.4. **Note interne:** fiecare card are un câmp de note interne (text liber), editabil de Admin/Ospătar, vizibil DOAR intern (Admin/Ospătar) — nu apare niciodată către Client.

26.5. **Sortare & căutare:** disponibile în cadrul zilei curente — sortare după oră sau după nume, plus căutare rapidă (după nume sau telefon).

26.6. **Fără acțiuni bulk în v1** — toate acțiunile (Acceptă/Respinge/Re-alocă/Marchează) se fac individual, o rezervare pe rând. Fără selecție multiplă (checkbox).

26.7. Tab-urile de filtrare rapidă rămân conform promptului original: În Așteptare (Pending) | Confirmate | Sosite (In-House) | Anulate / No-Show.

---

## 27. FORMULAR / FORM BUILDER (pagina 4 din sidebar) — DETALIU COMPLET

27.1. **Tipuri de câmpuri custom disponibile:** Text liber, Checkbox/Toggle, Dropdown cu opțiuni definite de Admin, Număr. (În plus față de câmpurile standard de sistem: Nume, Prenume, Telefon, Email, Data, Ora, Nr. persoane.)

27.2. **Câmpuri obligatorii:** Admin poate marca orice câmp custom ca fiind obligatoriu la completarea widgetului public.

27.3. **Câmpuri standard — editabile parțial:** Admin poate șterge/dezactiva orice câmp standard DIN Formular (ex: Email, Prenume) — cu EXCEPȚIA câmpului **Telefon**, care rămâne mereu prezent și obligatoriu (identificator unic pentru Client, folosit pentru CRM/No-Show).

27.4. **Ordinea câmpurilor este FIXĂ** (nu drag-and-drop reordonabilă): câmpurile standard rămase active apar primele (în ordinea standard), urmate de câmpurile custom, în ordinea în care au fost adăugate de Admin.

27.5. **Preview live:** Form Builder-ul funcționează în layout split-screen — editor în stânga, preview live al widgetului în dreapta, actualizat instant la fiecare modificare (fără a necesita salvare/refresh).

27.6. **Branding widget:** Admin poate încărca un logo și seta o culoare de accent pentru restaurantul lui — ambele se aplică automat pe widgetul public (`/r/[slug]`) și pe iframe-ul embed, suprascriind tema default TableX doar la nivel vizual (logo + culoare accent), nu structura.

27.7. Output rămâne conform promptului original: generare automată cod `<iframe>` + link direct scurt.

---

## 28. FLOOR PLAN — PORTAL ADMIN (pagina 5 din sidebar) — DETALIU COMPLET

28.1. **Fără toggle „Mod Editare" separat.** Interacțiunile de editare (mutare masă, unire mese, setare capacitate) sunt mereu disponibile direct pe hartă, fără a intra explicit într-un mod special.

28.2. **Click pe masă ocupată (roșie):** deschide un panel lateral (nu modal) cu detalii — client, oră, nr. persoane — plus acțiuni rapide (Re-alocă, Prelungește, Marchează Sosit/No-Show, Notificare WhatsApp întârziere).

28.3. **Click pe masă liberă (verde):** deschide direct formularul de rezervare/walk-in pre-completat cu masa respectivă selectată.

28.4. **Re-alocare prin drag-and-drop:** Admin/Ospătar poate trage vizual o rezervare de pe o masă pe alta (drag direct pe canvas), cu un popup de confirmare înainte de a finaliza mutarea.

28.5. **Setare capacitate masă:** Admin dă click pe o masă → introduce numărul de persoane/scaune dorite → la confirmare, scaunele se generează și se poziționează AUTOMAT în jurul mesei (distanțare dinamică, vedere de sus), cu un plafon maxim per masă (implicit 12, conform secțiunii 17.4 din Addendumul Partea 1).

28.6. **Ce POATE edita Admin pe hartă:** mutare mese, unire mese (pentru grupuri — la unire, mesele se "lipesc" vizual formând o formă combinată, iar o singură rezervare acoperă tot grupul unit), setare capacitate/scaune. **Ce NU poate edita:** nu poate adăuga elemente noi pe hartă (pereți, uși, bar, zone speciale, plante, piscină) — acestea rămân exclusiv Super Admin (Layer 1), conform regulii deja stabilite.

28.7. **Waitlist:** panou lateral, întotdeauna vizibil lângă Harta 2D (nu pagină separată). Când o masă se eliberează, Admin poate trage direct un client din Waitlist pe masa liberă nou apărută.

28.8. **Zoom & Pan:** harta se deschide implicit cu "fit to screen" (tot planul vizibil dintr-o privire, auto-scalat), cu zoom/pan manual disponibil pentru detalii suplimentare (util pentru restaurante cu multe mese/zone mari).

28.9. **Pe tabletă:** gesturi tactile native — tap-and-hold pentru a iniția drag pe o masă, pinch-to-zoom pentru zoom pe hartă.

28.10. **Formular „Solicită o nouă zonă/etaj":** conține upload al fișei/schiței arhitecturale de mese (imagine) + câmp text pentru numele zonei (ex: "Terasă", "Etaj 1"). Vizibil doar dacă restaurantul are Planul Pro Floor activ.

28.11. **Status solicitare vizibil pentru Admin:** pe pagina Floor Plan, Admin vede statusul curent al solicitării lui trimise către Super Admin — "În așteptare" / "În lucru" / "Publicată" — cu notificare (clopoțel + toast) când statusul se schimbă.

28.12. **Selector orar deasupra Hărții 2D (funcție critică — obligatorie):** deasupra canvasului, pe toată lățimea paginii Floor Plan, apare o bară orizontală cu sloturile orare ale zilei curente (ex: 12:00, 13:00, 14:00... conform Programului de lucru din Setări). Admin/Ospătar poate apăsa pe orice oră din această bară pentru a "derula" harta la acel moment din timp:
   - La selectarea unei ore, culorile meselor (Traffic Light System — verde/roșu/galben/violet) se recalculează instant, arătând disponibilitatea *proiectată* la ora respectivă, pe baza rezervărilor existente (data_ora + durată + buffer time) — nu doar starea live/curentă.
   - Implicit, selectorul e poziționat pe ora curentă (live, actualizată automat prin Realtime).
   - La selectarea unei ore diferite de "acum", harta intră vizual într-un mod clar de *Previzualizare* (ex: banner sus "Previzualizare pentru ora 19:00", cu buton rapid "Revino la Acum").
   - Durata pentru care o masă rămâne marcată ocupată (roșu) e determinată de setarea de durată implicită a rezervării configurată de Admin din Setări (implicit 2h, configurabilă între 1.5h și 3h — conform secțiunii 7.1 din promptul inițial), plus buffer time-ul automat.
   - Acest selector e disponibil atât pentru Admin, cât și pentru Ospătar, și funcționează identic pe desktop, tabletă și mobil.

---

## 29. EVENIMENTE (pagina 6 din sidebar) — DETALIU COMPLET

29.1. **Pagina principală Evenimente:** dashboard cu carduri mari, unul per eveniment — fiecare card afișează poza de afiș, numele, data, și statistici rapide (bilete vândute / capacitate totală).

29.2. **Creare eveniment nou:** wizard în 3 pași:
   - Step 1: Detalii (nume, dată, descriere, afiș/poză, capacitate).
   - Step 2: Alocare mese/locuri pe Harta 2D pentru eveniment.
   - Step 3: Configurare pop-up de alertă pe widget + preț(uri) bilet.

29.3. **Preț bilet variabil pe zonă/tip masă:** NU e neapărat un preț unic global — Admin poate seta prețuri diferite per zonă sau tip de masă (ex: masă VIP = preț mai mare decât Salon standard), configurat în Step 3 al wizard-ului.

29.4. **Preview pop-up:** înainte de a activa toggle-ul "Afișează Pop-up Alertă Eveniment pe Site" (din promptul original, 8.5), Admin vede un preview live al pop-up-ului exact cum va apărea pe widgetul public.

29.5. **Tab „Bilete Vândute":** în interiorul fiecărui eveniment, un tab dedicat afișează lista completă de bilete — client, status plată, cod QR, status scanat/nescanat.

29.6. **Ecran de scanare QR:** buton "Scanează" care deschide camera telefonului/tabletei DOAR când e apăsat (nu cameră activă permanent) — flow: apasă Scanează → cameră se deschide → scanează codul → validare instant (bilet valid/deja folosit/invalid) → cameră se închide, gata pentru următorul bilet.

29.7. **Acces Ospătar:** rolul Ospătar are acces COMPLET la pagina Evenimente — poate crea, edita și gestiona evenimente și bilete, la fel ca Managerul (excepție de la regula generală de acces limitat a Ospătarului).

---

## 30. SETĂRI (pagina 7 din sidebar, ascunsă pentru Ospătar) — DETALIU COMPLET

30.1. **Structură:** meniu lateral secundar (tab-uri) în interiorul paginii Setări: Program | Reguli Rezervare | Echipă | WhatsApp | Abonament.

30.2. **Program de lucru:** configurare implicită identică pentru toată săptămâna (un singur set de ore deschidere/închidere), cu opțiunea de a adăuga excepții punctuale (zile speciale, sărbători, închideri temporare) suprascriind programul standard pentru acea dată.

30.3. **Echipă (Manager/Ospătar):** Admin poate invita/dezactiva/șterge singur conturi de Ospătar direct din această secțiune, prin invitație trimisă pe email (fără a necesita intervenția Super Admin).

30.4. **WhatsApp Credits:** secțiune cu balanța curentă + grafic simplu al istoricului lunar de consum + MAI MULTE pachete de reîncărcare la alegere (ex: 20€/50€/100€, corespunzând la 200/500/1000 credite respectiv, la rata fixă de 0.10€/credit) — nu doar un singur pachet fix. Buton „Reîncarcă" per pachet ales (funcțional în UI, fără procesare reală de plată în v1).

30.5. **Abonament:** ecran simplu — plan curent afișat (Start/Pro Floor) + buton „Upgrade"/„Downgrade" + upsell dacă e pe Start. FĂRĂ istoric de facturare/facturi mock în v1 — facturarea reală rămâne pentru un prompt separat ulterior.

---

## 31. PERMISIUNI OSPĂTAR VS MANAGER — MATRICE COMPLETĂ

| Pagină/Funcție | Manager/Owner | Ospătar/Staff |
|---|---|---|
| Acasă/Overview | ✅ Acces complet | ✅ Acces complet |
| Calendar | ✅ Acces complet | ✅ Acces complet |
| List View | ✅ Acces complet | ✅ Acces complet |
| Formular (Form Builder) | ✅ Editare completă | ❌ Complet ascuns din sidebar |
| Floor Plan (vizualizare + editare mese) | ✅ Acces complet | ✅ Acces complet |
| Evenimente (creare/editare/bilete/scanare) | ✅ Acces complet | ✅ Acces complet |
| Setări (toate sub-secțiunile) | ✅ Acces complet | ❌ Complet ascuns din sidebar |

31.1. Sidebar-ul Ospătarului afișează exact aceleași pagini vizibile ca la Manager, MINUS Formular și Setări, care nu apar deloc (nu sunt doar blocate/read-only — sunt absente din navigație).

---

## 32. COMPORTAMENT MOBIL & TABLETĂ

32.1. Sidebar pe mobil (telefon): hamburger menu clasic — icon în colțul stânga-sus al header-ului, deschide un overlay/drawer peste tot ecranul cu lista de pagini.

32.2. Buton Master „+ Walk-In" pe mobil/tabletă: devine un buton mare, fix, poziționat jos pe ecran (nu în colț ca pe desktop) — optimizat pentru a fi apăsat ușor cu degetul mare, într-un mediu de lucru aglomerat (restaurant plin, mișcare rapidă).

32.3. Harta 2D pe tabletă: gesturi tactile native — tap-and-hold pe o masă inițiază drag-ul (nu necesită un buton separat de "mod editare"), pinch-to-zoom pentru zoom in/out pe canvas.

32.4. Aplicația e livrată ca web responsive + PWA instalabilă (conform Addendumului Partea 1, secțiunea 22.3) — util exact pentru acest scenariu de tabletă pe teren, cu icon pe homescreen.

---

## 33. IMPACT SUPLIMENTAR ASUPRA SCHEMEI DE DATE (completare la secțiunea 23 din Addendumul Partea 1)

- `reservations`: adaugă câmp `note_interne` (text, nullable).
- `admin_users`: adaugă câmp `list_view_columns_config` (JSON) pentru preferința personală de câmpuri vizibile pe carduri în List View.
- `restaurants`: adaugă câmpuri `logo_url`, `culoare_accent` (branding widget), `program_standard` (JSON per zi) + `program_exceptii` (tabel/JSON separat pentru zile speciale).
- Nou tabel: `notifications` (id, restaurant_id, user_id, tip, mesaj, link_target, citit — boolean, created_at) — alimentează clopoțelul din header.
- Nou tabel: `staff_invitations` (id, restaurant_id, email, rol, status, token, created_at) — pentru invitarea Ospătarilor de către Admin.
- `events`: adaugă suport pentru preț variabil — nou tabel `event_ticket_pricing` (id, event_id, zone_id sau table_type, preț) în loc de un singur câmp `preț` fix pe `events`.
- `whatsapp_credits_wallet`: adaugă tabel `whatsapp_credit_packages` (id, preț_eur, nr_credite) pentru pachetele multiple de reîncărcare (20€/50€/100€ etc.), plus istoric lunar agregat pentru graficul de consum.
- `zones`: rămâne flat (fără ierarhie Etaj→Zonă, conform 17.2), dar fiecare `zone` acționează ca un canvas independent complet, selectabil dintr-un comutator vizibil în Calendar, Floor Plan și Floor Plan Studio.

---

*Acest document + Promptul Inițial + Addendumul Partea 1 (secțiunile 15-23) formează specificația completă v1 pentru TableX.ro. Portalul Admin este acum complet detaliat la nivel de interacțiune. Rămâne pentru o rundă viitoare (dacă e nevoie): detaliul similar pentru Super-Admin Command Center.*
---
---

# TableX.ro — ADDENDUM PARTEA 3: Setup Tehnic pentru Claude Code (Kickoff)

> Completare tehnică, specifică lucrului cu Claude Code (agentic coding, execuție directă de comenzi terminal) — diferit de fluxul Lovable (un singur prompt interpretat integral). Secțiunea 13 din promptul inițial (Prioritate de Construcție) devine planul de faze literal, executat una câte una.

---

## 34. SETUP TEHNIC INIȚIAL

34.1. **Cerințe preliminare:**
   - Node.js 18+ instalat local.
   - Un cont Supabase (gratuit, pe supabase.com) — proiectul Supabase se creează DE LA ZERO, nu există unul existent (conform secțiunii 1 din prompt).
   - Supabase CLI instalat global: `npm install -g supabase`

34.2. **Scaffolding proiect (Vite + React + TypeScript):**
```bash
npm create vite@latest tablex -- --template react-ts
cd tablex
npm install
```

34.3. **Instalare Tailwind CSS:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
Configurează `tailwind.config.js` cu `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]` și adaugă directivele Tailwind (`@tailwind base; @tailwind components; @tailwind utilities;`) în `src/index.css`. Variabilele CSS pentru culorile din Design System (secțiunea 3) se definesc aici ca `:root` (light) și `.dark` (dark mode) — niciodată hardcodate în componente.

34.4. **Instalare shadcn/ui:**
```bash
npx shadcn@latest init
```
La prompturile CLI: TypeScript = Yes, Style = Default, Base color = Slate (aliniat cu paleta 60-30-10), CSS variables = Yes.
Adaugă componentele necesare pe măsură ce apar în build (ex: `npx shadcn@latest add button card dialog dropdown-menu tabs badge`).

34.5. **Router:**
```bash
npm install react-router-dom
```

34.6. **Client Supabase:**
```bash
npm install @supabase/supabase-js
```

34.7. **Creare & conectare proiect Supabase:**
```bash
supabase login
supabase init
supabase link --project-ref <PROJECT_REF>
```
`<PROJECT_REF>` se obține după crearea proiectului nou pe dashboard.supabase.com. Alternativ, proiectul poate fi creat integral din dashboard, iar Claude Code lucrează doar cu migrațiile SQL locale, aplicate manual sau prin `supabase db push`.

34.8. **Variabile de mediu** — `.env.local` (NU se comite în git):
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## 35. STRUCTURĂ DE FOLDERE RECOMANDATĂ

```
tablex/
├── src/
│   ├── pages/
│   │   ├── landing/              # tablex.ro
│   │   ├── admin/                # /app/[slug]/*
│   │   │   ├── acasa/
│   │   │   ├── calendar/
│   │   │   ├── list-view/
│   │   │   ├── formular/
│   │   │   ├── floor-plan/
│   │   │   ├── evenimente/
│   │   │   └── setari/
│   │   ├── superadmin/           # /superadmin/*
│   │   │   ├── overview/
│   │   │   ├── floor-plan-studio/
│   │   │   ├── restaurant-management/
│   │   │   ├── finance/
│   │   │   ├── communications/
│   │   │   ├── support/
│   │   │   └── setari/
│   │   └── public/               # /r/[slug] widget
│   ├── components/
│   │   ├── ui/                   # generate de shadcn
│   │   ├── shared/                # header, sidebar, toasts, empty-states
│   │   └── floor-plan/            # canvas, legendă, elemente drag&drop
│   ├── lib/
│   │   └── supabase.ts            # inițializare client
│   ├── hooks/                     # useAuth, useRealtimeReservations etc.
│   ├── types/                     # tipuri TS generate din schema Supabase
│   └── contexts/                  # AuthContext, ThemeContext, RestaurantContext
├── supabase/
│   ├── migrations/                # fișiere SQL, unul per modificare de schemă
│   └── seed.sql                   # date de test (restaurant demo, mese demo)
├── .env.local
└── CLAUDE.md                      # vezi secțiunea 36
```

---

## 36. FIȘIER CLAUDE.md RECOMANDAT (context permanent de proiect)

Se creează un fișier `CLAUDE.md` în rădăcina proiectului — Claude Code îl citește automat la fiecare sesiune, ca sursă de adevăr pentru convenții și reguli. Recomandare de conținut minim:

- Link/referință către acest document complet de specificații (`tablex-prompt-complet.md`, păstrat în repo, ex: în `/docs`).
- Regulile ne-negociabile: interfața 100% în Română; niciodată culori hardcodate (doar variabile CSS); RLS obligatoriu pe orice tabel nou legat de `restaurant_id`; terminologia strictă (Super Admin / Admin / Client — niciodată alți termeni echivalenți).
- Reamintire: NU integra Stripe, NU trimite WhatsApp real, NU expune AI Best-Guess către Admin (secțiunea 14 din prompt).
- Convenție de commit: un commit logic per fază din secțiunea 13 (Prioritate de Construcție), pentru istoric clar și posibilitate de rollback.

---

## 37. ORDINEA DE LUCRU CU CLAUDE CODE (adaptare a secțiunii 13)

Spre deosebire de Lovable (un prompt → build integral), cu Claude Code fiecare fază din secțiunea 13 devine o **sesiune/task separat**, cu review între ele:

1. Setup proiect (secțiunile 34-35 de mai sus) + schema SQL completă (migrații) + RLS + Auth — o singură sesiune mare, fundația.
2. Landing page — sesiune separată, poate rula în paralel/independent de restul.
3. Onboarding Admin (signup → creare restaurant → alegere plan).
4. Portal Admin: Acasă/Overview + Calendar + List View + Walk-In.
5. Portal Admin: Formular + Widget public.
6. Super-Admin: Overview + Restaurant Management.
7. Super-Admin: Floor Plan Studio (cel mai complex modul — recomandat ca sesiune dedicată, posibil împărțit în sub-sesiuni: Queue → Canvas Builder → AI Best-Guess Edge Function).
8. Portal Admin: Floor Plan (consumator al hărților publicate).
9. Evenimente & Bilete (Admin + widget).
10. CRM.
11. Super-Admin: Communications, Support, Finance (demo), Setări interne.
12. Portal Admin: Setări.

Recomandare: după fiecare fază, rulează aplicația local (`npm run dev`) și verifică manual înainte de a trece la faza următoare — Claude Code poate scrie teste unde e relevant, dar verificarea vizuală pe UI rămâne esențială pentru un produs cu atât de mult detaliu de interacțiune (Harta 2D, drag-and-drop, Realtime).
---
---

# TableX.ro — ADDENDUM PARTEA 4: Super-Admin Command Center (Detaliu Complet)

> Completare la promptul inițial + Addendumurile Părțile 1-3. Detaliază exact structura, comportamentul și interacțiunile din tablex.ro/superadmin. Are prioritate asupra oricărei ambiguități rămase, inclusiv asupra promptului inițial acolo unde apare o modificare explicită (vezi 38.2 — eliminare Impersonate).

---

## 38. HEADER / NAV-BAR SUPER-ADMIN — DETALIU COMPLET

38.1. **Tenant Switcher (Cmd+K / Ctrl+K):** se deschide ca un modal centrat, tip "command palette" — search bar mare sus, rezultate live sub el pe măsură ce Super Admin tastează numele unui restaurant. Click pe un rezultat → deschide direct modalul **View Details** al acelui restaurant (vezi 43.2), NU intrarea în dashboard-ul lui.

38.2. **⚠️ MODIFICARE IMPORTANTĂ FAȚĂ DE PROMPTUL INIȚIAL: Funcția de Impersonate/Masquerade este ELIMINATĂ COMPLET din specificație.** Super Admin NU poate intra în contul unui Admin, nu poate vedea dashboard-ul acestuia "din interior", și nu există sesiune de tip masquerade. Orice referire din promptul inițial la "Impersonate Account", "mod Impersonate/Masquerade" sau "audit log pentru acțiuni de tip Impersonate" (secțiunile 5, 9.1, 9.2.3) este anulată de acest punct. Suportul tehnic se face exclusiv prin datele vizibile direct în panourile Super Admin (View Details, Support, Audit Log) — fără a se substitui identității Admin-ului.

38.3. **Server Health Indicator:** click pe punctul verde/roșu deschide un mini-panel (popover) cu status detaliat per serviciu (Supabase, Stripe, Meta WhatsApp Cloud API) — fiecare cu propriul indicator + timestamp-ul ultimului check efectuat.

38.4. Restul header-ului (notificări grupate pe urgență, profil, toggle Light/Dark, Log Out) rămâne conform promptului inițial, secțiunea 9.1.

---

## 39. OVERVIEW / DASHBOARD GLOBAL (9.2.1) — DETALIU COMPLET

39.1. **"Harta Live a Rezervărilor"** — redenumită conceptual: NU este o hartă geografică. E un grafic/flux animat non-geografic, tip activity feed — o linie de timp pe care apar live (Realtime) rezervările din toată rețeaua de restaurante, pe măsură ce sunt create/confirmate.

39.2. **KPI-urile din Top Metric Bar** (MRR Total, Profit Net Credite WhatsApp, Volum & Comisioane Evenimente, Restaurante Active) au un **selector de perioadă** vizibil sus (Azi / Săptămână / Lună / An) — toate KPI-urile se recalculează în funcție de perioada selectată.

39.3. KPI-urile sunt **doar informative** — nu sunt clickabile, nu au click-through spre alte pagini.

---

## 40. FLOOR PLAN STUDIO — ORGANIZARE STIL GOOGLE DRIVE — DETALIU COMPLET

40.1. **Explorer-ul de foldere:** listă simplă (nu grid cu thumbnail-uri) — iconițe + nume folder/fișier, cu breadcrumb de navigare, conform promptului inițial.

40.2. **Versiuni vechi (arhivate):** NU pot fi deschise/previzualizate în Canvas Builder. Sunt doar listate (nume, dată, cine a publicat) — fără opțiune de vizualizare sau restaurare. Doar ultima versiune (published) e activă și deschisă.

40.3. **Creare versiune nouă:** complet automată. La fiecare apăsare pe **[FINALIZAT & PUBLICĂ]**, sistemul creează automat o nouă versiune (fișier nou în `floor_plan_projects`), iar versiunea anterior "published" trece automat în status "arhivată" — fără nicio acțiune manuală suplimentară din partea operatorului.

---

## 41. FLOOR PLAN STUDIO — TAB 1: QUEUE — DETALIU COMPLET

41.1. **Layout:** tabel/listă compactă tip inbox — un rând per solicitare (nume restaurant, zonă solicitată, dată trimitere, status), click pe rând deschide detaliile complete + schița încărcată.

41.2. **Fără atribuire formală (assigned_to) în v1** — orice membru al echipei (rol Super-Admin sau Designer/Architect) poate prelua și procesa orice solicitare din Queue, fără sistem de asignare/rezervare a tichetului.

41.3. **Re-rulare Generare AI:** dacă rezultatul Generării Automate AI (Best Guess) e nesatisfăcător, există un buton **"Reîncearcă Generarea AI"** care rulează din nou analiza imaginii (apel nou către Edge Function/Anthropic API), suprascriind complet rezultatul anterior (pereți/mese/scaune poziționate automat).

---

## 42. FLOOR PLAN STUDIO — CANVAS BUILDER — DETALIU TEHNIC COMPLET

42.1. **Grid configurabil:** slider vizibil pentru dimensiunea celulei de grid (fin / mediu / larg) + toggle separat pentru afișare/ascundere a liniilor de grid (fără a afecta snap-ul, care rămâne activ chiar dacă liniile sunt ascunse vizual).

42.2. **Undo/Redo complet:** Ctrl+Z / Ctrl+Y (sau Cmd+Z / Cmd+Shift+Z pe Mac) funcționează pentru orice acțiune din sesiunea curentă de editare (mutare, adăugare, ștergere, redimensionare element).

42.3. **Panou de proprietăți la selecție:** la click pe orice element de pe canvas (perete, masă, ușă, zonă specială), apare un panou lateral cu proprietăți editabile explicit: lățime, înălțime, rotație (grade), culoare/etichetă (unde e relevant) — nu doar drag vizual liber.

42.4. **Adăugare elemente din Legendă:** drag-and-drop direct din panoul lateral (Legendă) pe poziția exactă dorită pe canvas — nu click-then-place.

42.5. **Vizibilitate schiță originală (imagine de fundal):** toggle explicit de afișare/ascundere completă a schiței — pe lângă slider-ul de opacitate reglabilă (schița poate fi ascunsă total cu un click, nu doar redusă la opacitate minimă).

42.6. **Salvare draft separată de publicare:** două butoane distincte —
   - **[Salvează Draft]** — salvează progresul curent în `floor_plan_projects`, FĂRĂ a-l trimite/activa pe contul restaurantului (rămâne vizibil doar în Super-Admin, ca lucru în desfășurare).
   - **[FINALIZAT & PUBLICĂ]** — conform promptului original: schimbă statusul în `published`, trimite instant (Realtime) harta pe contul restaurantului.

42.7. Restul specificațiilor (snap automat, wall-snapping/continuitate pereți, table_id stabil, Layer 1 vs Layer 2) rămân conform promptului inițial, secțiunea 9.2.2.

---

## 43. RESTAURANT MANAGEMENT (9.2.3) — DETALIU COMPLET

43.1. **Coloane tabel:** Nume, Slug, Plan curent, Status (activ/suspendat), Data înregistrării, MRR generat, Acțiuni (meniu 3 puncte).

43.2. **"View Details":** modal simplu, read-only — afișează datele de firmă (CUI, adresă, persoană de contact) + un **tab/secțiune "Audit Log"** cu istoricul complet al acțiunilor Super Admin asupra acelui restaurant (cine, ce acțiune — Suspend/Extend Trial/Unlock/etc., când, motivul specificat).

43.3. **"Impersonate Account" — ELIMINAT** (vezi 38.2). Nu apare în meniul de acțiuni.

43.4. **"Extend Trial / Give Discount":** număr liber de zile introdus manual de Super Admin (nu preseturi fixe) — folosit ca excepție punctuală acordată manual, ținând cont că NU există trial gratuit automat la signup (conform Addendumului Partea 1, secțiunea 20.2).

43.5. **"Suspend / Ban Account":** deschide un modal care cere un **motiv obligatoriu** (text) înainte de confirmare — pentru evidență clară în Audit Log.

43.6. **"Manual Floor Plan Unlock":** acțiune simplă — un toggle "Deblocat manual" pe profilul restaurantului, fără câmpuri suplimentare (fără motiv/dată separate — acțiunea în sine apare deja în Audit Log cu timestamp).

---

## 44. FINANCE & MONETIZATION — DEMO/PLACEHOLDER (9.2.4) — DETALIU COMPLET

44.1. Pagina este construită complet ca UI final — grafice, tabele, structuri de facturare — populată cu **date fake realiste**, astfel încât să arate exact cum va arăta produsul final odată conectat la date reale (Stripe).

44.2. **Toată pagina este 100% read-only / non-interactivă** — Super Admin poate DOAR vizualiza (view), fără a putea edita, filtra funcțional sau exporta date reale din ea. E o previzualizare vizuală completă, nu un modul funcțional.

44.3. Nota vizibilă în UI (deja specificată în promptul inițial) rămâne: automatizarea facturilor, webhooks Stripe, ledger-ul de plăți se implementează printr-un prompt dedicat, ulterior.

---

## 45. COMMUNICATIONS (9.2.5) — DETALIU COMPLET

45.1. **Balanța Meta:** afișată cu un grafic simplu (procent/număr rămas din bugetul lunar Meta), pentru consecvență vizuală cu balanța WhatsApp Credits din portalul Admin.

45.2. **Template Manager:** formular simplu, text liber — Super Admin scrie numele șablonului + conținutul mesajului, fără sistem de variabile dinamice ({nume_client} etc.) și fără flow de aprobare simulat în v1. Șablonul se salvează direct ca listă de referință.

45.3. **System Logs** rămân conform promptului inițial — jurnal cu starea mesajelor trimise + erori.

---

## 46. SUPPORT & TICKETING (9.2.6) — DETALIU COMPLET

46.1. **Layout:** inbox stil Gmail/Helpdesk — listă de tichete în stânga, conversația deschisă (thread complet) în dreapta.

46.2. **Șabloane de răspuns rapid:** Super Admin poate crea/edita/salva propriile șabloane de răspuns (câmp text liber, salvate per operator sau global pentru echipă), reutilizabile cu 1-click în orice conversație.

46.3. **Prioritizare vizuală:** fiecare tichet are un badge de status/urgență ("Nou" / "Urgent"), iar lista se sortează automat după prioritate, apoi după vechime.

46.4. Notele interne pe tichete (vizibile doar echipei TableX) rămân conform promptului inițial.

---

## 47. SETĂRI & ROLURI INTERNE (9.2.7) — DETALIU COMPLET

47.1. **Gestionare echipă internă TableX:** tabel cu toate conturile Super Admin existente (rol: Super-Admin / Designer-Architect / Support) + buton "Invită membru nou" care trimite o invitație pe email (similar mecanismului de invitare Ospătar din portalul Admin).

47.2. **Maintenance Mode:** la activare de către Super Admin, sistemul afișează un **mesaj de mentenanță pe TOATE portalurile publice și de business** (Portal Admin + Widget public `/r/[slug]` + iframe embed), blocând TEMPORAR accesul complet la aplicație pentru Admin și Client, până la dezactivare manuală. Super-Admin Command Center rămâne accesibil (altfel Super Admin nu ar putea dezactiva modul).

47.3. **Modificare prețuri globale de abonament:** popup de confirmare standard (același pattern ca restul acțiunilor importante din secțiunea 24.7 a Addendumului Partea 2) — fără flow special de confirmare întărită (fără "scrie CONFIRM").

47.4. Restul (comision bilete %, roluri și permisiunile lor exacte) rămân conform promptului inițial, secțiunea 9.2.7.

---

## 48. IMPACT ASUPRA SCHEMEI DE DATE (completare finală)

- **ELIMINĂ** orice tabel/câmp legat de sesiuni de impersonare (nu se implementează `impersonation_sessions` sau echivalent).
- Nou tabel: `restaurant_audit_log` (id, restaurant_id, super_admin_user_id, actiune — suspend/extend_trial/unlock/etc., motiv, created_at) — populează tab-ul Audit Log din View Details.
- `floor_plan_projects`: adaugă status explicit `draft` (pe lângă `pending`/`in_progress`/`published`/`archived`), pentru a susține butonul separat "Salvează Draft".
- Nou tabel: `whatsapp_templates` (id, nume, continut, created_by, created_at) — fără câmpuri de variabile/status aprobare în v1.
- `support_tickets`: adaugă câmp `prioritate` (nou/urgent/normal).
- Nou tabel: `support_response_templates` (id, super_admin_user_id sau global, titlu, continut).
- Nou tabel: `super_admin_invitations` (id, email, rol, status, token, invited_by, created_at).
- Nou tabel/singleton: `app_settings` (id, maintenance_mode — boolean, pret_plan_start, pret_plan_pro, comision_bilete_procent) — editabil doar de rolul Super-Admin.
- Pagina Finance (44): NU necesită tabele reale suplimentare — se populează cu date mock generate în frontend (arrays hardcodate sau seed data separat, marcat clar ca fake), fără conexiune la tranzacții reale.

---

*Acest document, împreună cu Promptul Inițial și Addendumurile Părțile 1-3, formează specificația completă v1 pentru TableX.ro. Atât Portalul Admin, cât și Super-Admin Command Center sunt acum detaliate complet la nivel de interacțiune.*
---
---

# TableX.ro — ADDENDUM PARTEA 5: Autentificare & Design (Detaliu Complet)

> Completare la promptul inițial + Addendumurile Părțile 1-4. Detaliază exact fluxurile de autentificare (Admin, Ospătar, Super Admin) și limbajul vizual complet al aplicației.

---

## 49. AUTENTIFICARE — DETALIU COMPLET

### 49.1. Signup Admin (self-service)
Formularul de înregistrare colectează de la început: **Email, Parolă, Nume Firmă, CUI** — pe lângă pașii ulteriori de creare restaurant (nume restaurant, adresă, tip locație) și alegere plan, conform promptului inițial secțiunea 5.

**Cerințe parolă:** minim 8 caractere, minim o majusculă, minim o cifră (validare standard, atât la signup cât și la orice resetare de parolă).

**Verificare email:** OBLIGATORIE. Contul e creat, dar Admin e blocat complet — nu poate trece de ecranul de signup/nu accesează dashboard-ul — până nu confirmă adresa de email printr-un link trimis automat.

### 49.2. Login — comportament sesiune
**Sesiune persistentă implicit, fără expirare automată și fără checkbox "Ține-mă minte".** Odată logat, utilizatorul (Admin, Ospătar sau Super Admin) rămâne autentificat pe termen nelimitat, până la un Logout explicit.

**Fără limită de încercări greșite de login în v1** — nu există lockout temporar de cont după X încercări eșuate.

**"Am uitat parola":** flow standard — introduce email → link de resetare trimis pe email → setare parolă nouă pe o pagină dedicată.

### 49.3. Logout
Butonul Logout (din dropdown-ul de profil, header) cere **confirmare explicită** printr-un popup ("Sigur vrei să te deconectezi?"). La confirmare, utilizatorul e redirecționat la **pagina de login a restaurantului respectiv** (`/app/[slug]/login`).

### 49.4. Sesiuni multiple / multi-device
**Fără restricție.** Același cont (Admin, Ospătar sau Super Admin) poate fi autentificat simultan pe mai multe dispozitive/tab-uri/browsere, fără deconectare automată a sesiunilor anterioare.

### 49.5. Login unificat — un singur punct de intrare
**Există o singură pagină/formular de login la nivel de aplicație** (design unic, nu pagini vizual separate pentru Admin vs. Super Admin). După autentificare cu succes, sistemul verifică rolul contului (din `admin_users` sau `super_admin_users`) și redirecționează automat:
   - Cont Admin/Ospătar → `/app/[slug]/dashboard` (unde `slug` e determinat automat din restaurantul asociat contului).
   - Cont Super Admin → `/superadmin/overview`.

### 49.6. Autentificare Super Admin
**Fără 2FA în v1** — Super Admin folosește exact același mecanism email+parolă ca Admin-ul, fără pas suplimentar de autentificare în 2 factori (poate fi adăugat printr-un prompt separat ulterior, dacă e nevoie).

Conturile Super Admin **nu se auto-înregistrează** — se creează exclusiv prin invitație de la un alt Super Admin existent (confirmat, conform promptului inițial + Addendumul Partea 4, secțiunea 47.1): link unic pe email → Designer/Support-ul invitat își setează propria parolă la prima accesare a link-ului.

### 49.7. Invitație Ospătar — setare parolă
Identic mecanismului de Super Admin: Managerul trimite invitația din Setări → Echipă → Ospătarul primește un **link unic pe email** și își setează singur parola la prima accesare (nu o parolă temporară impusă de Manager).

### 49.8. Resetare parolă Ospătar de către Manager
Managerul poate reseta manual parola unui cont de Ospătar **direct din interfață** (Setări → Echipă → acțiune pe contul respectiv), fără a necesita trimiterea unui nou email — util pentru situații rapide pe teren (Ospătarul și-a uitat parola, Managerul are acces).

### 49.9. Schimbare parolă din cont propriu
Orice utilizator autentificat (Manager, Ospătar sau Super Admin) are o secțiune **"Schimbă parola"** accesibilă din dropdown-ul de profil (header), disponibilă în orice moment — nu doar prin flow-ul "Am uitat parola" de pe ecranul de login.

---

## 50. DESIGN SYSTEM — TIPOGRAFIE & LIMBAJ VIZUAL (completare la secțiunea 3 din prompt)

50.1. **Font principal:** Inter — folosit în tot UI-ul (Landing Page, Admin, Super Admin, Widget public), până când utilizatorul încarcă propriul font de brand (conform notei din promptul original, secțiunea 3, despre variabile de theme ușor de înlocuit).

50.2. **Border-radius:** `rounded-md` (colțuri ușor rotunjite) pe toate componentele — carduri, butoane, input-uri, modale. Stil echilibrat, neutru corporate, aliniat cu poziționarea B2B a produsului.

50.3. **Set de iconițe:** Lucide — folosit consecvent în toată aplicația, aliniat cu setul default din shadcn/ui (evită amestecarea mai multor librării de iconițe).

50.4. **Umbre/elevație:** umbre subtile (`shadow-sm` / `shadow-md`) pe carduri, modale și panouri laterale — pentru senzație de profunzime/layering, NU un stil complet flat.

50.5. **Micro-animații & tranziții:** accent consistent pe tranziții subtile în toată aplicația — hover states pe carduri/butoane, fade-in la încărcarea conținutului (complementar skeleton loaders din Addendumul Partea 2, secțiunea 24.9), slide pentru panouri laterale (ex: detalii masă pe Floor Plan, Waitlist). Stil general "polish" premium, nu minimalist/static.

50.6. **Erori de validare pe formulare:** câmp cu border roșu + text de eroare roșu dedesubt + iconiță de alertă (⚠️) lângă mesaj + o animație subtilă de "shake" (scuturare orizontală scurtă) pe câmp, declanșată la submit invalid — pentru a atrage atenția clar, fără a fi agresiv vizual.

---

## 51. LANDING PAGE — DETALIU COMPLET (completare la secțiunea 4 din prompt)

51.1. **Secțiunea Demo:** NU sunt simple screenshot-uri statice. E un **demo interactiv real** — o versiune mini/mock a Hărții 2D, complet click-abilă, integrată direct pe Landing Page, permițând vizitatorilor să interacționeze cu conceptul de Traffic Light System înainte de a se înregistra (mese colorate, click pe o masă arată un mic tooltip, fără date reale conectate — pur demonstrativ).

51.2. **Fără comparație explicită cu competitorii.** Landing page-ul comunică avantajele TableX (zero comisioane, fără contracte, onboarding rapid, prețuri mici) fără a numi sau compara direct cu iaLoc/Restograf/OpenTable/SevenRooms într-un tabel — poziționarea rămâne implicită, prin beneficii proprii.

51.3. **Secțiuni suplimentare adăugate:** **FAQ** și **Testimoniale**, pe lângă cele deja specificate în promptul original (Hero, Features, Prețuri, Demo, CTA, Autentificare). Testimonialele sunt placeholder/fake în v1, marcate vizual/discret ca atare (ex: prin conținut generic, fără a induce în eroare vizitatorii — de înlocuit cu testimoniale reale ulterior).

---

## 52. IMPACT ASUPRA SCHEMEI DE DATE (completare finală)

- `restaurants`: adaugă câmp `cui` (text) — colectat încă de la signup, nu doar la crearea restaurantului.
- `admin_users` / `super_admin_users`: se bazează pe Supabase Auth nativ pentru `email_confirmed_at` (verificare email) — nu necesită tabel custom suplimentar.
- Resetarea parolelor (flow "Am uitat parola" + resetare manuală de către Manager) folosește mecanismele native Supabase Auth (`resetPasswordForEmail` / `admin.updateUserById` pentru reset manual din partea Managerului, apelat printr-o Edge Function securizată, NU direct din client).
- `staff_invitations` / `super_admin_invitations` (deja definite în Addendumurile Părțile 2 și 4): confirmă flow-ul de "link unic → setare parolă proprie la prima accesare", NU parolă temporară impusă.

---

*Acest document, împreună cu Promptul Inițial și Addendumurile Părțile 1-4, formează specificația completă v1 pentru TableX.ro — acoperind acum integral: business logic, Portal Admin, setup tehnic Claude Code, Super-Admin Command Center, și Autentificare & Design.*
