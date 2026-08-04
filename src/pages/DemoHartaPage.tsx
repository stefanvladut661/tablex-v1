import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeftIcon, ClockIcon } from 'lucide-react'

import { HartaZona } from '@/components/floor-plan/HartaZona'
import { LegendaStatus } from '@/components/floor-plan/LegendaStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MESE_DEMO,
  STRUCTURA_DEMO,
  ZONE_DEMO,
  formateazaOra,
  statusuriLaOra,
} from '@/lib/harta-demo'
import { ETICHETE_STATUS } from '@/types/floor-plan'
import { RUTE } from '@/lib/rute'

const ORA_MIN = 10
const ORA_MAX = 23.5

export function DemoHartaPage() {
  const [zonaId, setZonaId] = useState(ZONE_DEMO[0].id)
  const [ora, setOra] = useState(19.5)
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
    <div className="min-h-svh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Înapoi">
              <Link to={RUTE.acasa}>
                <ArrowLeftIcon />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold tracking-tight">Harta 2D — demonstrație</h1>
              <p className="text-xs text-muted-foreground">
                Date fictive. Aceeași formă pe care o are planul unui restaurant real.
              </p>
            </div>
          </div>
          <Badge variant="secondary">demo</Badge>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-6 py-6 lg:grid-cols-[1fr_18rem]">
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

          <HartaZona
            zona={zona}
            structura={STRUCTURA_DEMO[zonaId]}
            mese={mese}
            statusuri={statusuri}
            masaSelectata={masaSelectata}
            onSelecteazaMasa={setMasaSelectata}
            className="w-full"
            // Demo-ul e singurul loc public unde zoom-ul are rost: vizitatorul
            // se joaca, nu conduce o sala. Textul de sub harta il si promitea.
            permiteZoom
          />

          <p className="text-xs text-muted-foreground">
            Scroll pentru zoom, trage pentru deplasare, click pe o masă pentru detalii. Tab și
            Enter funcționează la fel, pentru navigarea de la tastatură.
          </p>
        </div>

        <aside className="flex flex-col gap-4">
          {/* Bara orara (§28.12): dovada practica a deciziei din schema —
              statusul mesei se recalculeaza, nu se citeste dintr-o coloana. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClockIcon className="size-4 text-primary" />
                Ora afișată
              </CardTitle>
              <CardDescription>Derulează ziua și vezi cum se schimbă harta.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="text-2xl font-semibold tabular-nums">{formateazaOra(ora)}</div>
              <input
                type="range"
                min={ORA_MIN}
                max={ORA_MAX}
                step={0.25}
                value={ora}
                onChange={(e) => setOra(Number(e.target.value))}
                aria-label="Ora afișată pe hartă"
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formateazaOra(ORA_MIN)}</span>
                <span>{formateazaOra(ORA_MAX)}</span>
              </div>
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
      </main>
    </div>
  )
}
