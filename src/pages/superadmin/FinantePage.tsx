import { InfoIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Finance & Monetization — DEMO / Placeholder (§9.2.4, §44).
 *
 * Tot ce se vede aici e FALS si marcat ca atare: date mock hardcodate in
 * frontend (§48 — fara tabele reale), 100% read-only (§44.2 — nicio actiune,
 * niciun filtru functional, niciun export). Pagina exista ca sa arate exact
 * cum va arata modulul cand se conecteaza Stripe — printr-un prompt dedicat,
 * ulterior (§44.3).
 *
 * Graficele sunt SVG scris de mana, ca in restul aplicatiei: o librarie de
 * charting ar aduce zeci de kiloocteti pentru cateva dreptunghiuri.
 */

const MRR_LUNAR_DEMO = [
  { luna: 'Mar', valoare: 310 },
  { luna: 'Apr', valoare: 385 },
  { luna: 'Mai', valoare: 460 },
  { luna: 'Iun', valoare: 520 },
  { luna: 'Iul', valoare: 615 },
  { luna: 'Aug', valoare: 700 },
]

const VENITURI_DEMO = [
  { sursa: 'Abonamente (Start + Pro)', valoare: 700, pondere: 62 },
  { sursa: 'Configurari floor plan', valoare: 240, pondere: 21 },
  { sursa: 'Credite WhatsApp', valoare: 130, pondere: 12 },
  { sursa: 'Comisioane bilete', valoare: 55, pondere: 5 },
]

const FACTURI_DEMO = [
  { numar: 'TBX-2026-0841', client: 'Trattoria Monte', suma: '10,00 €', status: 'Platita', data: '28 iul 2026' },
  { numar: 'TBX-2026-0840', client: 'Bistro Aroma', suma: '5,00 €', status: 'Platita', data: '28 iul 2026' },
  { numar: 'TBX-2026-0839', client: 'Casa Veche', suma: '160,00 €', status: 'Platita', data: '27 iul 2026' },
  { numar: 'TBX-2026-0838', client: 'La Cuptor', suma: '10,00 €', status: 'Restanta', data: '25 iul 2026' },
  { numar: 'TBX-2026-0837', client: 'Vinoteca 9', suma: '50,00 €', status: 'Platita', data: '24 iul 2026' },
  { numar: 'TBX-2026-0836', client: 'Gradina de Vara', suma: '5,00 €', status: 'Emisa', data: '24 iul 2026' },
]

export function FinantePage() {
  const maxim = Math.max(...MRR_LUNAR_DEMO.map((l) => l.valoare))

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold tracking-tight">Finance & Monetization</h1>

      {/* Nota vizibila ceruta de §44.3 — prima, nu in subsol. */}
      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 p-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          <span className="font-medium">Previzualizare cu date simulate.</span> Automatizarea
          facturilor, integrarea webhooks Stripe, ledger-ul de plati si rapoartele contabile se
          implementeaza ulterior, printr-un prompt dedicat. Nimic de aici nu e editabil si nicio
          cifra nu e reala.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolutie MRR (demo)</CardTitle>
            <CardDescription>Ultimele 6 luni, date simulate.</CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 300 120" className="w-full" role="img" aria-label="Grafic MRR demo">
              {MRR_LUNAR_DEMO.map((luna, i) => {
                const inaltime = (luna.valoare / maxim) * 90
                return (
                  <g key={luna.luna}>
                    <rect
                      x={12 + i * 48}
                      y={100 - inaltime}
                      width={30}
                      height={inaltime}
                      rx={3}
                      className="fill-primary/80"
                    />
                    <text
                      x={27 + i * 48}
                      y={112}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[9px]"
                    >
                      {luna.luna}
                    </text>
                    <text
                      x={27 + i * 48}
                      y={95 - inaltime}
                      textAnchor="middle"
                      className="fill-foreground text-[8px] tabular-nums"
                    >
                      {luna.valoare}€
                    </text>
                  </g>
                )
              })}
            </svg>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Venituri pe surse (demo)</CardTitle>
            <CardDescription>Luna curenta, date simulate.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {VENITURI_DEMO.map((sursa) => (
              <div key={sursa.sursa} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{sursa.sursa}</span>
                  <span className="font-medium tabular-nums">{sursa.valoare} €</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${sursa.pondere}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Facturi recente (demo)</CardTitle>
            <CardDescription>
              Structura viitorului tabel de facturare — randurile sunt simulate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="text-right">Suma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FACTURI_DEMO.map((factura) => (
                    <TableRow key={factura.numar}>
                      <TableCell className="font-medium tabular-nums">{factura.numar}</TableCell>
                      <TableCell>{factura.client}</TableCell>
                      <TableCell className="text-right tabular-nums">{factura.suma}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                            factura.status === 'Platita'
                              ? 'bg-status-liber-soft text-foreground'
                              : factura.status === 'Restanta'
                                ? 'bg-status-ocupat-soft text-foreground'
                                : 'bg-status-expirare-soft text-foreground'
                          }`}
                        >
                          {factura.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{factura.data}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
