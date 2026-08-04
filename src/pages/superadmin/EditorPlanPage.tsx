import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, MagnetIcon, ScanIcon, Trash2Icon } from 'lucide-react'

import {
  EditorZona,
  TIP_TRANSFER_OBIECT,
  type ComenziVedere,
  type Strat,
} from '@/components/floor-plan/EditorZona'
import { SCARA_MAX, SCARA_MIN } from '@/components/floor-plan/useZoomPan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useNotificari } from '@/hooks/useNotificari'
import { esteInCanvas, inCanvas, pozitieFinala } from '@/lib/geometrie-plan'
import { importaGeometrie, type GeometrieImportata } from '@/lib/import-geometrie'
import { gasesteZonaDupaNume, normalizeazaNumeZona } from '@/lib/nume-zona'
import { RUTE } from '@/lib/rute'
import { cn } from '@/lib/utils'
import {
  CHEIE_ISTORIC,
  CHEI_EDITOR,
  actualizeazaMasa,
  actualizeazaZona,
  creeazaMasa,
  creeazaZona,
  getIstoricVersiuni,
  getLayer1,
  getMeseEditor,
  getZoneEditor,
  restaureazaVersiune,
  salveazaLayer1,
  stergeMasa,
  stergeZona,
  type Layer1,
  type Masa,
  type Zona,
} from '@/services/editor-plan'
import { CHEI_FP, urlSchita } from '@/services/floor-plan'
import { CHEI_STUDIO_AI, genereazaPlanAI, getCerereStudio } from '@/services/studio-ai'
import { CHEI_SA, getRestaurante } from '@/services/super-admin'
import type { Enums } from '@/types/database'
import type { ElementStructura, TipStructura } from '@/types/floor-plan'

const ETICHETE_FORMA: Record<Enums<'masa_forma'>, string> = {
  rotunda: 'Rotundă',
  patrata: 'Pătrată',
  dreptunghiulara: 'Dreptunghiulară',
}

/**
 * Sabloanele paletei — cu ce dimensiuni ateriza obiectul tras pe plan.
 *
 * Mesele: 80x80 e chiar valoarea implicita a bazei, iar 130x74 e masa lunga
 * clasica, cea pe care generatorul de scaune o aseaza 2+2 pe laturile lungi si
 * cate unul la capete. Cine trage o masa dreptunghiulara o vrea dreptunghiulara
 * din prima, nu rotunda si apoi corectata din panou.
 */
const SABLOANE_MASA: Record<
  Enums<'masa_forma'>,
  { eticheta: string; latime: number; inaltime: number; capacitate: number }
> = {
  rotunda: { eticheta: 'Masă rotundă', latime: 80, inaltime: 80, capacitate: 4 },
  patrata: { eticheta: 'Masă pătrată', latime: 80, inaltime: 80, capacitate: 4 },
  dreptunghiulara: { eticheta: 'Masă lungă', latime: 130, inaltime: 74, capacitate: 6 },
}

/**
 * Dimensiunile implicite ale fiecarui element de structura, plus eticheta pusa
 * automat acolo unde ElementStructura o si deseneaza. Un perete e lung si
 * subtire, o planta e mica si patrata — daca toate ar aparea la aceeasi marime,
 * fiecare asezare ar cere doua redimensionari.
 */
const SABLOANE_STRUCTURA: Record<
  TipStructura,
  { eticheta: string; latime: number; inaltime: number; text?: string }
> = {
  perete: { eticheta: 'Perete', latime: 400, inaltime: 20 },
  usa: { eticheta: 'Ușă', latime: 80, inaltime: 20 },
  intrare: { eticheta: 'Intrare', latime: 120, inaltime: 40, text: 'Intrare' },
  bar: { eticheta: 'Bar', latime: 300, inaltime: 80, text: 'Bar' },
  dj: { eticheta: 'DJ', latime: 120, inaltime: 100, text: 'DJ' },
  vip: { eticheta: 'Zonă VIP', latime: 260, inaltime: 200, text: 'VIP' },
  bucatarie: { eticheta: 'Bucătărie', latime: 240, inaltime: 180, text: 'Bucătărie' },
  planta: { eticheta: 'Plantă', latime: 60, inaltime: 60 },
  piscina: { eticheta: 'Piscină', latime: 320, inaltime: 200, text: 'Piscină' },
}

const TIPURI_STRUCTURA = Object.keys(SABLOANE_STRUCTURA) as TipStructura[]
const FORME_MASA = Object.keys(SABLOANE_MASA) as Array<Enums<'masa_forma'>>

/** Pictograma din paleta imprumuta exact culoarea cu care apare pe canvas. */
const CLASA_PICTOGRAMA: Record<TipStructura, string> = {
  perete: 'bg-canvas-perete',
  usa: 'bg-canvas-usa',
  intrare: 'bg-canvas-usa',
  bar: 'bg-canvas-bar',
  dj: 'bg-canvas-zona-speciala',
  vip: 'bg-canvas-zona-speciala',
  bucatarie: 'bg-canvas-zona-speciala',
  planta: 'bg-canvas-planta',
  piscina: 'bg-canvas-piscina',
}

/**
 * Cheile de mutatie sunt module-level: dupa fiecare scriere ne intereseaza daca
 * a mai ramas vreuna in zbor, iar `isMutating` le cauta dupa cheie.
 */
const CHEIE_MUTATIE_MESE = ['editor', 'scrie-masa'] as const
const CHEIE_MUTATIE_STRAT = ['editor', 'scrie-strat'] as const

/** Latura maxima a pictogramei din paleta, in pixeli de ecran. */
const PICTOGRAMA_MAXIM = 30

function ObiectPaleta({
  obiect,
  eticheta,
  latime,
  inaltime,
  clasa,
  rotund = false,
  onAseaza,
}: {
  obiect: string
  eticheta: string
  latime: number
  inaltime: number
  clasa: string
  rotund?: boolean
  onAseaza: () => void
}) {
  // Pictograma pastreaza proportiile reale ale obiectului: asa se vede din
  // paleta ca peretele e o dunga si barul un dreptunghi lat, fara nicio eticheta
  // suplimentara. Minimul de 5px tine dunga vizibila.
  const scara = PICTOGRAMA_MAXIM / Math.max(latime, inaltime)

  return (
    <button
      type="button"
      draggable
      onDragStart={(eveniment) => {
        eveniment.dataTransfer.setData(TIP_TRANSFER_OBIECT, obiect)
        eveniment.dataTransfer.effectAllowed = 'copy'
      }}
      // Clicul e drumul de rezerva, pentru tastatura si pentru ecranele unde
      // tragerea nu merge: aseaza obiectul in mijlocul planului, de unde poate
      // fi tras mai departe. NU e modul „armezi butonul, apoi dai clic pe plan"
      // interzis de §42.4 — ramane o singura apasare.
      onClick={onAseaza}
      title={`${eticheta} — trage pe plan`}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted active:cursor-grabbing"
    >
      <span className="flex w-8 shrink-0 items-center justify-center">
        <span
          aria-hidden="true"
          className={cn('block', clasa, rotund ? 'rounded-full' : 'rounded-xs')}
          style={{
            width: Math.max(5, Math.round(latime * scara)),
            height: Math.max(5, Math.round(inaltime * scara)),
          }}
        />
      </span>
      <span className="min-w-0 truncate">{eticheta}</span>
    </button>
  )
}

/** Panourile plutesc peste canvas, deci nu mai sunt carduri: sunt sectiuni. */
function Sectiune({ titlu, children }: { titlu: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-border/60 p-3 last:border-b-0">
      <h2 className="text-sm font-semibold">{titlu}</h2>
      {children}
    </section>
  )
}

function DialogStergere({
  titlu,
  descriere,
  onInchide,
  onConfirma,
  inLucru,
}: {
  titlu: string
  descriere: string
  onInchide: () => void
  onConfirma: () => void
  inLucru: boolean
}) {
  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titlu}</DialogTitle>
          <DialogDescription>{descriere}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onInchide}>
            Renunță
          </Button>
          <Button variant="destructive" disabled={inLucru} onClick={onConfirma}>
            Șterge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Editorul de floor plan (§8.4) — unealta echipei TableX, nu a restaurantului.
 * Inchide bucla deschisa de coada de cereri: pana acum o cerere putea fi
 * marcata "publicat" fara sa existe vreo cale de a desena efectiv planul.
 *
 * Doua straturi, editate pe rand:
 *   Layer 2 — zone si mese, randuri in `tables`. De ele depind rezervarile.
 *   Layer 1 — structura salii (pereti, bar, intrare), un array jsonb in
 *             floor_plan_layers.continut, cu publicare separata.
 * Se editeaza unul singur odata: mesele se deseneaza PESTE structura, deci un
 * canvas care le asculta pe amandoua ar avea un test de lovire ambiguu.
 *
 * ZONA NU SE ALEGE. Fiecare zona e un proiect in sine, iar Adminul spune in
 * cerere pentru care sala a platit (`floor_plan_requests.zone_nume`). Un
 * selector ar fi fost, in cel mai bun caz, decorativ, si in cel mai rau o cale
 * de a desena planul cerut in alta sala. Daca zona din cerere nu exista inca, o
 * creeaza builderul, o singura data, la deschidere.
 *
 * Ecranul e canvas pe tot, cu panourile plutind deasupra lui: planul e obiectul
 * de lucru, nu un card intr-o pagina. Panourile sunt translucide ca sa se vada
 * ce e sub ele — o masa asezata sub panoul de proprietati ramane vizibila.
 */
