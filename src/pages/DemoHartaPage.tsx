import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeftIcon, ClockIcon } from 'lucide-react'

import { BaraOrara } from '@/components/floor-plan/BaraOrara'
import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MESE_DEMO,
  ORA_VARF_DEMO,
  PROGRAM_DEMO,
  STRUCTURA_DEMO,
  ZONE_DEMO,
  formateazaOra,
  statusuriLaOra,
} from '@/lib/harta-demo'
import { ETICHETE_STATUS } from '@/types/floor-plan'
import { RUTE } from '@/lib/rute'
import { CadruPublic } from '@/components/layout/CadruPublic'

export function DemoHartaPage() {
  const [zonaId, setZonaId] = useState(ZONE_DEMO[0].id)
  /**
   * `null` inseamna „ora de referinta a demonstratiei", exact conventia din
   * panou, unde null inseamna „urmareste prezentul". Asa bara orara e chiar
   * componenta livrata, nu una refacuta pentru vitrina — inclusiv butonul de
   * intoarcere, care apare doar dupa ce ai plecat de la ora de pornire.
   */
  const [oraAleasa, setOraAleasa] = useState<number | null>(null)
  const ora = oraAleasa ?? ORA_VARF_DEMO
  const [masaSelectata, setMasaSelectata] = useState<string | null>(null)

  const zona = ZONE_DEMO.find((z) => z.id === zonaId) ?? ZONE_DEMO[0]
  const mese = MESE_DEMO[zonaId] ?? []
  const statusuri = useMemo(() => statusuriLaOra(ora, zonaId), [ora, zonaId])

  const masa = mese.find((m) => m.id === masaSelectata) ?? null
  const status = masa ? (masa.indisponibila ? 'inactiv' : (statusuri[masa.id] ?? 'liber')) : null

  const libere = mese.filter((m) => !m.indisponibila && !statusuri[m.id]).length
  const locuriLibere = mese
    .filter((m) => !m.indisponibila && !statusuri[m.id])
    .reduce((total, m) => total + m.capacitate, 0)

  function schimbaZona(idNou: string) {
    setZonaId(idNou)
    setMasaSelectata(null)
  }

  return (
    <CadruPublic>
      {/* Antetul propriu a disparut: pagina purta alta bara decat landing-ul,
          cu alt logo si alt buton de intoarcere. Acum poarta bara comuna, iar
          titlul ramane doar continut. */}
      <div className="wrap-landing flex items-center justify-between gap-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Înapoi">
            <Link to={RUTE.acasa}>
              <ArrowLeftIcon />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              Harta 2D — demonstrație
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Date fictive. Aceeași formă pe care o are planul unui restaurant real.
            </p>
          </div>
        </div>
        <Badge variant="secondary">demo</Badge>
      </div>

      <div className="wrap-landing grid gap-4 pb-16 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={zonaId} onValueChange={schimbaZona}>
              <TabsList>
                {ZONE_DEMO.map((z) => (
                  <TabsTrigger key={z.id} value={z.id}>
                    {z.nume}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <LegendaStatus />
          </div>

          {/* §28.12 — aceeasi bara ca in panoul restaurantului, pe toata latimea,
              deasupra canvasului. Exact asezarea din HartaPage. */}
          <BaraOrara
            program={PROGRAM_DEMO}
            oraAfisata={ora}
            oraLive={ORA_VARF_DEMO}
            urmarestePrezentul={oraAleasa === null}
            onSchimba={setOraAleasa}
          />

          <HartaZona
            zona={zona}
            structura={STRUCTURA_DEMO[zonaId]}
            mese={mese}
            statusuri={statusuri}
            masaSelectata={masaSelectata}
            onSelecteazaMasa={setMasaSelectata}
            className="w-full"
          />

          <p className="text-xs text-muted-foreground">
            Click pe o masă pentru detalii. Tab și Enter funcționează la fel, pentru navigarea de
            la tastatură. Planul se vede întreg, exact cum îl vede și restaurantul — nu se mută și
            nu se apropie.
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          {/* Dovada practica a deciziei din schema: statusul mesei se
              recalculeaza, nu se citeste dintr-o coloana. Ora se ALEGE din bara
              de deasupra hartii, ca in panou; aici ramane doar valoarea, mare,
              pentru cine se uita de la distanta — tot ca in panou. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClockIcon className="size-4 text-primary" />
                Ora afișată
              </CardTitle>
              <CardDescription>
                Alege o oră din bara de deasupra hărții și vezi cum se schimbă sala.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{formateazaOra(ora)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disponibilitate</CardTitle>
              <CardDescription>{zona.nume}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Mese libere</dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {libere}/{mese.filter((m) => !m.indisponibila).length}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Locuri libere</dt>
                  <dd className="text-lg font-semibold tabular-nums">{locuriLibere}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Masa selectată</CardTitle>
            </CardHeader>
            <CardContent>
              {masa && status ? (
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Număr</dt>
                    <dd className="font-medium">{masa.numar_masa}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Capacitate</dt>
                    <dd className="font-medium">{masa.capacitate} locuri</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Formă</dt>
                    <dd className="font-medium capitalize">{masa.forma}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium">{ETICHETE_STATUS[status]}</dd>
                  </div>
                  {masa.grup_unire_id && (
                    <p className="text-xs text-muted-foreground">
                      Face parte dintr-un grup de mese unite.
                    </p>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nicio masă selectată. Click pe o masă din hartă.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </CadruPublic>
  )
}
