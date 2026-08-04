import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'

import { ElementStructura } from '@/components/floor-plan/ElementStructura'
import { Masa } from '@/components/floor-plan/Masa'
import { useZoomPan } from '@/components/floor-plan/useZoomPan'
import { Button } from '@/components/ui/button'
import {
  ANCORE,
  LATURA_MINIMA,
  laPreciziaBazei,
  inCanvas as limiteazaInCanvas,
  pozitieFinala,
  redimensioneaza,
  type Ancora,
  type Cutie,
} from '@/lib/geometrie-plan'
import { cn } from '@/lib/utils'
import type {
  ElementStructura as Element,
  MasaHarta,
  StatusuriMese,
  ZonaHarta,
} from '@/types/floor-plan'

/** Se editeaza un singur strat odata — altfel testul de lovire e ambiguu:
 *  mesele se deseneaza PESTE structura si i-ar fura mereu clicul. */
export type Strat = 'mese' | 'structura'

/**
 * Tipul MIME al obiectelor trase din paleta pe canvas (§42.4). Propriu
 * aplicatiei, nu `text/plain`: asa o bucata de text trasa din alt tab nu poate
 * ateriza pe plan ca „perete".
 */
export const TIP_TRANSFER_OBIECT = 'application/x-tablex-obiect'

/** Latura manerului de redimensionare, in unitati de canvas la scara 1. */
const MARIME_MANER = 9

/**
 * Comenzile de vedere, raportate in sus. Zoom-ul traieste in acest hook, dar
 * butoanele lui stau in bara plutitoare a paginii — deci componenta le ofera,
 * iar pagina le apasa.
 */
export type ComenziVedere = {
  scara: number
  /** Sare la o scara anume, pastrand centrul (slider-ul manual, „100%"). */
  laScara: (scara: number) => void
  /**
   * Aduce CANVASUL intreg in ecran, la scara 1 si fara translatie — adica
   * exact incadrarea cu care planul se publica.
   *
   * Butonul facea pana acum altceva: strangea vederea pe dreptunghiul care
   * cuprinde continutul. Cu o singura masa in zona, aia cerea o scara de 7x,
   * plafonata la 4x — si „centrarea" ateriza in nasul unui scaun. Rostul
   * butonului e sa arate sala, nu sa caute obiecte.
   */
  centreazaCanvas: () => void
}

/** Cursorul potrivit fiecarui maner, ca sageata sa arate ce se va intampla. */
const CURSOR_MANER: Record<Ancora, string> = {
  nv: 'cursor-nwse-resize',
  se: 'cursor-nwse-resize',
  ne: 'cursor-nesw-resize',
  sv: 'cursor-nesw-resize',
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  e: 'cursor-ew-resize',
  v: 'cursor-ew-resize',
}

/** Centrul manerului, in coordonatele cutiei. */
function punctManer(cutie: Cutie, ancora: Ancora) {
  return {
    x: ancora.includes('v')
      ? cutie.x
      : ancora.includes('e')
        ? cutie.x + cutie.latime
        : cutie.x + cutie.latime / 2,
    y: ancora.includes('n')
      ? cutie.y
      : ancora.includes('s')
        ? cutie.y + cutie.inaltime
        : cutie.y + cutie.inaltime / 2,
  }
}

