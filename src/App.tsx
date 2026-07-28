import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * PROVIZORIU — verifica doar ca design system-ul (spec §3) se aplica corect.
 * Se inlocuieste cu <RouterProvider> in pasul urmator al Fazei 1.
 */
const STATUSURI = [
  { cheie: 'liber', eticheta: 'Libera', clasa: 'bg-status-liber text-status-liber-foreground' },
  { cheie: 'ocupat', eticheta: 'Ocupata', clasa: 'bg-status-ocupat text-status-ocupat-foreground' },
  { cheie: 'expirare', eticheta: 'In expirare', clasa: 'bg-status-expirare text-status-expirare-foreground' },
  { cheie: 'eveniment', eticheta: 'Eveniment', clasa: 'bg-status-eveniment text-status-eveniment-foreground' },
] as const

function App() {
  return (
    <main className="min-h-svh bg-background p-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>TableX — verificare design system</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Regula 60-30-10 si Traffic Light System, exclusiv prin variabile CSS.
          </p>

          <div className="flex flex-wrap gap-2">
            {STATUSURI.map((s) => (
              <span
                key={s.cheie}
                className={`rounded-md px-3 py-1 text-sm font-medium ${s.clasa}`}
              >
                {s.eticheta}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button>Actiune principala</Button>
            <Button variant="secondary">Secundara</Button>
            <Button variant="destructive">Distructiva</Button>
            <Button variant="outline">Contur</Button>
          </div>

          <Button
            variant="outline"
            onClick={() => document.documentElement.classList.toggle('dark')}
          >
            Comuta tema (light / dark)
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
