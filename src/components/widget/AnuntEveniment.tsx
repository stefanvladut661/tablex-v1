import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatFus } from '@/lib/timp'
import type { EvenimentPublic } from '@/services/widget'

/**
 * Anuntul de eveniment de pe widget (§8.5), cu afisul lui cu tot — folosit in
 * DOUA locuri: pe pagina publica /r/[slug] si in preview-ul din wizardul de
 * eveniment (§29.4). O singura componenta, ca la formularul public: un preview
 * scris separat ar minti la prima schimbare a anuntului real.
 */
export function AnuntEveniment({
  eveniment,
  fus,
}: {
  eveniment: EvenimentPublic
  fus: string
}) {
  return (
    <Card className="overflow-hidden border-primary">
      {/* Afisul (§29.1): daca exista, e primul lucru pe care il vede clientul. */}
      {eveniment.afis_url && (
        <img
          src={eveniment.afis_url}
          alt={`Afișul evenimentului ${eveniment.nume}`}
          className="max-h-56 w-full object-cover"
        />
      )}
      <CardHeader>
        <CardTitle className="text-base">{eveniment.nume}</CardTitle>
        <CardDescription>
          {formatFus(eveniment.data_ora, 'EEEE, d MMMM · HH:mm', fus)}
          {eveniment.pret_de_la !== null && ` · bilete de la ${eveniment.pret_de_la} EUR`}
        </CardDescription>
      </CardHeader>
      {eveniment.descriere && (
        <CardContent className="text-sm text-muted-foreground">{eveniment.descriere}</CardContent>
      )}
    </Card>
  )
}