type Props = {
  zona: ZonaHarta
  stratActiv: Strat
  /** Layer 1 — din floor_plan_layers.continut. */
  structura: Element[]
  /** Layer 2 — randurile din tables. */
  mese: MasaHarta[]
  /**
   * Statusurile pentru momentul afisat (§28.12). Lipsa lor pastreaza
   * comportamentul editorului echipei: verde daca masa e activa, gri daca nu —
   * acolo nu conteaza cine sta la masa, ci unde e asezata.
   *
   * In panoul restaurantului, dimpotriva: aceeasi harta trebuie sa arate si
   * ocuparea live, altfel ospatarul ar avea nevoie de doua ecrane.
   */
  statusuri?: StatusuriMese
  masaSelectata: string | null
  /**
   * Apasare FARA deplasare pe o masa. Editorul echipei nu o foloseste (acolo un
   * clic doar selecteaza), dar in panou clicul deschide rezervarea, iar
   * tragerea muta masa — cele doua gesturi trebuie sa ramana distincte
   * (§28.2, §28.3, §28.6).
   */
  onDeschideMasa?: (id: string) => void
  /**
   * Fals pentru ospatar: el foloseste harta, dar nu rearanjeaza mobila
   * (RLS ii refuza oricum scrierea in `tables`). Clicul si tragerea unei
   * REZERVARI raman ale lui — sunt operatii de sala, nu de plan.
   */
  poateMutaMese?: boolean
  /** Ce rezervare sta pe fiecare masa la ora afisata, pentru tragerea din §28.4. */
  rezervariPeMese?: Record<string, { id: string; eticheta: string }>
  /** Tragerea s-a incheiat pe alta masa: apelantul cere confirmarea. */
  onMutaRezervare?: (rezervareId: string, peMasa: string) => void
  onSelecteazaMasa: (id: string | null) => void
  onMutaMasa: (id: string, x: number, y: number) => void
  /** Elementele de structura se identifica prin indice in array-ul jsonb. */
  structuraSelectata: number | null
  onSelecteazaStructura: (indice: number | null) => void
  onMutaStructura: (indice: number, x: number, y: number) => void
  /**
   * Redimensionarea prin manere. Lipsa lor ascunde manerele cu totul: in panoul
   * restaurantului mobila se muta, dar nu se modifica (RLS ii refuza oricum
   * scrierea, iar §8.4 lasa gabaritul in seama echipei).
   */
  onRedimensioneazaMasa?: (id: string, cutie: Cutie) => void
  onRedimensioneazaStructura?: (indice: number, cutie: Cutie) => void
  /**
   * Alinierea la grid, PORNITA implicit. Cand e oprita, obiectele raman exact
   * unde le lasi — pentru colturile pe care un pas de 20 nu le prinde niciodata.
   *
   * Previzualizarea arata acum pozitia ALINIATA, nu cea libera. Inainte gestul
   * urmarea degetul fidel si sarea pe grid abia la ridicare: de aici senzatia,
   * raportata de proprietar, ca „ceva magnetic trage obiectele in alta parte".
   * Magnetul era acolo tot timpul, doar ca se vedea prea tarziu. Cine vrea o
   * singura mutare libera tine Alt apasat.
   */
  snapLaGrid?: boolean
  /**
   * Un obiect din paleta a fost lasat pe canvas (§42.4 interzice explicit
   * modelul „armezi butonul, apoi dai clic pe plan"). Punctul e in coordonatele
   * CONTINUTULUI, deci gata de folosit; alinierea si limitarea le face
   * apelantul, care stie ce dimensiuni are obiectul.
   */
  onDropObiect?: (obiect: string, punct: { x: number; y: number }) => void
  /** Primeste comenzile de vedere, ca butoanele sa poata sta in afara canvasului. */
  onVedere?: (comenzi: ComenziVedere) => void
  /**
   * Zoom-ul interactiv, OPRIT implicit. Adminul si ospatarul vad planul la
   * incadrarea fixata de echipa (`zones.zoom_implicit`) — aceeasi pentru toti,
   * ca doua tablete din aceeasi sala sa nu arate doua planuri diferite.
   * Doar Canvas Builder-ul echipei porneste steagul.
   */
  permiteZoom?: boolean
  /**
   * Ignora raportul canvasului si umple cutia primita.
   *
   * Implicit componenta isi ia inaltimea din raportul canvasului, ca planul sa
   * incapa intreg fara benzi goale. In builder insa canvasul e asezat cu
   * `absolute inset-0` intr-un ecran intreg — si NU e adevarat ca `inset-0`
   * anuleaza `aspect-ratio`: Chrome rezolva latimea din inset-uri si deduce
   * inaltimea din raport, deci planul iesea pe sub marginea de jos. (Vazut in
   * browser: container de 700px, element de 1024px.)
   */
  umpleContainerul?: boolean
  /**
   * Schita originala ca imagine de fundal (§42.5), sub grid si sub straturi:
   * url semnat + opacitate 0..1. null/undefined = fara fundal. Randare pura —
   * nu participa la niciun gest.
   */
  fundal?: { url: string; opacitate: number } | null
  /**
   * Best Guess-ul AI (§9.2.2 pasul 1), desenat fantomatic PESTE straturi,
   * fara interactiune: operatorul vede estimarea si o preia/ajusteaza din
   * panoul editorului. Unealta echipei — nu ajunge niciodata la Admin.
   */
  overlayAI?: {
    structura: Element[]
    mese: Array<{ forma: string; x: number; y: number; latime: number; inaltime: number; capacitate: number }>
  } | null
  className?: string
}

type Gest = {
  pointerId: number
  strat: Strat
  /** id-ul mesei sau indicele elementului de structura. */
  cheie: string | number
  decalajX: number
  decalajY: number
  /**
   * Gest pornit pe o masa de cineva care nu are voie s-o mute (ospatarul).
   * Il tinem totusi, ca ridicarea pointerului sa poata deschide rezervarea:
   * altfel clicul pe masa n-ar mai face nimic pentru el.
   */
  blocat?: boolean
  /**
   * Manerul apucat. Prezenta lui schimba gestul din mutare in redimensionare;
   * `cutieInitiala` e cutia de la inceputul tragerii, fiindca toata aritmetica
   * se face fata de ea, nu fata de pasul anterior — altfel erorile s-ar aduna.
   */
  ancora?: Ancora
  cutieInitiala?: Cutie
  rotatie?: number
  /**
   * Punctul de pornire, in pixeli de ECRAN, si daca degetul a depasit pragul.
   *
   * Pana acum „s-a miscat?" se deducea comparand pozitia finala cu cea veche.
   * Cu previzualizarea aliniata asta nu mai merge: un obiect asezat off-grid
   * (venit din import sau din AI) ar fi fost mutat pe grid de un simplu CLIC,
   * fara ca nimeni sa fi tras de el. Deci intrebam degetul, nu aritmetica.
   */
  pornire: { x: number; y: number }
  miscat?: boolean
  /**
   * Ultima cutie previzualizata. La ridicare o comitem pe EA, nu una
   * recalculata din pointerup: altfel ce s-a vazut si ce s-a salvat sunt doua
   * socoteli diferite, care pot da doua rezultate.
   */
  ultima?: Cutie
}

/** Cat trebuie sa se miste degetul, in pixeli de ecran, ca sa nu fie clic. */
const PRAG_MISCARE = 3

/** Tragerea unei REZERVARI de pe o masa pe alta (§28.4) — alt gest, alt scop. */
type GestRezervare = {
  pointerId: number
  rezervareId: string
  dePeMasa: string
  x: number
  y: number
}

