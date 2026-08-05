import { Link } from 'react-router'

import { RUTE } from '@/lib/rute'
import { CadruPublic } from '@/components/layout/CadruPublic'

/**
 * Politica de Confidentialitate (§22.1).
 *
 * Exista fiindca formularele cer consimtamant GDPR, iar consimtamantul dat
 * pentru un document care nu exista nu e consimtamant. Textul descrie CE FACE
 * efectiv aplicatia — ce coloane se scriu, cine le vede, cat timp raman — nu
 * formule generice: o politica ce nu seamana cu produsul e mai rea decat una
 * care lipseste, fiindca pare acoperire.
 *
 * DATELE OPERATORULUI (denumire, CUI, sediu, email de contact, DPO daca e
 * cazul) sunt marcate mai jos si TREBUIE completate inainte de lansare. Nu le
 * pot inventa: identifica o firma reala fata de autoritate.
 */

const ACTUALIZAT = '3 august 2026'

function Sectiune({ titlu, children }: { titlu: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-base font-semibold tracking-tight">{titlu}</h2>
      <div className="grid gap-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export function ConfidentialitatePage() {
  return (
    <CadruPublic>
      {/* Logo-ul propriu a disparut din antet: pagina il purta fiindca n-avea
          bara. Acum o are, iar un al doilea logo sub primul arata a greseala. */}
      <div className="mx-auto grid max-w-2xl gap-8 px-6 pt-12 pb-16">
        <header className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.02em]">Politica de Confidențialitate</h1>
          <p className="text-sm text-muted-foreground">Ultima actualizare: {ACTUALIZAT}</p>
        </header>

        <div className="rounded-lg border border-status-expirare bg-status-expirare-soft px-4 py-3 text-sm">
          <p className="font-medium">De completat înainte de lansare</p>
          <p className="text-muted-foreground">
            Denumirea firmei, CUI-ul, sediul și adresa de contact pentru cereri GDPR trebuie
            completate în acest document. Până atunci apar ca spații marcate.
          </p>
        </div>

        <Sectiune titlu="Cine prelucrează datele">
          <p>
            Serviciul TableX este operat de <strong>[denumirea firmei]</strong>, CUI{' '}
            <strong>[CUI]</strong>, cu sediul în <strong>[adresa]</strong>. Pentru orice cerere
            legată de datele tale, scrie la <strong>[email de contact]</strong>.
          </p>
          <p>
            Rolurile sunt împărțite. Pentru datele conturilor de restaurant — numele tău, emailul,
            telefonul, datele de facturare — noi suntem operator. Pentru datele persoanelor care
            rezervă o masă, <strong>restaurantul este operatorul, iar noi suntem împuternicit</strong>
            : le păstrăm și le procesăm pentru el, la instrucțiunile lui, și nu le folosim în scop
            propriu.
          </p>
        </Sectiune>

        <Sectiune titlu="Ce date colectăm și de ce">
          <p>
            <strong>Despre cine rezervă:</strong> nume, telefon, adresă de email (dacă o completează),
            numărul de persoane, data și ora, notele lăsate de client și eventualele câmpuri
            suplimentare pe care le adaugă restaurantul în formular. Toate există pentru un singur
            scop: ca rezervarea să poată fi făcută, confirmată și găsită la sosire.
          </p>
          <p>
            <strong>Din folosirea repetată</strong> se formează fișa de client a restaurantului:
            numărul de vizite, ultima vizită, numărul de neprezentări și notele personalului. Ele
            servesc restaurantului la primire — nu se vând, nu se combină între restaurante și nu
            pleacă niciodată din contul restaurantului la care ai rezervat.
          </p>
          <p>
            <strong>Despre conturile de restaurant:</strong> numele persoanei, emailul, telefonul,
            rolul în echipă și datele firmei. Plus un jurnal de audit al acțiunilor importante, care
            există ca să se poată răspunde la „cine a schimbat asta și când".
          </p>
          <p>
            Mesajele trimise către clienți se consemnează într-un jurnal (destinatar, șablon, moment,
            rezultat), ca restaurantul să poată dovedi ce s-a trimis.
          </p>
        </Sectiune>

        <Sectiune titlu="Temeiul legal">
          <p>
            Rezervarea se face pe baza <strong>executării unui contract</strong> — fără datele de
            contact nu se poate ține masa și nu te putem anunța dacă apare o problemă. Bifa de
            consimțământ acoperă păstrarea datelor în fișa de client dincolo de rezervarea în sine.
            Jurnalul de audit și măsurile de securitate se bazează pe{' '}
            <strong>interesul legitim</strong> al restaurantului de a-și proteja datele.
          </p>
        </Sectiune>

        <Sectiune titlu="Cât timp păstrăm datele">
          <p>
            Fiecare restaurant își stabilește termenul de păstrare a datelor de client, din setările
            contului. La expirarea lui, datele sunt șterse{' '}
            <strong>automat, de un proces care rulează zilnic</strong>, nu la cererea cuiva.
            Rezervările rămân în evidența restaurantului atât timp cât e nevoie pentru obligațiile
            lui contabile și fiscale.
          </p>
          <p>
            Datele conturilor de restaurant se păstrează cât timp contul există. La închiderea lui se
            șterg, cu excepția documentelor pe care legea ne obligă să le arhivăm.
          </p>
        </Sectiune>

        <Sectiune titlu="Cine mai are acces">
          <p>
            Datele stau la <strong>Supabase</strong>, furnizorul nostru de găzduire a bazei de date,
            pe infrastructură din Uniunea Europeană. Emailurile tranzacționale pleacă printr-un
            furnizor specializat de email. Ambii prelucrează datele exclusiv pentru noi, pe bază de
            contract.
          </p>
          <p>
            <strong>Nu vindem date și nu le folosim pentru publicitate.</strong> Personalul unui
            restaurant vede exclusiv datele restaurantului lui — separarea e impusă la nivel de bază
            de date, nu doar în interfață.
          </p>
        </Sectiune>

        <Sectiune titlu="Drepturile tale">
          <p>
            Ai dreptul să ceri accesul la datele tale, corectarea lor, ștergerea, restricționarea
            prelucrării, portabilitatea, și să te opui prelucrării întemeiate pe interes legitim.
            Consimțământul dat poate fi retras oricând, fără ca asta să afecteze prelucrarea de
            dinainte.
          </p>
          <p>
            Dacă ai rezervat la un restaurant, cererea se adresează în primul rând{' '}
            <strong>restaurantului</strong>, care e operatorul acelor date; noi îl ajutăm tehnic să o
            ducă la capăt. Pentru datele contului de restaurant, scrie-ne direct nouă.
          </p>
          <p>
            Ai dreptul să depui plângere la Autoritatea Națională de Supraveghere a Prelucrării
            Datelor cu Caracter Personal (ANSPDCP), dacă socotești că ți-au fost încălcate
            drepturile.
          </p>
        </Sectiune>

        <Sectiune titlu="Cookie-uri">
          <p>
            Folosim un singur tip de stocare locală în browser: cea care ține sesiunea de
            autentificare, ca să nu-ți cerem parola la fiecare pagină. Nu folosim cookie-uri de
            publicitate și nu urmărim utilizatorii între site-uri.
          </p>
        </Sectiune>

        <Sectiune titlu="Modificări">
          <p>
            Dacă schimbăm acest document, actualizăm data de sus. Pentru schimbări care te privesc
            direct, anunțăm în aplicație înainte să intre în vigoare.
          </p>
        </Sectiune>

        <footer className="border-t border-border pt-6 text-sm">
          <Link to={RUTE.acasa} className="text-primary hover:underline">
            Înapoi la pagina principală
          </Link>
        </footer>
      </div>
    </CadruPublic>
  )
}