export function EditorPlanPage() {
  const { restaurantId = '' } = useParams()
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [masaSelectata, setMasaSelectata] = useState<string | null>(null)
  const [strat, setStrat] = useState<Strat>('mese')
  const [structuraSelectata, setStructuraSelectata] = useState<number | null>(null)
  const [snapLaGrid, setSnapLaGrid] = useState(true)
  const [stergere, setStergere] = useState<{ tip: 'zona' | 'masa'; id: string; nume: string } | null>(
    null,
  )
  /** Zona cererii lipsea si a fost creata acum — se spune, nu se presupune. */
  const [zonaCreataAcum, setZonaCreataAcum] = useState(false)

  const restaurante = useQuery({ queryKey: CHEI_SA.restaurante, queryFn: getRestaurante })
  const zone = useQuery({
    queryKey: CHEI_EDITOR.zone(restaurantId),
    queryFn: () => getZoneEditor(restaurantId),
    enabled: Boolean(restaurantId),
  })
  const mese = useQuery({
    queryKey: CHEI_EDITOR.mese(restaurantId),
    queryFn: () => getMeseEditor(restaurantId),
    enabled: Boolean(restaurantId),
  })

  /**
   * §42.5 + §9.2.2 pasul 1 — cererea activa da si zona la care se lucreaza, si
   * schita de calc, si Best Guess-ul. Slider-ul de opacitate si toggle-ul de
   * ascundere sunt separate: schita se poate stinge complet cu un click, nu
   * doar reduce.
   */
  const cerereStudio = useQuery({
    queryKey: CHEI_STUDIO_AI.cerere(restaurantId),
    queryFn: () => getCerereStudio(restaurantId),
    enabled: Boolean(restaurantId),
  })

  const restaurant = restaurante.data?.find((r) => r.id === restaurantId)
  const numeZonaCeruta = cerereStudio.data?.zone_nume.trim() ?? ''
  const zonaCeruta = numeZonaCeruta ? gasesteZonaDupaNume(zone.data ?? [], numeZonaCeruta) : null
  /**
   * Cand exista o cerere, zona ei e SINGURA pe care lucram — inclusiv cat timp
   * e in curs de creare, cand ramane null. O rezerva pe „prima zona" ar parea
   * amabila, dar ar lasa mesele in alta sala decat cea platita.
   */
  const zonaCurenta = numeZonaCeruta ? zonaCeruta : (zone.data?.[0] ?? null)

  const meseZona = useMemo(
    () => (mese.data ?? []).filter((m) => m.zone_id === zonaCurenta?.id),
    [mese.data, zonaCurenta?.id],
  )
  const masa = meseZona.find((m) => m.id === masaSelectata) ?? null

  const cheieMese = CHEI_EDITOR.mese(restaurantId)
  const cheieLayer1 = CHEI_EDITOR.layer1(zonaCurenta?.id ?? '')

  const layer1 = useQuery({
    queryKey: cheieLayer1,
    queryFn: () => getLayer1(zonaCurenta!.id),
    enabled: Boolean(zonaCurenta?.id),
  })
  const elemente = useMemo(() => layer1.data?.elemente ?? [], [layer1.data])
  const element = structuraSelectata === null ? null : (elemente[structuraSelectata] ?? null)

  const [opacitateSchita, setOpacitateSchita] = useState(45)
  const [schitaVizibila, setSchitaVizibila] = useState(true)
  const [arataAI, setArataAI] = useState(true)

  /**
   * Import de geometrie (§41.3, alternativa la Generarea AI).
   *
   * Generarea automata cere o cheie de API facturata separat, pe care nu orice
   * instalare o are. Formatul e insa acelasi, deci geometria poate veni de
   * oriunde — inclusiv dintr-o conversatie cu un asistent, pe abonamentul pe
   * care echipa il are deja. Ecranul ramane al echipei, ca si Best Guess-ul:
   * §14.3 cere ca rezultatul sa nu ajunga niciodata la Admin, iar aici nici nu
   * se salveaza nicaieri — se aplica direct pe straturile reale, sub ochii
   * celui care importa.
   */
  const [importDeschis, setImportDeschis] = useState(false)
  const [textImport, setTextImport] = useState('')
  const [eroriImport, setEroriImport] = useState<string[]>([])
  const [importInLucru, setImportInLucru] = useState(false)

  /**
   * Comenzile de vedere ale canvasului ajung intr-un REF, nu in stare: obiectul
   * e altul la fiecare schimbare de scara, iar tinerea lui in stare ar re-randa
   * pagina, care ar re-randa canvasul, care ar raporta din nou — bucla. Din el
   * pastram in stare doar numarul de care are nevoie randarea (procentul de pe
   * slider), unde React se opreste singur cand valoarea nu s-a schimbat.
   */
  const comenziVedere = useRef<ComenziVedere | null>(null)
  const [scaraVedere, setScaraVedere] = useState(1)
  const preiaComenzileVederii = useCallback((comenzi: ComenziVedere) => {
    comenziVedere.current = comenzi
    setScaraVedere(comenzi.scara)
  }, [])

  const schitaSemnata = useQuery({
    queryKey: CHEI_FP.schita(cerereStudio.data?.schita_image_url ?? ''),
    queryFn: () => urlSchita(cerereStudio.data!.schita_image_url!),
    enabled: Boolean(cerereStudio.data?.schita_image_url),
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
  })

  const genereazaAI = useMutation({
    mutationFn: () => genereazaPlanAI(cerereStudio.data!.id),
    onSuccess: (rezultat) => {
      if (rezultat.ok) {
        notificari.succes(
          `Best Guess gata: ${rezultat.elemente} elemente, ${rezultat.mese} mese estimate.`,
        )
        void queryClient.invalidateQueries({ queryKey: CHEI_STUDIO_AI.cerere(restaurantId) })
      } else {
        notificari.atentie(rezultat.motiv)
      }
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  function reincarcaMese() {
    void queryClient.invalidateQueries({ queryKey: CHEI_EDITOR.mese(restaurantId) })
  }
  function reincarcaZone() {
    void queryClient.invalidateQueries({ queryKey: CHEI_EDITOR.zone(restaurantId) })
  }

  const zonaNoua = useMutation({
    mutationFn: (nume: string) => creeazaZona(restaurantId, nume),
    onSuccess: (zona) => {
      setZonaCreataAcum(true)
      notificari.succes(`Zona „${zona.nume}” a fost creată automat, din cererea restaurantului.`)
      reincarcaZone()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  /**
   * Crearea automata a zonei din cerere, EXACT o data.
   *
   * Garda e un ref, nu o stare: efectul se re-executa la fiecare randare in care
   * lista de zone inca nu contine zona ceruta (adica pe tot parcursul cererii de
   * inserare), iar in React 19 orice efect ruleaza de doua ori in dezvoltare. Un
   * `zonaNoua.isPending` n-ar fi ajuns — intre `mutate` si prima randare cu
   * `isPending` incape o a doua executie a efectului, si restaurantul s-ar fi
   * ales cu doua zone identice si goale.
   */
  const zonaIncercata = useRef<string | null>(null)
  const creeazaZonaCeruta = zonaNoua.mutate
  useEffect(() => {
    if (!restaurantId || !numeZonaCeruta || !zone.isSuccess || zonaCeruta) return
    const cheie = `${restaurantId}|${normalizeazaNumeZona(numeZonaCeruta)}`
    if (zonaIncercata.current === cheie) return
    zonaIncercata.current = cheie
    creeazaZonaCeruta(numeZonaCeruta)
  }, [restaurantId, numeZonaCeruta, zone.isSuccess, zonaCeruta, creeazaZonaCeruta])

  const salveazaZona = useMutation({
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof actualizeazaZona>[1] }) =>
      actualizeazaZona(id, modificari),
    onSuccess: reincarcaZone,
    onError: (eroare) => notificari.eroare(eroare),
  })

  const eliminaZona = useMutation({
    mutationFn: stergeZona,
    onSuccess: () => {
      notificari.succes('Zona a fost ștearsă.')
      setMasaSelectata(null)
      setStructuraSelectata(null)
      setStergere(null)
      reincarcaZone()
      reincarcaMese()
    },
    onError: (eroare) => {
      setStergere(null)
      notificari.eroare(eroare)
    },
  })

  const masaNoua = useMutation({
    mutationKey: CHEIE_MUTATIE_MESE,
    // Numerotarea se face in serviciu, din baza: constrangerea de unicitate e
    // pe restaurant, iar starea de aici poate fi in urma cu o asezare.
    mutationFn: (masaCeruta: Omit<Parameters<typeof creeazaMasa>[0], 'restaurantId' | 'zoneId'>) =>
      creeazaMasa({ ...masaCeruta, restaurantId, zoneId: zonaCurenta!.id }),
    onSuccess: (masaCreata) => {
      // Randul creat intra direct in cache: daca am astepta reimprospatarea,
      // masa ar aparea vizibil mai tarziu decat locul in care a fost lasata.
      queryClient.setQueryData<Masa[]>(cheieMese, (lista) => [...(lista ?? []), masaCreata])
      setMasaSelectata(masaCreata.id)
    },
    onError: (eroare) => notificari.eroare(eroare),
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: CHEIE_MUTATIE_MESE }) === 1) reincarcaMese()
    },
  })

  /**
   * Mutarea si editarea unei mese, cu ACTUALIZARE OPTIMISTA.
   *
   * Fara ea, la drop se vedea saritura clasica: previzualizarea gestului
   * dispare, randul din cache e inca cel de pe server, deci masa se intoarce in
   * pozitia veche si abia reimprospatarea o aduce inapoi. Scriem asadar pozitia
   * noua in cache inainte sa plece cererea, si o dam inapoi doar daca serverul
   * refuza — cazul in care masa TREBUIE sa sara inapoi, fiindca acolo chiar nu
   * s-a salvat nimic.
   */
  const salveazaMasa = useMutation({
    mutationKey: CHEIE_MUTATIE_MESE,
    mutationFn: ({ id, modificari }: { id: string; modificari: Parameters<typeof actualizeazaMasa>[1] }) =>
      actualizeazaMasa(id, modificari),
    onMutate: ({ id, modificari }) => {
      /**
       * Patch-ul se scrie SINCRON, si de aceea functia nu e `async`.
       * `onMutate` e apelat de React Query din chiar apelul `mutate()`, adica
       * din interiorul evenimentului de pointerup — deci scrierea intra in
       * acelasi lot de randare cu golirea previzualizarii din canvas, iar masa
       * nu apuca sa fie desenata nici macar un cadru in pozitia veche. Un
       * `await` inaintea ei ar fi impins-o dupa prima randare: exact saritura
       * de reparat, doar mai scurta.
       */
      const anterioare = queryClient.getQueryData<Masa[]>(cheieMese)
      queryClient.setQueryData<Masa[]>(cheieMese, (lista) =>
        (lista ?? []).map((rand) => (rand.id === id ? ({ ...rand, ...modificari } as Masa) : rand)),
      )
      // Anularea vine dupa, dar tot sincron: o reimprospatare pornita inainte de
      // mutatie ar ateriza dupa ea si ar sterge valoarea optimista.
      void queryClient.cancelQueries({ queryKey: cheieMese })
      return { anterioare }
    },
    onError: (eroare, _variabile, context) => {
      if (context?.anterioare) queryClient.setQueryData(cheieMese, context.anterioare)
      notificari.eroare(eroare)
    },
    onSettled: () => {
      // Doar dupa ULTIMA scriere in zbor: o invalidare la mijloc ar aduce
      // randurile de dinaintea celorlalte si mesele ar sari inapoi pe rand.
      if (queryClient.isMutating({ mutationKey: CHEIE_MUTATIE_MESE }) === 1) reincarcaMese()
    },
  })

  /**
   * Starea COMPLETA a stratului de structura. Mutatia nu mai primeste o
   * schimbare partiala, ci rezultatul: continutul e un array jsonb, deci orice
   * operatie (adaugare, mutare, redimensionare, stergere, publicare) rescrie
   * oricum acelasi rand, iar o valoare completa poate fi pusa in cache optimist
   * fara sa mai fie recompusa la executie.
   */
  type StareStrat = { elemente: ElementStructura[]; vizibil: boolean; publicat: boolean }

  function stareStrat(schimbare: Partial<StareStrat>): StareStrat {
    return {
      elemente: schimbare.elemente ?? elemente,
      vizibil: schimbare.vizibil ?? layer1.data?.vizibil ?? true,
      publicat: schimbare.publicat ?? layer1.data?.publicat ?? false,
    }
  }

  const salveazaStructura = useMutation({
    mutationKey: CHEIE_MUTATIE_STRAT,
    /**
     * Scrierile pe acelasi strat se serializeaza: continutul e un singur rand
     * cu blocaj optimist pe `versiune`, deci doua cereri plecate simultan s-ar
     * lovi una de alta si a doua ar raporta un conflict inexistent. Cu `scope`,
     * `onMutate` ruleaza tot imediat (deci interfata nu asteapta), dar cererea
     * pleaca abia cand cea dinaintea ei s-a asezat.
     */
    scope: { id: `layer1-${zonaCurenta?.id ?? 'fara-zona'}` },
    mutationFn: (stare: StareStrat) => {
      // Versiunea si id-ul se citesc din cache LA EXECUTIE, nu din randarea in
      // care s-a apasat: actualizarea optimista de mai jos schimba doar
      // continutul, deci aici ajunge mereu ultima versiune confirmata de baza.
      const confirmat = queryClient.getQueryData<Layer1>(cheieLayer1) ?? null
      return salveazaLayer1({
        restaurantId,
        zoneId: zonaCurenta!.id,
        elemente: stare.elemente,
        vizibil: stare.vizibil,
        publicat: stare.publicat,
        versiuneCitita: confirmat?.versiune ?? null,
        layerId: confirmat?.id ?? null,
      })
    },
    // Sincron, din acelasi motiv ca la mese: un `await` inaintea scrierii ar
    // lasa elementul un cadru in pozitia veche.
    onMutate: (stare) => {
      const anterior = queryClient.getQueryData<Layer1>(cheieLayer1) ?? null
      // Cand stratul nu exista inca in baza nu inventam unul in cache: `id`-ul
      // fals ar fi citit de mutationFn drept „exista deja", si insertul s-ar
      // transforma intr-un update pe un rand inexistent.
      if (anterior) queryClient.setQueryData<Layer1>(cheieLayer1, { ...anterior, ...stare })
      void queryClient.cancelQueries({ queryKey: cheieLayer1 })
      return { anterior }
    },
    /**
     * Din raspuns luam DOAR ce stie serverul mai bine — `id` si `versiune`.
     * Continutul ramane cel din cache, fiindca el poate fi deja mai nou: cu
     * `scope`, o a doua mutare pleaca dupa prima, dar `onMutate`-ul ei a scris
     * deja pozitia noua. Scrierea intreaga a raspunsului o dadea inapoi pe cea
     * veche pentru tot dus-intorsul urmator — exact saritura reparata la mese,
     * ramasa pe stratul de structura.
     */
    onSuccess: (stratNou) =>
      queryClient.setQueryData<Layer1>(cheieLayer1, (curent) =>
        curent ? { ...curent, id: stratNou.id, versiune: stratNou.versiune } : stratNou,
      ),
    onError: (eroare, _stare, context) => {
      if (context) queryClient.setQueryData<Layer1>(cheieLayer1, context.anterior)
      notificari.eroare(eroare)
    },
    onSettled: () => {
      // Publicarea lasa un instantaneu, scris de un trigger: lista de versiuni
      // trebuie recitita, altfel versiunea proaspata apare abia la reincarcare.
      if (zonaCurenta) {
        void queryClient.invalidateQueries({ queryKey: CHEIE_ISTORIC(zonaCurenta.id) })
      }
    },
  })

  function schimbaStructura(schimbare: Partial<StareStrat>) {
    salveazaStructura.mutate(stareStrat(schimbare))
  }

  /**
   * Istoricul (§40). Instantaneele le scrie un trigger la fiecare publicare,
   * deci lista se reimprospateaza dupa orice salvare a structurii publicate.
   */
  const istoric = useQuery({
    queryKey: CHEIE_ISTORIC(zonaCurenta?.id ?? ''),
    queryFn: () => getIstoricVersiuni(zonaCurenta!.id),
    enabled: Boolean(zonaCurenta?.id),
  })

  const revino = useMutation({
    mutationFn: restaureazaVersiune,
    onSuccess: (versiuneNoua) => {
      notificari.succes(`Planul a revenit la versiunea aleasă (acum versiunea ${versiuneNoua}).`)
      // Continutul stratului s-a schimbat in baza, nu in cache: il recitim.
      void queryClient.invalidateQueries({ queryKey: cheieLayer1 })
      void queryClient.invalidateQueries({ queryKey: CHEIE_ISTORIC(zonaCurenta!.id) })
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const eliminaMasa = useMutation({
    mutationFn: stergeMasa,
    onSuccess: () => {
      notificari.succes('Masa a fost ștearsă.')
      setMasaSelectata(null)
      setStergere(null)
      reincarcaMese()
    },
    // Migratia 18 refuza stergerea unei mese cu rezervari viitoare; mesajul ei
    // spune deja ce sa faca in loc (dezactivare).
    onError: (eroare) => {
      setStergere(null)
      notificari.eroare(eroare)
    },
  })

  /**
   * Aplica geometria importata pe straturile REALE, nu intr-un „best guess".
   * Structura merge intr-o singura salvare (stratul e un jsonb, deci o scriere);
   * mesele cer cate un insert, fiindca numerotarea se face in serviciu, din
   * baza, cu reincercare la coliziune. Daca o masa cade, ne oprim si spunem
   * cate au intrat — mai bine un import partial anuntat decat unul complet
   * raportat gresit.
   */
  async function aplicaImportul(date: GeometrieImportata) {
    if (!zonaCurenta) return
    setImportInLucru(true)
    let meseIntrate = 0
    try {
      if (date.structura.length) {
        await salveazaStructura.mutateAsync(
          stareStrat({ elemente: [...elemente, ...date.structura] }),
        )
      }
      for (const masaImportata of date.mese) {
        await creeazaMasa({
          restaurantId,
          zoneId: zonaCurenta.id,
          capacitate: masaImportata.capacitate,
          pozitieX: masaImportata.x,
          pozitieY: masaImportata.y,
          // Forma si gabaritul erau pana acum aruncate la import: o sala de mese
          // lungi ateriza ca un sir de mese rotunde de 80x80.
          forma: masaImportata.forma,
          latime: masaImportata.latime,
          inaltime: masaImportata.inaltime,
        })
        meseIntrate += 1
      }
      reincarcaMese()
      notificari.succes(
        `Import gata: ${date.structura.length} elemente de structură, ${meseIntrate} mese.`,
        { descriere: 'Verifică pozițiile pe plan înainte de publicare.' },
      )
      setImportDeschis(false)
      setTextImport('')
      setEroriImport([])
    } catch (eroare) {
      reincarcaMese()
      setEroriImport([
        meseIntrate > 0
          ? `Import oprit după ${meseIntrate} mese: ${(eroare as Error).message}`
          : (eroare as Error).message,
      ])
    } finally {
      setImportInLucru(false)
    }
  }

  /**
   * Coltul din stanga-sus la care ateriza un obiect lasat cu centrul in `punct`.
   * Alinierea la grid se aplica AICI, nu in canvas: acolo se stie unde a cazut
   * degetul, aici se stie cat de mare e obiectul.
   */
  function asezare(punct: { x: number; y: number }, latime: number, inaltime: number) {
    if (!zonaCurenta) return { x: 0, y: 0 }
    const dimensiuni = { latime, inaltime }
    const canvas = { latime: zonaCurenta.canvas_latime, inaltime: zonaCurenta.canvas_inaltime }
    const bruta = { x: punct.x - latime / 2, y: punct.y - inaltime / 2 }
    return snapLaGrid
      ? pozitieFinala(dimensiuni, canvas, zonaCurenta.grid_marime, bruta)
      : inCanvas(dimensiuni, canvas, bruta)
  }

  /**
   * Un obiect din paleta a ajuns pe plan. Stratul se comuta singur dupa ce s-a
   * asezat: altfel o masa lasata cat timp se lucra la structura ar fi aparut
   * imediat neselectabila, si ar fi parut ca drag-and-drop-ul nu a mers.
   */
  function asazaObiect(obiect: string, punct: { x: number; y: number }) {
    if (!zonaCurenta) return
    const [familie, tip] = obiect.split(':')

    if (familie === 'masa') {
      const sablon = SABLOANE_MASA[tip as Enums<'masa_forma'>]
      if (!sablon) return
      const pozitie = asezare(punct, sablon.latime, sablon.inaltime)
      setStrat('mese')
      setStructuraSelectata(null)
      masaNoua.mutate({
        capacitate: sablon.capacitate,
        pozitieX: pozitie.x,
        pozitieY: pozitie.y,
        forma: tip as Enums<'masa_forma'>,
        latime: sablon.latime,
        inaltime: sablon.inaltime,
      })
      return
    }

    const sablon = SABLOANE_STRUCTURA[tip as TipStructura]
    if (!sablon) return
    const pozitie = asezare(punct, sablon.latime, sablon.inaltime)
    const nou: ElementStructura = {
      tip: tip as TipStructura,
      x: pozitie.x,
      y: pozitie.y,
      latime: sablon.latime,
      inaltime: sablon.inaltime,
      ...(sablon.text ? { eticheta: sablon.text } : {}),
    }
    setStrat('structura')
    setMasaSelectata(null)
    setStructuraSelectata(elemente.length)
    schimbaStructura({ elemente: [...elemente, nou] })
  }

  /** Mijlocul planului — unde ateriza obiectele asezate cu tastatura. */
  function centrulPlanului() {
    return zonaCurenta
      ? { x: zonaCurenta.canvas_latime / 2, y: zonaCurenta.canvas_inaltime / 2 }
      : { x: 0, y: 0 }
  }

  /**
   * Cate obiecte ies din canvas. De cand incadrarea publicata E canvasul, ce
   * ramane afara nu se mai vede nici la Admin, nici in widget — si nimic din
   * ecran n-ar spune-o. Se intampla la micsorarea canvasului, la import si la
   * preluarea Best Guess-ului AI (care presupune 1200x800).
   */
  const canvasZona = useMemo(
    () =>
      zonaCurenta
        ? { latime: zonaCurenta.canvas_latime, inaltime: zonaCurenta.canvas_inaltime }
        : null,
    [zonaCurenta],
  )
  const inAfara = useMemo(() => {
    if (!canvasZona) return { mese: [] as string[], structura: [] as number[] }
    return {
      mese: meseZona
        .filter(
          (m) =>
            !esteInCanvas(
              { x: m.pozitie_x, y: m.pozitie_y, latime: m.latime, inaltime: m.inaltime },
              canvasZona,
            ),
        )
        .map((m) => m.id),
      structura: elemente
        .map((el, indice) => ({ el, indice }))
        .filter(
          ({ el }) =>
            !el.puncte?.length &&
            !esteInCanvas(
              { x: el.x, y: el.y, latime: el.latime, inaltime: el.inaltime },
              canvasZona,
            ),
        )
        .map(({ indice }) => indice),
    }
  }, [meseZona, elemente, canvasZona])
  const numarInAfara = inAfara.mese.length + inAfara.structura.length

  /** Aduce inapoi in canvas tot ce a ramas afara, fara sa schimbe dimensiuni. */
  function aduInCanvas() {
    if (!canvasZona) return
    for (const id of inAfara.mese) {
      const masa = meseZona.find((m) => m.id === id)
      if (!masa) continue
      const pozitie = inCanvas(
        { latime: masa.latime, inaltime: masa.inaltime },
        canvasZona,
        { x: masa.pozitie_x, y: masa.pozitie_y },
      )
      salveazaMasa.mutate({ id, modificari: { pozitie_x: pozitie.x, pozitie_y: pozitie.y } })
    }
    if (inAfara.structura.length) {
      const setIndici = new Set(inAfara.structura)
      schimbaStructura({
        elemente: elemente.map((el, indice) => {
          if (!setIndici.has(indice)) return el
          const pozitie = inCanvas(
            { latime: el.latime, inaltime: el.inaltime },
            canvasZona,
            { x: el.x, y: el.y },
          )
          return { ...el, x: pozitie.x, y: pozitie.y }
        }),
      })
    }
  }

  /**
   * Copy / paste / duplicare (Ctrl+C, Ctrl+V, Ctrl+D).
   *
   * Clipboardul e local paginii, nu al sistemului: obiectele sunt randuri si
   * elemente jsonb, nu text, iar un JSON pus in clipboardul sistemului s-ar
   * putea lipi din greseala intr-un alt camp. Copia ateriza decalata cu un pas
   * de grid, ca sa se vada ca sunt doua obiecte, nu unul.
   *
   * Doar in builderul echipei: RLS da INSERT pe `tables` exclusiv rolului
   * Studio, deci in panoul restaurantului lipirea ar produce doar o eroare.
   */
  const [clipboard, setClipboard] = useState<
    | { tip: 'masa'; date: Pick<Masa, 'capacitate' | 'forma' | 'latime' | 'inaltime' | 'rotatie'> }
    | { tip: 'structura'; date: ElementStructura }
    | null
  >(null)

  function copiazaSelectia() {
    if (strat === 'mese' && masa) {
      setClipboard({
        tip: 'masa',
        date: {
          capacitate: masa.capacitate,
          forma: masa.forma,
          latime: masa.latime,
          inaltime: masa.inaltime,
          rotatie: masa.rotatie,
        },
      })
      notificari.info(`Masa ${masa.numar_masa} a fost copiată. Ctrl+V o duplică.`)
      return
    }
    if (strat === 'structura' && element) {
      setClipboard({ tip: 'structura', date: { ...element } })
      notificari.info(`${SABLOANE_STRUCTURA[element.tip].eticheta} a fost copiat. Ctrl+V îl duplică.`)
    }
  }

  /** Lipeste continutul clipboardului, decalat fata de `dela`. */
  function lipeste(
    continut: NonNullable<typeof clipboard>,
    dela: { x: number; y: number } | null,
  ) {
    if (!zonaCurenta || !canvasZona) return
    const pas = zonaCurenta.grid_marime || 20
    const sursa = dela ?? { x: 0, y: 0 }

    if (continut.tip === 'masa') {
      const pozitie = inCanvas(
        { latime: continut.date.latime, inaltime: continut.date.inaltime },
        canvasZona,
        { x: sursa.x + pas, y: sursa.y + pas },
      )
      setStrat('mese')
      setStructuraSelectata(null)
      masaNoua.mutate({
        capacitate: continut.date.capacitate,
        pozitieX: pozitie.x,
        pozitieY: pozitie.y,
        forma: continut.date.forma,
        latime: continut.date.latime,
        inaltime: continut.date.inaltime,
        rotatie: continut.date.rotatie,
      })
      return
    }

    const pozitie = inCanvas(
      { latime: continut.date.latime, inaltime: continut.date.inaltime },
      canvasZona,
      { x: sursa.x + pas, y: sursa.y + pas },
    )
    setStrat('structura')
    setMasaSelectata(null)
    setStructuraSelectata(elemente.length)
    schimbaStructura({
      elemente: [...elemente, { ...continut.date, x: pozitie.x, y: pozitie.y }],
    })
  }

  /**
   * Scurtaturile stau pe `document`, nu pe canvas: canvasul e un SVG care nu
   * primeste focus de la sine, deci o combinatie apasata dupa un clic in panou
   * n-ar fi ajuns niciodata la el. In schimb trebuie sarite campurile de text —
   * altfel Ctrl+C dintr-un input ar duplica masa in loc sa copieze textul.
   */
  useEffect(() => {
    function laTasta(eveniment: globalThis.KeyboardEvent) {
      if (!eveniment.ctrlKey && !eveniment.metaKey) return
      const tinta = eveniment.target as HTMLElement | null
      if (
        tinta?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(tinta?.tagName ?? '')
      ) {
        return
      }

      const tasta = eveniment.key.toLowerCase()
      if (tasta === 'c') {
        eveniment.preventDefault()
        copiazaSelectia()
        return
      }
      if (tasta === 'v') {
        if (!clipboard) return
        eveniment.preventDefault()
        // Decalajul se ia fata de obiectul selectat daca e acelasi tip; altfel
        // fata de mijlocul planului, ca sa nu aterizeze in coltul stanga-sus.
        const sursa =
          clipboard.tip === 'masa' && masa
            ? { x: masa.pozitie_x, y: masa.pozitie_y }
            : clipboard.tip === 'structura' && element
              ? { x: element.x, y: element.y }
              : null
        lipeste(clipboard, sursa)
        return
      }
      if (tasta === 'd') {
        eveniment.preventDefault()
        if (strat === 'mese' && masa) {
          lipeste(
            {
              tip: 'masa',
              date: {
                capacitate: masa.capacitate,
                forma: masa.forma,
                latime: masa.latime,
                inaltime: masa.inaltime,
                rotatie: masa.rotatie,
              },
            },
            { x: masa.pozitie_x, y: masa.pozitie_y },
          )
        } else if (strat === 'structura' && element) {
          lipeste({ tip: 'structura', date: { ...element } }, { x: element.x, y: element.y })
        }
      }
    }

    document.addEventListener('keydown', laTasta)
    return () => document.removeEventListener('keydown', laTasta)
    // Fara lista de dependinte, INTENTIONAT: handler-ul citeste selectia
    // curenta, stratul si clipboardul, adica aproape toata starea paginii. O
    // lista ar fi trebuit sa le insire pe toate si ar fi ramas in urma la prima
    // uitata — iar o scurtatura care lipeste obiectul selectat acum doua
    // randari e mai rea decat una care se reataseaza la fiecare randare.
  })

  if (!restaurantId) return null

  const areSchita = Boolean(cerereStudio.data?.schita_image_url)
  const seIncarca = zone.isLoading || mese.isLoading || cerereStudio.isLoading
  const procentZoom = Math.round(scaraVedere * 100)

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* Bara de sus ramane subtire si neschimbata la rol: iesire, context,
          promisiunea de salvare. Restul ecranului e planul. */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <Button variant="ghost" size="sm" asChild>
            <Link to={RUTE.superadmin}>
              <ArrowLeftIcon />
              Înapoi
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              Editor plan · {restaurant?.nume ?? 'Restaurant'}
              {zonaCurenta ? ` · ${zonaCurenta.nume}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              Modificările se salvează imediat, la fiecare acțiune.
            </p>
          </div>
          {zonaCreataAcum && zonaCurenta && (
            <Badge variant="secondary" title="Zona din cerere nu exista și a fost creată acum.">
              Zonă creată automat
            </Badge>
          )}
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {seIncarca ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : zonaCurenta ? (
          <EditorZona
            zona={zonaCurenta}
            stratActiv={strat}
            // Singurul loc din aplicatie unde zoom-ul e interactiv: aici se
            // stabileste incadrarea pe care o vad apoi toti ceilalti.
            permiteZoom
            // Ecranul e al planului: canvasul se incadreaza inauntru, nu invers.
            umpleContainerul
            onVedere={preiaComenzileVederii}
            snapLaGrid={snapLaGrid}
            structura={elemente}
            mese={meseZona}
            fundal={
              schitaVizibila && schitaSemnata.data
                ? { url: schitaSemnata.data, opacitate: opacitateSchita / 100 }
                : null
            }
            overlayAI={arataAI ? (cerereStudio.data?.ai_rezultat ?? null) : null}
            masaSelectata={masaSelectata}
            onSelecteazaMasa={setMasaSelectata}
            onMutaMasa={(id, x, y) =>
              salveazaMasa.mutate({ id, modificari: { pozitie_x: x, pozitie_y: y } })
            }
            onRedimensioneazaMasa={(id, cutie) =>
              salveazaMasa.mutate({
                id,
                modificari: {
                  pozitie_x: cutie.x,
                  pozitie_y: cutie.y,
                  latime: cutie.latime,
                  inaltime: cutie.inaltime,
                },
              })
            }
            structuraSelectata={structuraSelectata}
            onSelecteazaStructura={setStructuraSelectata}
            onMutaStructura={(indice, x, y) =>
              schimbaStructura({
                elemente: elemente.map((el, i) => (i === indice ? { ...el, x, y } : el)),
              })
            }
            onRedimensioneazaStructura={(indice, cutie) =>
              schimbaStructura({
                elemente: elemente.map((el, i) =>
                  i === indice
                    ? {
                        ...el,
                        x: cutie.x,
                        y: cutie.y,
                        latime: cutie.latime,
                        inaltime: cutie.inaltime,
                      }
                    : el,
                ),
              })
            }
            onDropObiect={asazaObiect}
            className="absolute inset-0 rounded-none border-0"
          />
        ) : (
          <PanouFaraZona
            numeZonaCeruta={numeZonaCeruta}
            inLucru={zonaNoua.isPending}
            aEsuat={zonaNoua.isError}
            onReincearca={() => {
              zonaIncercata.current = null
              zonaNoua.mutate(numeZonaCeruta)
            }}
          />
        )}

        {/* Un singur strat de overlay peste canvas. `pointer-events-none` pe el
            si `auto` pe panouri: spatiul dintre ele ramane al planului, deci se
            poate trage vederea si pe langa panouri. */}
        {zonaCurenta && (
          <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3">
            <div className="pointer-events-auto mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-border bg-card/80 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="zoom-manual" className="text-xs font-normal">
                  Zoom
                </Label>
                <input
                  id="zoom-manual"
                  type="range"
                  min={Math.round(SCARA_MIN * 100)}
                  max={Math.round(SCARA_MAX * 100)}
                  step={5}
                  value={procentZoom}
                  onChange={(e) => comenziVedere.current?.laScara(Number(e.target.value) / 100)}
                  className="w-24 accent-primary"
                  aria-label="Zoom-ul de lucru"
                />
                <span className="w-10 text-xs tabular-nums text-muted-foreground">
                  {procentZoom}%
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => comenziVedere.current?.centreazaCanvas()}
                  title="Aduce tot canvasul în ecran — exact încadrarea cu care se publică planul."
                >
                  <ScanIcon />
                  Încadrează canvasul
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => comenziVedere.current?.laScara(1)}
                  title="Revine la scara 1:1, fără să mute privirea."
                >
                  100%
                </Button>
                <Button
                  variant={snapLaGrid ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={snapLaGrid}
                  onClick={() => setSnapLaGrid((activ) => !activ)}
                  title={
                    snapLaGrid
                      ? `Magnet pornit: obiectele se lipesc de grid, la ${zonaCurenta.grid_marime} px. Ține Alt apăsat pentru o mutare liberă.`
                      : 'Magnet oprit: obiectele rămân exact unde le lași.'
                  }
                >
                  <MagnetIcon />
                  {snapLaGrid ? `Magnet ${zonaCurenta.grid_marime}` : 'Magnet oprit'}
                </Button>
              </div>

              {/* §42.5 — schita originala: toggle de afisare + opacitate. */}
              {areSchita && (
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="schita-vizibila" className="text-xs font-normal">
                    Schiță
                  </Label>
                  <Switch
                    id="schita-vizibila"
                    checked={schitaVizibila}
                    onCheckedChange={setSchitaVizibila}
                  />
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={opacitateSchita}
                    disabled={!schitaVizibila}
                    onChange={(e) => setOpacitateSchita(Number(e.target.value))}
                    className="w-20 accent-primary"
                    aria-label="Opacitatea schiței"
                  />
                </div>
              )}

              {/* §9.2.2 pasul 1 + §41.3 — Best Guess-ul: generare/regenerare,
                  afisare fantomatica si preluarea structurii in stratul real. */}
              {areSchita && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={genereazaAI.isPending}
                    onClick={() => genereazaAI.mutate()}
                  >
                    {genereazaAI.isPending
                      ? 'Generează...'
                      : cerereStudio.data?.ai_generat_la
                        ? 'Reîncearcă generarea AI'
                        : 'Generează AI'}
                  </Button>
                  {cerereStudio.data?.ai_rezultat && (
                    <>
                      <Label htmlFor="arata-ai" className="text-xs font-normal">
                        AI
                      </Label>
                      <Switch id="arata-ai" checked={arataAI} onCheckedChange={setArataAI} />
                      {strat === 'structura' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={salveazaStructura.isPending}
                          onClick={() =>
                            schimbaStructura({
                              elemente: [
                                ...elemente,
                                ...(cerereStudio.data!.ai_rezultat!.structura ?? []),
                              ],
                            })
                          }
                        >
                          Preia structura AI
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Importul NU e conditionat de existenta schitei: rostul lui e
                  tocmai sa mearga acolo unde generarea AI nu poate (fara cheie
                  de API), iar geometria poate veni si dintr-un plan pe hartie. */}
              <Button variant="outline" size="sm" onClick={() => setImportDeschis(true)}>
                Importă geometrie
              </Button>

              {/* Ce iese din canvas nu se publica. Fara semnalul asta, un obiect
                  ramas afara dupa micsorarea canvasului sau dupa un import ar
                  disparea din sala fara ca nimeni sa afle de ce. */}
              {numarInAfara > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-status-expirare-soft px-2 py-1">
                  <span className="text-xs">
                    {numarInAfara === 1
                      ? 'Un obiect e în afara canvasului și nu se va publica.'
                      : `${numarInAfara} obiecte sunt în afara canvasului și nu se vor publica.`}
                  </span>
                  <Button size="xs" variant="secondary" onClick={aduInCanvas}>
                    Adu-le înăuntru
                  </Button>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 items-stretch gap-3">
              {/* ── Paleta de obiecte ── */}
              <aside className="pointer-events-auto flex w-52 flex-col overflow-hidden rounded-xl border border-border bg-card/80 shadow-sm backdrop-blur-md">
                <div className="border-b border-border/60 p-3">
                  <h2 className="text-sm font-semibold">Obiecte</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Trage-le pe plan, unde le vrei.
                  </p>
                  <div className="mt-2 flex overflow-hidden rounded-md border border-border">
                    {(
                      [
                        ['mese', 'Mese'],
                        ['structura', 'Structură'],
                      ] as const
                    ).map(([valoare, eticheta]) => (
                      <button
                        key={valoare}
                        type="button"
                        aria-pressed={strat === valoare}
                        onClick={() => {
                          setStrat(valoare)
                          setMasaSelectata(null)
                          setStructuraSelectata(null)
                        }}
                        className={cn(
                          'flex-1 px-2.5 py-1 text-xs font-medium',
                          strat === valoare
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-transparent text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {eticheta}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto p-3">
                  <p className="text-xs font-medium text-muted-foreground">Mese</p>
                  {FORME_MASA.map((forma) => (
                    <ObiectPaleta
                      key={forma}
                      obiect={`masa:${forma}`}
                      eticheta={SABLOANE_MASA[forma].eticheta}
                      latime={SABLOANE_MASA[forma].latime}
                      inaltime={SABLOANE_MASA[forma].inaltime}
                      rotund={forma === 'rotunda'}
                      clasa="bg-status-liber-soft ring-1 ring-status-liber"
                      onAseaza={() => asazaObiect(`masa:${forma}`, centrulPlanului())}
                    />
                  ))}

                  <p className="mt-2 text-xs font-medium text-muted-foreground">Structură</p>
                  {TIPURI_STRUCTURA.map((tip) => (
                    <ObiectPaleta
                      key={tip}
                      obiect={`structura:${tip}`}
                      eticheta={SABLOANE_STRUCTURA[tip].eticheta}
                      latime={SABLOANE_STRUCTURA[tip].latime}
                      inaltime={SABLOANE_STRUCTURA[tip].inaltime}
                      rotund={tip === 'planta'}
                      clasa={CLASA_PICTOGRAMA[tip]}
                      onAseaza={() => asazaObiect(`structura:${tip}`, centrulPlanului())}
                    />
                  ))}
                </div>

                <p className="border-t border-border/60 p-3 text-xs text-muted-foreground">
                  {strat === 'mese'
                    ? `${meseZona.length} mese în zonă.`
                    : `${elemente.length} elemente de structură.`}{' '}
                  Cu obiectul selectat: săgețile îl mută cu un pas de grid, Shift + săgeți cu un
                  pixel, pătrățelele din colțuri îl redimensionează (Shift păstrează proporția),
                  Alt ține mutarea liberă, iar Ctrl+C / Ctrl+V / Ctrl+D îl duplică.
                </p>
              </aside>

              {/* Golul din mijloc ramane al planului: aici se trage vederea. */}
              <div className="flex-1" />

              {/* ── Proprietatile obiectului selectat ── */}
              <aside className="pointer-events-auto flex w-72 flex-col overflow-y-auto rounded-xl border border-border bg-card/80 shadow-sm backdrop-blur-md">
                {strat === 'mese' && masa ? (
                  <PanouMasa
                    masa={masa}
                    zona={zonaCurenta}
                    onSalveaza={salveazaMasa.mutate}
                    onCereStergere={() =>
                      setStergere({ tip: 'masa', id: masa.id, nume: masa.numar_masa })
                    }
                  />
                ) : strat === 'structura' && element && structuraSelectata !== null ? (
                  <PanouStructura
                    element={element}
                    zona={zonaCurenta}
                    onSalveaza={(modificari) =>
                      schimbaStructura({
                        elemente: elemente.map((el, i) =>
                          i === structuraSelectata ? { ...el, ...modificari } : el,
                        ),
                      })
                    }
                    onSterge={() => {
                      schimbaStructura({
                        elemente: elemente.filter((_, i) => i !== structuraSelectata),
                      })
                      // Indicii se decaleaza dupa stergere, deci selectia veche
                      // ar arata alt element. O golim.
                      setStructuraSelectata(null)
                    }}
                  />
                ) : (
                  <PanouZona
                    zona={zonaCurenta}
                    onSalveaza={salveazaZona.mutate}
                    onCereStergere={() =>
                      setStergere({ tip: 'zona', id: zonaCurenta.id, nume: zonaCurenta.nume })
                    }
                  />
                )}

                {strat === 'structura' && (
                  <>
                    <Sectiune titlu="Stratul de structură">
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                        <Label htmlFor="strat-vizibil" className="text-sm">
                          Vizibil
                        </Label>
                        <Switch
                          id="strat-vizibil"
                          checked={layer1.data?.vizibil ?? true}
                          onCheckedChange={(vizibil) => schimbaStructura({ vizibil })}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                        <Label htmlFor="strat-publicat" className="text-sm">
                          Publicat
                        </Label>
                        <Switch
                          id="strat-publicat"
                          checked={layer1.data?.publicat ?? false}
                          onCheckedChange={(publicat) => schimbaStructura({ publicat })}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Structura ajunge în widgetul public doar dacă e și vizibilă, și publicată —
                        vederea structura_publica cere ambele. Mesele nu depind de asta.
                      </p>
                    </Sectiune>

                    {/* ── Istoricul versiunilor publicate (§40) ── */}
                    <Sectiune titlu="Versiuni publicate">
                      {(istoric.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Încă nicio versiune. Fiecare publicare a structurii lasă un instantaneu
                          aici, ca o greșeală să nu fie definitivă.
                        </p>
                      ) : (
                        <ul className="grid max-h-56 gap-1 overflow-y-auto">
                          {(istoric.data ?? []).map((versiune) => (
                            <li
                              key={versiune.id}
                              className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                            >
                              <span className="min-w-0">
                                <span className="block font-medium">{versiune.nume}</span>
                                <span className="block text-muted-foreground tabular-nums">
                                  {versiune.publicat_la
                                    ? new Date(versiune.publicat_la).toLocaleString('ro-RO', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      })
                                    : '—'}
                                </span>
                              </span>
                              {versiune.status === 'published' ? (
                                <Badge variant="secondary">Acum</Badge>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  disabled={revino.isPending}
                                  onClick={() => revino.mutate(versiune.id)}
                                >
                                  Revino
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Revenirea nu șterge nimic: scrie versiunea aleasă ca versiune nouă, deci se
                        poate reveni și din ea.
                      </p>
                    </Sectiune>
                  </>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>

      {importDeschis && zonaCurenta && (
        <Dialog open onOpenChange={(deschis) => !deschis && !importInLucru && setImportDeschis(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Importă geometrie în „{zonaCurenta.nume}”</DialogTitle>
              <DialogDescription>
                Lipește geometria în format JSON. Structura se adaugă peste ce există deja, iar
                mesele se creează numerotate automat. Nimic nu se publică — verifici pe plan
                înainte.
              </DialogDescription>
            </DialogHeader>

            <Textarea
              rows={10}
              value={textImport}
              onChange={(e) => {
                setTextImport(e.target.value)
                if (eroriImport.length) setEroriImport([])
              }}
              placeholder={'{\n  "structura": [{ "tip": "perete", "x": 0, "y": 0, "latime": 600, "inaltime": 10 }],\n  "mese": [{ "forma": "rotunda", "x": 80, "y": 120, "latime": 70, "inaltime": 70, "capacitate": 4 }]\n}'}
              className="font-mono text-xs"
            />

            {eroriImport.length > 0 && (
              <ul className="grid gap-1 rounded-lg border border-destructive/50 bg-status-ocupat-soft px-3 py-2 text-xs">
                {eroriImport.slice(0, 6).map((eroare) => (
                  <li key={eroare}>{eroare}</li>
                ))}
                {eroriImport.length > 6 && <li>și încă {eroriImport.length - 6}...</li>}
              </ul>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                disabled={importInLucru}
                onClick={() => setImportDeschis(false)}
              >
                Renunță
              </Button>
              <Button
                disabled={importInLucru || !textImport.trim()}
                onClick={() => {
                  const rezultat = importaGeometrie(textImport, {
                    latime: zonaCurenta.canvas_latime,
                    inaltime: zonaCurenta.canvas_inaltime,
                  })
                  if (!rezultat.ok) {
                    setEroriImport(rezultat.erori)
                    return
                  }
                  // Avertismentele nu opresc importul, dar se spun: un element
                  // in afara canvasului nu se vede, si ar parea pierdut.
                  for (const avertisment of rezultat.avertismente) {
                    notificari.info(avertisment)
                  }
                  void aplicaImportul(rezultat.date)
                }}
              >
                {importInLucru ? 'Se aplică...' : 'Aplică pe plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {stergere && (
        <DialogStergere
          titlu={stergere.tip === 'zona' ? `Ștergi zona „${stergere.nume}”?` : `Ștergi masa ${stergere.nume}?`}
          descriere={
            stergere.tip === 'zona'
              ? 'Se șterg și toate mesele din ea. Dacă zona are rezervări viitoare, baza de date refuză ștergerea — dezactiveaz-o în loc.'
              : 'Dacă masa are rezervări viitoare, baza de date refuză ștergerea — dezactiveaz-o în loc.'
          }
          inLucru={eliminaZona.isPending || eliminaMasa.isPending}
          onInchide={() => setStergere(null)}
          onConfirma={() =>
            stergere.tip === 'zona'
              ? eliminaZona.mutate(stergere.id)
              : eliminaMasa.mutate(stergere.id)
          }
        />
      )}
    </div>
  )
}

/**
 * Nu avem pe ce lucra: ori cererea nu spune nicio zona si restaurantul n-are
 * niciuna, ori crearea automata e in curs sau a esuat. Ecranul spune care din
 * ele, fiindca remediul difera.
 */
function PanouFaraZona({
  numeZonaCeruta,
  inLucru,
  aEsuat,
  onReincearca,
}: {
  numeZonaCeruta: string
  inLucru: boolean
  aEsuat: boolean
  onReincearca: () => void
}) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="grid max-w-md gap-3 rounded-xl border border-border bg-card p-6 text-center">
        {!numeZonaCeruta ? (
          <>
            <p className="text-sm font-semibold">Nicio zonă de desenat</p>
            <p className="text-sm text-muted-foreground">
              Restaurantul nu are nicio cerere activă și nicio zonă. Builderul lucrează pe zona
              scrisă în cerere, deci aici nu are ce desena încă.
            </p>
          </>
        ) : inLucru ? (
          <>
            <p className="text-sm font-semibold">Se creează zona „{numeZonaCeruta}”...</p>
            <p className="text-sm text-muted-foreground">
              Zona cerută nu exista încă pentru acest restaurant.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">Zona „{numeZonaCeruta}” nu există</p>
            <p className="text-sm text-muted-foreground">
              {aEsuat
                ? 'Crearea automată a eșuat. Încearcă din nou.'
                : 'Zona cerută a fost ștearsă. Creeaz-o la loc ca să poți desena planul.'}
            </p>
            <Button className="justify-self-center" onClick={onReincearca}>
              Creează zona „{numeZonaCeruta}”
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Proprietatile zonei — ce se vede cand nimic nu e selectat. Aici sta si
 * incadrarea publicata (`zoom_implicit`): e o proprietate a zonei, nu unealta
 * de lucru. Zoom-ul din bara de sus e al operatorului si nu se salveaza nicaieri;
 * asta e valoarea pe care o vad Adminul, ospatarul si widgetul public.
 */
function PanouZona({
  zona,
  onSalveaza,
  onCereStergere,
}: {
  zona: Zona
  onSalveaza: (argumente: { id: string; modificari: Parameters<typeof actualizeazaZona>[1] }) => void
  onCereStergere: () => void
}) {
  const salveaza = (modificari: Parameters<typeof actualizeazaZona>[1]) =>
    onSalveaza({ id: zona.id, modificari })

  return (
    <Sectiune titlu={`Zona „${zona.nume}”`}>
      <div className="grid gap-1.5">
        <Label htmlFor="nume-zona">Nume</Label>
        <Input
          id="nume-zona"
          key={`nume-${zona.id}`}
          defaultValue={zona.nume}
          className="h-8"
          onBlur={(e) => {
            const nume = e.target.value.trim()
            if (!nume || nume === zona.nume) return
            salveaza({ nume })
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['canvas_latime', 'Lățime'],
            ['canvas_inaltime', 'Înălțime'],
          ] as const
        ).map(([cheie, eticheta]) => (
          <div key={cheie} className="grid gap-1.5">
            <Label htmlFor={cheie}>{eticheta}</Label>
            <Input
              id={cheie}
              type="number"
              min={200}
              max={5000}
              step={20}
              key={`${cheie}-${zona.id}`}
              defaultValue={String(zona[cheie])}
              className="h-8 tabular-nums"
              onBlur={(e) => {
                const valoare = Number(e.target.value)
                if (!Number.isFinite(valoare) || valoare === zona[cheie]) return
                salveaza({ [cheie]: valoare })
              }}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="grid">Pas grid</Label>
        <Input
          id="grid"
          type="number"
          min={5}
          max={100}
          step={5}
          key={`grid-${zona.id}`}
          defaultValue={String(zona.grid_marime)}
          className="h-8 w-24 tabular-nums"
          onBlur={(e) => {
            const valoare = Number(e.target.value)
            if (!Number.isFinite(valoare) || valoare === zona.grid_marime) return
            salveaza({ grid_marime: valoare })
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Canvasul e rama planului. La publicare el umple tot spațiul disponibil, păstrând raportul
        {' '}{zona.canvas_latime}:{zona.canvas_inaltime} — deci restaurantul și widgetul public văd
        exact ce încape în chenar. Ce rămâne în afara lui nu se publică.
      </p>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
        <Label htmlFor="zona-activa" className="text-sm">
          Zonă activă
        </Label>
        <Switch
          id="zona-activa"
          checked={zona.activa}
          onCheckedChange={(activa) => salveaza({ activa })}
        />
      </div>

      <Button variant="destructive" size="xs" className="justify-self-start" onClick={onCereStergere}>
        <Trash2Icon />
        Șterge zona
      </Button>
    </Sectiune>
  )
}

/**
 * Cele doua coordonate ale obiectului selectat.
 *
 * Exista pentru cazul in care magnetul nu ajunge: cand doua mese trebuie sa fie
 * la exact aceeasi inaltime, ochiul si degetul nu bat un numar scris. Campurile
 * se re-monteaza la fiecare schimbare de valoare (cheia contine valoarea), ca
 * dupa o tragere sa arate pozitia noua, nu pe cea de la selectare.
 */
function CampuriPozitie({
  cheie,
  x,
  y,
  latime,
  inaltime,
  canvas,
  pas,
  onSalveaza,
}: {
  cheie: string
  x: number
  y: number
  latime: number
  inaltime: number
  canvas: { latime: number; inaltime: number }
  pas: number
  onSalveaza: (pozitie: { x: number; y: number }) => void
}) {
  function schimba(axa: 'x' | 'y', valoare: number) {
    if (!Number.isFinite(valoare)) return
    const ceruta = axa === 'x' ? { x: valoare, y } : { x, y: valoare }
    // Aceeasi limitare ca la tragere: o coordonata scrisa de mana n-are voie sa
    // scoata obiectul din canvas, altfel n-ar mai fi vizibil la publicare.
    const pozitie = inCanvas({ latime, inaltime }, canvas, ceruta)
    if (pozitie.x === x && pozitie.y === y) return
    onSalveaza(pozitie)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ['x', 'X', x, Math.max(0, canvas.latime - latime)],
          ['y', 'Y', y, Math.max(0, canvas.inaltime - inaltime)],
        ] as const
      ).map(([axa, eticheta, valoare, maxim]) => (
        <div key={axa} className="grid gap-1.5">
          <Label htmlFor={`poz-${axa}`}>{eticheta}</Label>
          <Input
            id={`poz-${axa}`}
            type="number"
            min={0}
            max={maxim}
            step={pas}
            key={`poz-${axa}-${cheie}-${valoare}`}
            defaultValue={String(valoare)}
            className="h-8 tabular-nums"
            onBlur={(e) => schimba(axa, Number(e.target.value))}
          />
        </div>
      ))}
    </div>
  )
}

function PanouMasa({
  masa,
  zona,
  onSalveaza,
  onCereStergere,
}: {
  masa: Masa
  zona: Zona
  onSalveaza: (argumente: { id: string; modificari: Parameters<typeof actualizeazaMasa>[1] }) => void
  onCereStergere: () => void
}) {
  const salveaza = (modificari: Parameters<typeof actualizeazaMasa>[1]) =>
    onSalveaza({ id: masa.id, modificari })

  return (
    <Sectiune titlu={`Masa ${masa.numar_masa}`}>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="numar">Număr</Label>
          <Input
            id="numar"
            key={`numar-${masa.id}`}
            defaultValue={masa.numar_masa}
            className="h-8"
            onBlur={(e) => {
              const numar_masa = e.target.value.trim()
              if (!numar_masa || numar_masa === masa.numar_masa) return
              salveaza({ numar_masa })
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="capacitate">Locuri</Label>
          <Input
            id="capacitate"
            type="number"
            min={1}
            max={24}
            key={`cap-${masa.id}`}
            defaultValue={String(masa.capacitate)}
            className="h-8 tabular-nums"
            onBlur={(e) => {
              const capacitate = Number(e.target.value)
              if (!Number.isFinite(capacitate) || capacitate === masa.capacitate) return
              salveaza({ capacitate })
            }}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="forma">Formă</Label>
        <Select
          value={masa.forma}
          onValueChange={(forma) => salveaza({ forma: forma as Enums<'masa_forma'> })}
        >
          <SelectTrigger id="forma" className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ETICHETE_FORMA).map(([valoare, eticheta]) => (
              <SelectItem key={valoare} value={valoare}>
                {eticheta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['latime', 'Lățime'],
            ['inaltime', 'Înălțime'],
            ['rotatie', 'Rotație'],
          ] as const
        ).map(([cheie, eticheta]) => (
          <div key={cheie} className="grid gap-1.5">
            <Label htmlFor={cheie}>{eticheta}</Label>
            <Input
              id={cheie}
              type="number"
              min={cheie === 'rotatie' ? 0 : 20}
              max={cheie === 'rotatie' ? 359 : 400}
              step={cheie === 'rotatie' ? 15 : 10}
              key={`${cheie}-${masa.id}`}
              defaultValue={String(masa[cheie])}
              className="h-8 tabular-nums"
              onBlur={(e) => {
                const valoare = Number(e.target.value)
                if (!Number.isFinite(valoare) || valoare === Number(masa[cheie])) return
                salveaza({ [cheie]: valoare })
              }}
            />
          </div>
        ))}
      </div>

      <CampuriPozitie
        cheie={masa.id}
        x={masa.pozitie_x}
        y={masa.pozitie_y}
        latime={masa.latime}
        inaltime={masa.inaltime}
        canvas={{ latime: zona.canvas_latime, inaltime: zona.canvas_inaltime }}
        pas={zona.grid_marime}
        onSalveaza={(pozitie) => salveaza({ pozitie_x: pozitie.x, pozitie_y: pozitie.y })}
      />

      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
        <Label htmlFor="masa-activa" className="text-sm">
          Masă activă
        </Label>
        <Switch
          id="masa-activa"
          checked={masa.activa}
          onCheckedChange={(activa) => salveaza({ activa })}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        O masă cu rezervări viitoare nu poate fi ștearsă — dezactiveaz-o, ca să nu rămână
        rezervări fără masă. Regula e impusă de baza de date.
      </p>

      <Button variant="destructive" size="xs" className="justify-self-start" onClick={onCereStergere}>
        <Trash2Icon />
        Șterge masa
      </Button>
    </Sectiune>
  )
}

/**
 * Elementele de structura nu au rand propriu in baza: sunt obiecte intr-un
 * array jsonb, deci se identifica prin indice si se salveaza rescriind tot
 * array-ul. De aceea panoul primeste doar `modificari` partiale.
 */
function PanouStructura({
  element,
  zona,
  onSalveaza,
  onSterge,
}: {
  element: ElementStructura
  zona: Zona
  onSalveaza: (modificari: Partial<ElementStructura>) => void
  onSterge: () => void
}) {
  const sablon = SABLOANE_STRUCTURA[element.tip]
  // Cheia pentru campurile necontrolate: la schimbarea selectiei trebuie sa
  // reciteasca defaultValue, altfel ar arata valorile elementului anterior.
  const cheie = `${element.tip}-${element.x}-${element.y}`

  return (
    <Sectiune titlu={sablon.eticheta}>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['latime', 'Lățime'],
            ['inaltime', 'Înălțime'],
            ['rotatie', 'Rotație'],
          ] as const
        ).map(([camp, eticheta]) => (
          <div key={camp} className="grid gap-1.5">
            <Label htmlFor={`str-${camp}`}>{eticheta}</Label>
            <Input
              id={`str-${camp}`}
              type="number"
              min={camp === 'rotatie' ? 0 : 10}
              max={camp === 'rotatie' ? 359 : 2000}
              step={camp === 'rotatie' ? 15 : 10}
              key={`${camp}-${cheie}`}
              defaultValue={String(element[camp] ?? 0)}
              className="h-8 tabular-nums"
              onBlur={(e) => {
                const valoare = Number(e.target.value)
                if (!Number.isFinite(valoare) || valoare === (element[camp] ?? 0)) return
                onSalveaza({ [camp]: valoare })
              }}
            />
          </div>
        ))}
      </div>

      <CampuriPozitie
        cheie={cheie}
        x={element.x}
        y={element.y}
        latime={element.latime}
        inaltime={element.inaltime}
        canvas={{ latime: zona.canvas_latime, inaltime: zona.canvas_inaltime }}
        pas={zona.grid_marime}
        onSalveaza={(pozitie) => onSalveaza(pozitie)}
      />

      <div className="grid gap-1.5">
        <Label htmlFor="str-eticheta">Etichetă</Label>
        <Input
          id="str-eticheta"
          key={`eticheta-${cheie}`}
          defaultValue={element.eticheta ?? ''}
          className="h-8"
          placeholder="Se scrie doar pe elementele mari"
          onBlur={(e) => {
            const eticheta = e.target.value.trim()
            if (eticheta === (element.eticheta ?? '')) return
            onSalveaza({ eticheta: eticheta || undefined })
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="str-z">Ordine de desenare (z)</Label>
        <Input
          id="str-z"
          type="number"
          min={0}
          max={99}
          key={`z-${cheie}`}
          defaultValue={String(element.z ?? 0)}
          className="h-8 w-24 tabular-nums"
          onBlur={(e) => {
            const z = Number(e.target.value)
            if (!Number.isFinite(z) || z === (element.z ?? 0)) return
            onSalveaza({ z })
          }}
        />
        <p className="text-xs text-muted-foreground">
          Mai mare = desenat deasupra. Util ca o plantă să stea peste bar.
        </p>
      </div>

      <Button variant="destructive" size="xs" className="justify-self-start" onClick={onSterge}>
        <Trash2Icon />
        Șterge elementul
      </Button>
    </Sectiune>
  )
}