export function EditorZona({
  zona,
  stratActiv,
  structura,
  mese,
  statusuri,
  masaSelectata,
  onDeschideMasa,
  poateMutaMese = true,
  rezervariPeMese,
  onMutaRezervare,
  onSelecteazaMasa,
  onMutaMasa,
  structuraSelectata,
  onSelecteazaStructura,
  onMutaStructura,
  onRedimensioneazaMasa,
  onRedimensioneazaStructura,
  snapLaGrid = true,
  onDropObiect,
  onVedere,
  permiteZoom = false,
  umpleContainerul = false,
  fundal = null,
  overlayAI = null,
  className,
}: Props) {
  // Zoom-ul (rotita + butoane) vine din hook; pan-ul NU ii folosim handler-ele:
  // pointerdown-ul e deja impartit intre tragerea meselor si a rezervarilor,
  // asa ca vederea se trage doar cand gestul porneste pe canvas gol.
  //
  // Scara de pornire e 1, nu `zones.zoom_implicit`: canvasul E incadrarea, iar
  // la scara 1 el umple exact viewBox-ul. O scara salvata separat insemna doua
  // surse de adevar pentru acelasi lucru, si de acolo venea diferenta dintre
  // ce desena echipa si ce vedea restaurantul.
  const { refSvg, vedere, mareste, micsoreaza, laScara, reseteaza, deplaseaza } = useZoomPan(
    1,
    permiteZoom,
  )
  const idGrid = useId()
  /** Un obiect din paleta e purtat peste canvas: aratam unde va ateriza. */
  const [tragereDeasupra, setTragereDeasupra] = useState(false)

  // Sursa de adevar a gestului e ref-ul, nu starea: la o tragere scurta, cu un
  // singur pointermove, setState nu e inca vizibil in handler si gestul ar fi
  // citit gresit ca un simplu clic. Starea exista doar pentru previzualizare.
  const refGest = useRef<Gest | null>(null)
  const refGestRezervare = useRef<GestRezervare | null>(null)
  /** Tragerea VEDERII, pornita pe canvas gol. `miscat` desparte pan de clic. */
  const refPan = useRef<{ pointerId: number; x: number; y: number; miscat: boolean } | null>(null)
  const [tragereRezervare, setTragereRezervare] = useState<{ x: number; y: number } | null>(null)
  /** Cutia sub deget, in timpul gestului. Mutarea nu-i schimba dimensiunile. */
  const [previzualizare, setPrevizualizare] = useState<
    ({ strat: Strat; cheie: string | number } & Cutie) | null
  >(null)

  /**
   * Conversia din coordonate de ecran in coordonatele viewBox-ului.
   * Aici clientX/clientY sunt CORECTE (spre deosebire de calendar, unde a
   * trebuit pageY): getScreenCTM() lucreaza tot in spatiul clientului, deci
   * derularea paginii se anuleaza de ambele parti ale transformarii.
   */
  function laViewBox(eveniment: { clientX: number; clientY: number }) {
    const svg = refSvg.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const punct = svg.createSVGPoint()
    punct.x = eveniment.clientX
    punct.y = eveniment.clientY
    const { x, y } = punct.matrixTransform(ctm.inverse())
    return { x, y }
  }

  /**
   * Coordonatele CONTINUTULUI: viewBox minus transformarea de zoom/pan.
   * Toata aritmetica gesturilor (aliniere, limitare, decalaje) lucreaza aici —
   * altfel o masa trasa la zoom 2x ar sari la dublul distantei.
   */
  function laCanvas(eveniment: { clientX: number; clientY: number }) {
    const punct = laViewBox(eveniment)
    if (!punct) return null
    return {
      x: (punct.x - vedere.x) / vedere.scara,
      y: (punct.y - vedere.y) / vedere.scara,
    }
  }

  // Aritmetica de aliniere si limitare sta in lib/geometrie-plan.ts, ca sa fie
  // testabila fara DOM — vezi comentariul de acolo.
  const canvas = { latime: zona.canvas_latime, inaltime: zona.canvas_inaltime }

  function inCanvas(latime: number, inaltime: number, x: number, y: number) {
    return limiteazaInCanvas({ latime, inaltime }, canvas, { x, y })
  }

  /**
   * O masa scoasa din uz ramane gri indiferent de ce spun rezervarile: e
   * informatia care conteaza pentru cine se uita la sala. Restul vine din
   * statusurile momentului, iar in lipsa lor (editorul echipei) e verde.
   */
  function statusMasa(masa: MasaHarta) {
    if (!masa.activa || masa.indisponibila) return 'inactiv' as const
    return statusuri?.[masa.id] ?? ('liber' as const)
  }

  /** Cutia si rotatia obiectului tras, indiferent de stratul din care vine. */
  function masuraObiect(
    strat: Strat,
    cheie: string | number,
  ): (Cutie & { rotatie: number }) | null {
    if (strat === 'mese') {
      const masa = mese.find((m) => m.id === cheie)
      if (!masa) return null
      return {
        x: masa.pozitie_x,
        y: masa.pozitie_y,
        latime: masa.latime,
        inaltime: masa.inaltime,
        rotatie: masa.rotatie,
      }
    }
    const element = structura[cheie as number]
    if (!element) return null
    return {
      x: element.x,
      y: element.y,
      latime: element.latime,
      inaltime: element.inaltime,
      rotatie: element.rotatie ?? 0,
    }
  }

  function masuraGest(gest: Gest) {
    return masuraObiect(gest.strat, gest.cheie)
  }

  /**
   * Pasul de aliniere pentru gestul curent. Alt tinut apasat il anuleaza
   * temporar: butonul din bara ramane pornit, dar mutarea asta e libera —
   * exact pentru coltul pe care un pas de 20 nu-l prinde niciodata.
   */
  function pasulDeAliniere(eveniment: { altKey: boolean }) {
    return snapLaGrid && !eveniment.altKey ? zona.grid_marime : 0
  }

  /** Cutia obiectului selectat pe stratul activ — pe ea stau manerele. */
  const cheieSelectata = stratActiv === 'mese' ? masaSelectata : structuraSelectata
  const poateRedimensiona =
    stratActiv === 'mese'
      ? Boolean(onRedimensioneazaMasa) && poateMutaMese
      : Boolean(onRedimensioneazaStructura)
  const masuraSelectata =
    cheieSelectata === null ? null : masuraObiect(stratActiv, cheieSelectata)
  const previzualizareSelectata =
    previzualizare && previzualizare.strat === stratActiv && previzualizare.cheie === cheieSelectata
      ? previzualizare
      : null
  const cutieManere = previzualizareSelectata ?? masuraSelectata

  function laPointerDown(eveniment: PointerEvent<SVGSVGElement>) {
    const punctRezervare = laCanvas(eveniment)
    const insigna = (eveniment.target as SVGElement).closest('[data-rezervare-id]')

    // Tragerea unei REZERVARI are prioritate: insigna sta deasupra mesei, iar
    // cine o apuca vrea sa mute clientul, nu mobila (§28.4).
    if (insigna && punctRezervare && onMutaRezervare) {
      refGestRezervare.current = {
        pointerId: eveniment.pointerId,
        rezervareId: insigna.getAttribute('data-rezervare-id')!,
        dePeMasa: insigna.getAttribute('data-de-pe-masa')!,
        x: punctRezervare.x,
        y: punctRezervare.y,
      }
      setTragereRezervare({ x: punctRezervare.x, y: punctRezervare.y })
      try {
        eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
      } catch {
        // ignorat intentionat
      }
      return
    }

    const punct = laCanvas(eveniment)

    /**
     * Manerele stau DEASUPRA obiectului si se testeaza primele: altfel un maner
     * din interiorul conturului ar fi citit ca o apucare de obiect, si tragerea
     * ar muta masa in loc s-o redimensioneze.
     */
    const maner = (eveniment.target as SVGElement).closest('[data-maner]')
    if (maner && punct && cheieSelectata !== null && masuraSelectata && poateRedimensiona) {
      refGest.current = {
        pointerId: eveniment.pointerId,
        strat: stratActiv,
        cheie: cheieSelectata,
        decalajX: 0,
        decalajY: 0,
        ancora: maner.getAttribute('data-maner') as Ancora,
        cutieInitiala: {
          x: masuraSelectata.x,
          y: masuraSelectata.y,
          latime: masuraSelectata.latime,
          inaltime: masuraSelectata.inaltime,
        },
        rotatie: masuraSelectata.rotatie,
        pornire: { x: eveniment.clientX, y: eveniment.clientY },
      }
      try {
        eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
      } catch {
        // ignorat intentionat
      }
      return
    }

    const atribut = stratActiv === 'mese' ? 'data-masa-id' : 'data-structura-indice'
    const tinta = (eveniment.target as SVGElement).closest(`[${atribut}]`)

    if (!tinta) {
      // Canvas gol: gestul devine tragerea vederii. Deselectarea se muta pe
      // pointerup si se face doar daca vederea NU s-a miscat — un clic curat
      // ramane clic, o tragere ramane pan.
      const punctVedere = permiteZoom ? laViewBox(eveniment) : null
      if (punctVedere) {
        refPan.current = {
          pointerId: eveniment.pointerId,
          x: punctVedere.x,
          y: punctVedere.y,
          miscat: false,
        }
        try {
          eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
        } catch {
          // ignorat intentionat
        }
      }
      return
    }
    if (!punct) return

    const brut = tinta.getAttribute(atribut)!
    const cheie: string | number = stratActiv === 'mese' ? brut : Number(brut)

    if (stratActiv === 'mese') onSelecteazaMasa(cheie as string)
    else onSelecteazaStructura(cheie as number)

    const gest: Gest = {
      pointerId: eveniment.pointerId,
      strat: stratActiv,
      cheie,
      decalajX: 0,
      decalajY: 0,
      blocat: stratActiv === 'mese' && !poateMutaMese,
      pornire: { x: eveniment.clientX, y: eveniment.clientY },
    }
    const masura = masuraGest(gest)
    if (!masura) return

    gest.decalajX = punct.x - masura.x
    gest.decalajY = punct.y - masura.y
    refGest.current = gest

    // Captura pointerului: gestul supravietuieste iesirii de sub cursor.
    // Poate arunca daca pointerul nu mai e activ — nu e fatal, deci nu lasam
    // exceptia sa rupa inceputul gestului.
    try {
      eveniment.currentTarget.setPointerCapture(eveniment.pointerId)
    } catch {
      // ignorat intentionat
    }
  }

  function laPointerMove(eveniment: PointerEvent<SVGSVGElement>) {
    const pan = refPan.current
    if (pan && pan.pointerId === eveniment.pointerId) {
      const punct = laViewBox(eveniment)
      if (!punct) return
      // Delta in coordonatele viewBox-ului — acelasi spatiu in care hook-ul
      // isi tine translatia, deci pan-ul nu depinde de scara curenta.
      deplaseaza(punct.x - pan.x, punct.y - pan.y)
      refPan.current = { ...pan, x: punct.x, y: punct.y, miscat: true }
      return
    }

    const gestRez = refGestRezervare.current
    if (gestRez && gestRez.pointerId === eveniment.pointerId) {
      const punct = laCanvas(eveniment)
      if (punct) setTragereRezervare({ x: punct.x, y: punct.y })
      return
    }

    const gest = refGest.current
    // Cine nu poate muta mese nu vede nici previzualizarea mutarii.
    if (gest?.blocat) return
    // Legat de pointerId-ul care l-a inceput: altfel un pointerup ramas dintr-o
    // alta secventa (ex. dupa hot-reload cu butonul apasat) ar confirma mutarea.
    if (!gest || gest.pointerId !== eveniment.pointerId) return

    // Sub prag nu se intampla nimic: ecranul ramane exact cum era, deci un clic
    // pe un obiect nealiniat nu-l muta „singur" pe grid.
    if (!gest.miscat) {
      const distanta = Math.hypot(
        eveniment.clientX - gest.pornire.x,
        eveniment.clientY - gest.pornire.y,
      )
      if (distanta < PRAG_MISCARE) return
      gest.miscat = true
    }

    const punct = laCanvas(eveniment)
    if (!punct) return

    if (gest.ancora && gest.cutieInitiala) {
      const cutie = redimensioneaza(gest.cutieInitiala, gest.ancora, punct, {
        canvas,
        grid: pasulDeAliniere(eveniment),
        minim: LATURA_MINIMA,
        rotatie: gest.rotatie ?? 0,
        pastreazaRaport: eveniment.shiftKey,
      })
      gest.ultima = cutie
      setPrevizualizare({ strat: gest.strat, cheie: gest.cheie, ...cutie })
      return
    }

    const masura = masuraGest(gest)
    if (!masura) return

    // Previzualizarea arata pozitia FINALA, aliniata inclusiv: ce vezi in
    // timpul tragerii e exact ce se salveaza la ridicare.
    const dimensiuni = { latime: masura.latime, inaltime: masura.inaltime }
    const bruta = { x: punct.x - gest.decalajX, y: punct.y - gest.decalajY }
    const pas = pasulDeAliniere(eveniment)
    const pozitie = pas
      ? pozitieFinala(dimensiuni, canvas, pas, bruta)
      : limiteazaInCanvas(dimensiuni, canvas, bruta)

    gest.ultima = { ...dimensiuni, ...pozitie }
    setPrevizualizare({ strat: gest.strat, cheie: gest.cheie, ...dimensiuni, ...pozitie })
  }

  function laPointerUp(eveniment: PointerEvent<SVGSVGElement>) {
    const pan = refPan.current
    if (pan && pan.pointerId === eveniment.pointerId) {
      refPan.current = null
      try {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      } catch {
        // deja eliberata
      }
      // Clic curat pe gol (fara pan): pastram comportamentul vechi.
      if (!pan.miscat) {
        onSelecteazaMasa(null)
        onSelecteazaStructura(null)
      }
      return
    }

    const gestRez = refGestRezervare.current
    if (gestRez && gestRez.pointerId === eveniment.pointerId) {
      refGestRezervare.current = null
      setTragereRezervare(null)
      try {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      } catch {
        // deja eliberata
      }

      /**
       * Masa de sub deget se afla din DOM, nu din aritmetica: elementFromPoint
       * raspunde exact la „ce e sub cursor acum", inclusiv cand mesele se
       * suprapun partial. O socoteala pe dreptunghiuri ar fi trebuit sa
       * reproduca ordinea de desenare ca sa dea acelasi raspuns.
       */
      const sub = document.elementFromPoint(eveniment.clientX, eveniment.clientY)
      const masaTinta = sub?.closest('[data-masa-id]')?.getAttribute('data-masa-id')

      // Pe aceeasi masa, sau in gol: nu s-a cerut nimic.
      if (masaTinta && masaTinta !== gestRez.dePeMasa) {
        onMutaRezervare?.(gestRez.rezervareId, masaTinta)
      }
      return
    }

    const gest = refGest.current
    if (!gest || gest.pointerId !== eveniment.pointerId) return

    if (gest.blocat) {
      refGest.current = null
      try {
        eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
      } catch {
        // deja eliberata
      }
      if (gest.strat === 'mese') onDeschideMasa?.(gest.cheie as string)
      return
    }

    // Curatam intai starea gestului, apoi eliberam captura. Ordinea conteaza:
    // releasePointerCapture ARUNCA daca pointerul nu mai e capturat — se
    // intampla la pointercancel, unde browserul a eliberat deja captura. Cand
    // apelul era inaintea comiterii, exceptia abandona mutarea si lasa obiectul
    // blocat in pozitia de previzualizare. (Gasit la testare.)
    refGest.current = null
    setPrevizualizare(null)

    try {
      eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
    } catch {
      // deja eliberata — nu schimba nimic pentru noi
    }

    /**
     * Degetul nu s-a miscat: e un CLIC, si un clic nu scrie nimic in baza. In
     * panoul restaurantului are insa alt inteles — deschide rezervarea de pe
     * masa, sau walk-in-ul daca e libera.
     */
    if (!gest.miscat || !gest.ultima) {
      if (gest.strat === 'mese') onDeschideMasa?.(gest.cheie as string)
      return
    }

    // Se comite EXACT ce s-a vazut ultima data sub deget. O recalculare din
    // coordonatele lui pointerup ar fi o a doua socoteala, care poate da alt
    // rezultat decat previzualizarea.
    const cutie: Cutie = {
      x: laPreciziaBazei(gest.ultima.x),
      y: laPreciziaBazei(gest.ultima.y),
      latime: laPreciziaBazei(gest.ultima.latime),
      inaltime: laPreciziaBazei(gest.ultima.inaltime),
    }

    // ── Redimensionare ──
    if (gest.ancora && gest.cutieInitiala) {
      const start = gest.cutieInitiala
      const neschimbata =
        cutie.x === start.x &&
        cutie.y === start.y &&
        cutie.latime === start.latime &&
        cutie.inaltime === start.inaltime
      if (neschimbata) return

      if (gest.strat === 'mese') onRedimensioneazaMasa?.(gest.cheie as string, cutie)
      else onRedimensioneazaStructura?.(gest.cheie as number, cutie)
      return
    }

    const masura = masuraGest(gest)
    if (!masura) return
    if (cutie.x === masura.x && cutie.y === masura.y) return

    if (gest.strat === 'mese') onMutaMasa(gest.cheie as string, cutie.x, cutie.y)
    else onMutaStructura(gest.cheie as number, cutie.x, cutie.y)
  }

  /**
   * Anularea NU e o ridicare de deget. Pana acum `onPointerCancel` mergea in
   * acelasi handler, deci o palma pe tableta sau o intrerupere de sistem
   * salvau pozitia din acel moment. Cu manerele ar fi salvat si o dimensiune
   * pe care nimeni n-a apucat s-o vada: gestul intrerupt se abandoneaza.
   */
  function laPointerCancel(eveniment: PointerEvent<SVGSVGElement>) {
    refGest.current = null
    refGestRezervare.current = null
    refPan.current = null
    setPrevizualizare(null)
    setTragereRezervare(null)
    try {
      eveniment.currentTarget.releasePointerCapture(eveniment.pointerId)
    } catch {
      // browserul a eliberat-o deja la anulare
    }
  }

  /** Mutare de la tastatura: sageti = un pas de grid, cu Shift = un pixel. */
  function laTasta(
    eveniment: KeyboardEvent<SVGGElement>,
    obiect: { latime: number; inaltime: number; x: number; y: number },
    comita: (x: number, y: number) => void,
  ) {
    const pas = eveniment.shiftKey ? 1 : zona.grid_marime
    const deplasari: Record<string, [number, number]> = {
      ArrowLeft: [-pas, 0],
      ArrowRight: [pas, 0],
      ArrowUp: [0, -pas],
      ArrowDown: [0, pas],
    }
    const deplasare = deplasari[eveniment.key]
    if (!deplasare) return

    eveniment.preventDefault()
    const pozitie = inCanvas(
      obiect.latime,
      obiect.inaltime,
      obiect.x + deplasare[0],
      obiect.y + deplasare[1],
    )
    if (pozitie.x === obiect.x && pozitie.y === obiect.y) return
    comita(pozitie.x, pozitie.y)
  }

  /**
   * Centrarea inseamna „canvasul intreg, la scara lui": viewBox-ul E canvasul,
   * deci scara 1 fara translatie il aseaza exact in ecran, cu raportul pastrat.
   * Aceeasi incadrare o vad si Adminul, si widgetul public — de-asta butonul se
   * poate folosi ca previzualizare a publicarii.
   */
  const centreazaCanvas = reseteaza

  // Raportarea trece prin efect, nu prin randare: apelantul o pastreaza intr-un
  // ref, deci ciclul se opreste aici (vezi comentariul din EditorPlanPage).
  useEffect(() => {
    onVedere?.({ scara: vedere.scara, laScara, centreazaCanvas })
  }, [onVedere, vedere.scara, laScara, centreazaCanvas])

  /**
   * Drop-ul din paleta. Coordonatele vin din acelasi `laCanvas` ca gesturile de
   * mutare, deci obiectul ateriza exact sub cursor la orice zoom si pan —
   * altfel, la 250%, ar cadea cu jumatate de sala mai incolo.
   */
  function laDrop(eveniment: DragEvent<HTMLDivElement>) {
    if (!onDropObiect) return
    eveniment.preventDefault()
    setTragereDeasupra(false)
    const obiect = eveniment.dataTransfer.getData(TIP_TRANSFER_OBIECT)
    if (!obiect) return
    const punct = laCanvas(eveniment)
    if (punct) onDropObiect(obiect, punct)
  }

  // Ordinea de desenare rămâne cea din viewer: grid → structura → mese.
  // Sortarea pe z se face pe o COPIE indexata, ca indicii din array-ul salvat
  // sa nu se schimbe — ei sunt identitatea elementelor la editare.
  const structuraDesen = structura
    .map((element, indice) => ({ element, indice }))
    .sort((a, b) => (a.element.z ?? 0) - (b.element.z ?? 0))

  const editezStructura = stratActiv === 'structura'

  /**
   * Manerele se deseneaza in AFARA transformarii de zoom, proiectand punctele
   * cu mana: `ecran = pozitie * scara + vedere`. Doua motive, ambele practice.
   *
   * Intai, marimea: un maner asezat sub `scale()` ar creste odata cu planul si
   * la 400% ar acoperi masa. Impartirea la scara ar merge, dar face manerele sa
   * tremure la fiecare pas de zoom.
   *
   * Apoi, evenimentele: grupul stratului inactiv primeste `pointer-events-none`,
   * iar manerele trebuie sa raspunda indiferent de asta.
   *
   * Colturile se rotesc INAINTE de proiectie, deci pe o masa intoarsa manerele
   * stau chiar pe colturile ei, nu pe cutia nerotita din baza.
   */
  // Peretele in linie franta se deseneaza din `puncte` absolute, fara sa asculte
  // de x/y/latime/inaltime: manerele lui ar arata langa el si n-ar face nimic.
  const elementSelectat =
    stratActiv === 'structura' && typeof cheieSelectata === 'number'
      ? (structura[cheieSelectata] ?? null)
      : null
  const manere =
    poateRedimensiona && cutieManere && !elementSelectat?.puncte?.length
      ? (() => {
          const rotatie = masuraSelectata?.rotatie ?? 0
          const radiani = (rotatie * Math.PI) / 180
          const cos = Math.cos(radiani)
          const sin = Math.sin(radiani)
          const centru = {
            x: cutieManere.x + cutieManere.latime / 2,
            y: cutieManere.y + cutieManere.inaltime / 2,
          }
          const proiecteaza = (punct: { x: number; y: number }) => {
            const dx = punct.x - centru.x
            const dy = punct.y - centru.y
            const rotit = {
              x: centru.x + dx * cos - dy * sin,
              y: centru.y + dx * sin + dy * cos,
            }
            return {
              x: rotit.x * vedere.scara + vedere.x,
              y: rotit.y * vedere.scara + vedere.y,
            }
          }
          return {
            colturi: (['nv', 'ne', 'se', 'sv'] as const).map((ancora) =>
              proiecteaza(punctManer(cutieManere, ancora)),
            ),
            puncte: ANCORE.map((ancora) => ({
              ancora,
              ...proiecteaza(punctManer(cutieManere, ancora)),
            })),
          }
        })()
      : null

  return (
    /**
     * Aceeasi tema inchisa ca in HartaZona, si aici din acelasi motiv practic:
     * echipa care deseneaza planul trebuie sa vada exact ce vede restaurantul.
     * Un canvas alb la editare si unul inchis in sala ar insemna ca se aleg
     * pozitii si dimensiuni pe o imagine pe care n-o vede nimeni in realitate.
     */
    <div
      className={cn(
        'dark relative overflow-hidden rounded-lg border border-border',
        // Inelul de aterizare: singurul semnal ca zona chiar primeste obiectul
        // purtat. Fara el, o tragere lasata langa canvas pare pur si simplu
        // pierduta.
        tragereDeasupra && 'ring-2 ring-canvas-selectie',
        className,
      )}
      /**
       * Raportul containerului E raportul canvasului, deci planul umple tot
       * spatiul disponibil fara benzi goale pe margini. Stilul in linie, nu o
       * clasa Tailwind: `aspect-[${w}/${h}]` nu se genereaza la executie, iar
       * dimensiunile canvasului vin din baza.
       */
      style={
        umpleContainerul
          ? undefined
          : { aspectRatio: `${zona.canvas_latime} / ${zona.canvas_inaltime}` }
      }
      onDragOver={(eveniment) => {
        if (!onDropObiect) return
        // Fara preventDefault, browserul refuza drop-ul: implicit, o zona HTML
        // NU e tinta valida de tragere.
        eveniment.preventDefault()
        eveniment.dataTransfer.dropEffect = 'copy'
        if (!tragereDeasupra) setTragereDeasupra(true)
      }}
      onDragLeave={(eveniment) => {
        // Trecerea peste copiii SVG produce dragleave; ne intereseaza doar
        // iesirea din canvas cu totul.
        if (eveniment.currentTarget.contains(eveniment.relatedTarget as Node | null)) return
        setTragereDeasupra(false)
      }}
      onDrop={laDrop}
    >
      <svg
        ref={refSvg}
        viewBox={`0 0 ${zona.canvas_latime} ${zona.canvas_inaltime}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-label={`Editor pentru zona ${zona.nume}, stratul ${editezStructura ? 'structură' : 'mese'}`}
        className={cn(
          // Fundalul svg-ului e EXTERIORUL canvasului: nu se transforma la pan,
          // deci ramane mereu in spate, iar sala are o margine vizibila.
          'h-full w-full touch-none bg-canvas-exterior select-none',
          tragereDeasupra ? 'cursor-copy' : 'cursor-default',
        )}
        onPointerDown={laPointerDown}
        onPointerMove={laPointerMove}
        onPointerUp={laPointerUp}
        onPointerCancel={laPointerCancel}
      >
        <defs>
          <pattern
            id={idGrid}
            width={zona.grid_marime}
            height={zona.grid_marime}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${zona.grid_marime} 0 L 0 0 0 ${zona.grid_marime}`}
              className="fill-none stroke-canvas-grid"
              strokeWidth={1}
              // Fara asta, la 400% liniile gridului se ingroasa de patru ori si
              // ajung sa concureze cu peretii.
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        {/* Tot continutul sta sub transformarea de zoom/pan; gridul primeste
            dimensiunile canvasului explicit — "100%" ar insemna viewport-ul,
            nu canvasul, si la pan ar ramane lipit de ecran. */}
        <g transform={`translate(${vedere.x} ${vedere.y}) scale(${vedere.scara})`}>
        {/* Suprafata canvasului: dincolo de ea nimic nu se publica. Are culoare
            proprie, deci marginea salii se vede si cand planul e gol. */}
        <rect
          width={zona.canvas_latime}
          height={zona.canvas_inaltime}
          className="fill-canvas-fundal"
        />

        {/* §42.5 — schita originala, sub tot: urmareste zoom-ul si pan-ul. */}
        {fundal && fundal.opacitate > 0 && (
          <image
            href={fundal.url}
            x={0}
            y={0}
            width={zona.canvas_latime}
            height={zona.canvas_inaltime}
            opacity={fundal.opacitate}
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none"
          />
        )}
        {/* Gridul acopera EXACT canvasul, nu tot spatiul de lucru: unde nu mai
            sunt patratele, nu mai e nici sala. La zoom mic liniile ar cadea sub
            un pixel si ar face moar — atunci gridul se stinge singur. */}
        {vedere.scara * zona.grid_marime >= 4 && (
          <rect
            width={zona.canvas_latime}
            height={zona.canvas_inaltime}
            fill={`url(#${idGrid})`}
          />
        )}

        {/* ── Layer 1 ── */}
        <g className={editezStructura ? undefined : 'pointer-events-none'}>
          {structuraDesen.map(({ element, indice }) => {
            const mutat =
              previzualizare?.strat === 'structura' && previzualizare.cheie === indice
                ? previzualizare
                : null
            const afisat = mutat
              ? {
                  ...element,
                  x: mutat.x,
                  y: mutat.y,
                  latime: mutat.latime,
                  inaltime: mutat.inaltime,
                }
              : element
            const selectat = structuraSelectata === indice

            if (!editezStructura) {
              return <ElementStructura key={indice} element={afisat} />
            }

            return (
              <g
                key={indice}
                data-structura-indice={indice}
                tabIndex={0}
                role="button"
                aria-label={`${element.tip}${element.eticheta ? ` „${element.eticheta}”` : ''}. Trage cu mouse-ul sau mută cu săgețile.`}
                aria-pressed={selectat}
                onKeyDown={(eveniment) =>
                  laTasta(
                    eveniment,
                    { latime: element.latime, inaltime: element.inaltime, x: element.x, y: element.y },
                    (x, y) => onMutaStructura(indice, x, y),
                  )
                }
                className={cn('outline-none', mutat ? 'cursor-grabbing opacity-80' : 'cursor-grab')}
              >
                <ElementStructura element={afisat} />
                {selectat && (
                  <rect
                    x={afisat.x - 2}
                    y={afisat.y - 2}
                    width={afisat.latime + 4}
                    height={afisat.inaltime + 4}
                    className="pointer-events-none fill-none stroke-canvas-selectie stroke-[3]"
                    rx={4}
                  />
                )}
              </g>
            )
          })}
        </g>

        {/* ── Layer 2 ── */}
        <g className={editezStructura ? 'pointer-events-none opacity-60' : undefined}>
          {mese.map((masa) => {
            const mutata =
              previzualizare?.strat === 'mese' && previzualizare.cheie === masa.id
                ? previzualizare
                : null
            const afisata = mutata
              ? {
                  ...masa,
                  pozitie_x: mutata.x,
                  pozitie_y: mutata.y,
                  latime: mutata.latime,
                  inaltime: mutata.inaltime,
                }
              : masa

            if (editezStructura) {
              return (
                <Masa
                  key={masa.id}
                  masa={afisata}
                  status={statusMasa(masa)}
                />
              )
            }

            return (
              <g
                key={masa.id}
                data-masa-id={masa.id}
                tabIndex={0}
                role="button"
                aria-label={`Masa ${masa.numar_masa}. Trage cu mouse-ul sau mută cu săgețile.`}
                aria-pressed={masaSelectata === masa.id}
                // Sagetile mutau masa si pentru cine nu are voie s-o mute:
                // scrierea pleca, RLS o refuza, iar ospatarul primea o eroare
                // pentru o actiune care nici n-ar fi trebuit sa existe.
                onKeyDown={(eveniment) =>
                  poateMutaMese &&
                  laTasta(
                    eveniment,
                    {
                      latime: masa.latime,
                      inaltime: masa.inaltime,
                      x: masa.pozitie_x,
                      y: masa.pozitie_y,
                    },
                    (x, y) => onMutaMasa(masa.id, x, y),
                  )
                }
                className={cn(
                  'outline-none',
                  mutata ? 'cursor-grabbing opacity-80' : 'cursor-grab',
                  'focus-visible:[&_.forma]:stroke-canvas-selectie focus-visible:[&_.forma]:stroke-[4]',
                )}
              >
                <Masa
                  masa={afisata}
                  status={statusMasa(masa)}
                  selectata={masaSelectata === masa.id}
                />

                {/* Manerul de re-alocare (§28.4). Exista doar cand masa are un
                    client la ora afisata: altfel n-ar avea ce muta. */}
                {rezervariPeMese?.[masa.id] && onMutaRezervare && (
                  <g
                    data-rezervare-id={rezervariPeMese[masa.id].id}
                    data-de-pe-masa={masa.id}
                    className="cursor-grab"
                    role="button"
                    aria-label={`Mută rezervarea ${rezervariPeMese[masa.id].eticheta} pe altă masă`}
                  >
                    <circle
                      cx={afisata.pozitie_x + afisata.latime - 8}
                      cy={afisata.pozitie_y + 8}
                      r={11}
                      className="fill-canvas-selectie stroke-background stroke-2"
                    />
                    <text
                      x={afisata.pozitie_x + afisata.latime - 8}
                      y={afisata.pozitie_y + 8}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none fill-background text-[11px] font-semibold"
                    >
                      ⇄
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>

        {/* ── Best Guess-ul AI, fantomatic (§9.2.2 pasul 1) ── */}
        {overlayAI && (
          <g className="pointer-events-none" opacity={0.55}>
            {overlayAI.structura.map((element, indice) => (
              <ElementStructura key={`ai-s-${indice}`} element={element} />
            ))}
            {overlayAI.mese.map((masa, indice) =>
              masa.forma === 'rotunda' ? (
                <circle
                  key={`ai-m-${indice}`}
                  cx={masa.x + masa.latime / 2}
                  cy={masa.y + masa.inaltime / 2}
                  r={Math.min(masa.latime, masa.inaltime) / 2}
                  className="fill-none stroke-canvas-selectie"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                />
              ) : (
                <rect
                  key={`ai-m-${indice}`}
                  x={masa.x}
                  y={masa.y}
                  width={masa.latime}
                  height={masa.inaltime}
                  rx={6}
                  className="fill-none stroke-canvas-selectie"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                />
              ),
            )}
          </g>
        )}

        {/* Urma rezervarii trase. `pointer-events-none` e obligatoriu: altfel
            ea insasi ar fi elementul de sub deget la ridicare, iar masa-tinta
            n-ar fi gasita niciodata. */}
        {tragereRezervare && (
          <g className="pointer-events-none">
            <circle
              cx={tragereRezervare.x}
              cy={tragereRezervare.y}
              r={13}
              className="fill-canvas-selectie opacity-80"
            />
            <text
              x={tragereRezervare.x}
              y={tragereRezervare.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-background text-[12px] font-semibold"
            >
              ⇄
            </text>
          </g>
        )}

        {/* Chenarul canvasului, desenat ULTIMUL ca sa ramana vizibil si peste
            un perete lipit de margine. Nu prinde niciun clic: e un reper, nu un
            obiect. Ce iese din el nu ajunge la Admin si nici in widget. */}
        <rect
          width={zona.canvas_latime}
          height={zona.canvas_inaltime}
          className="pointer-events-none fill-none stroke-canvas-margine"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        </g>

        {/* ── Manerele de redimensionare ──
            In afara transformarii: punctele sunt deja proiectate in coordonate
            de viewBox, deci raman de aceeasi marime la orice zoom. */}
        {manere && (
          <g>
            <polygon
              points={manere.colturi.map((punct) => `${punct.x},${punct.y}`).join(' ')}
              className="pointer-events-none fill-none stroke-canvas-selectie"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            {manere.puncte.map((maner) => (
              <g key={maner.ancora} data-maner={maner.ancora} className={CURSOR_MANER[maner.ancora]}>
                {/* Tinta de atingere, invizibila si mult mai mare decat patratul:
                    pe tableta un maner de 9px nu se prinde cu degetul. */}
                <rect
                  x={maner.x - MARIME_MANER * 1.6}
                  y={maner.y - MARIME_MANER * 1.6}
                  width={MARIME_MANER * 3.2}
                  height={MARIME_MANER * 3.2}
                  className="fill-transparent"
                />
                <rect
                  x={maner.x - MARIME_MANER / 2}
                  y={maner.y - MARIME_MANER / 2}
                  width={MARIME_MANER}
                  height={MARIME_MANER}
                  rx={2}
                  className="pointer-events-none fill-canvas-selectie stroke-background"
                  strokeWidth={1.5}
                />
              </g>
            ))}
          </g>
        )}
      </svg>

      {/* Comenzile de zoom apar doar in Canvas Builder-ul echipei: pentru
          Admin si ospatar incadrarea e fixata, deci butoanele n-ar avea ce
          face (§32 ramane valabil pe tableta ECHIPEI). */}
      {permiteZoom && (
        <div className="absolute right-2 bottom-2 flex flex-col gap-1 rounded-lg border border-border bg-card/90 p-1 backdrop-blur">
          <Button variant="ghost" size="icon-sm" onClick={mareste} aria-label="Mărește">
            <PlusIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={micsoreaza} aria-label="Micșorează">
            <MinusIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={reseteaza} aria-label="Încadrează harta">
            <MaximizeIcon />
          </Button>
        </div>
      )}
    </div>
  )
}
