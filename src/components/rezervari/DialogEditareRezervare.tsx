import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import { useNotificari } from '@/hooks/useNotificari'
import { useMutatiiRezervari } from '@/hooks/useRezervari'
import { formatFus, ora } from '@/lib/timp'
import { getMeseLibere, type MutareRezervare, type Rezervare } from '@/services/rezervari'

const FARA_MASA = 'fara-masa'

/**
 * Editarea unei rezervari existente (§26.3).
 *
 * Pana acum, la „venim 6, nu 4, si la 20:30", singura solutie era anularea si
 * recrearea — care pierdea sursa, notele si legatura cu fisa de client.
 *
 * Ce NU se editeaza aici: telefonul (§16.1 — e cheia fisei de client; vezi
 * comentariul din services/rezervari.ts) si statusul, care are butoane proprii,
 * cu tranzitii si emailuri legate de ele.
 */
export function DialogEditareRezervare({
  rezervare,
  fus,
  restaurantId,
  onInchide,
}: {
  rezervare: Rezervare
  fus: string
  restaurantId: string
  onInchide: () => void
}) {
  const { muta } = useMutatiiRezervari(restaurantId)
  const notificari = useNotificari()

  // Ora locala a restaurantului, nu a masinii care deschide pagina.
  const [ziua, setZiua] = useState(() => formatFus(rezervare.data_ora, 'yyyy-MM-dd', fus))
  const [oraAleasa, setOraAleasa] = useState(() => ora(rezervare.data_ora, fus))
  const [durata, setDurata] = useState(String(rezervare.durata_minute))
  const [nrPersoane, setNrPersoane] = useState(String(rezervare.nr_persoane))
  const [tableId, setTableId] = useState(rezervare.table_id ?? FARA_MASA)
  const [noteInterne, setNoteInterne] = useState(rezervare.note_interne ?? '')

  const dataOraNoua = useMemo(() => {
    const d = new Date(`${ziua}T${oraAleasa}:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }, [ziua, oraAleasa])

  /**
   * Lista se reinterogheaza la fiecare schimbare de ora sau durata: o masa
   * libera la 19:00 poate fi ocupata la 21:00, iar un dropdown care nu se
   * actualizeaza ar propune exact mutarea care esueaza.
   */
  const mese = useQuery({
    queryKey: [
      'mese-libere',
      rezervare.id,
      dataOraNoua?.toISOString() ?? '',
      durata,
    ] as const,
    queryFn: () => getMeseLibere(rezervare.id, dataOraNoua ?? undefined, Number(durata) || undefined),
    enabled: Boolean(dataOraNoua),
  })

  // Daca masa aleasa devine ocupata dupa o schimbare de ora, nu o lasam
  // selectata tacit: altfel salvarea ar esua cu un conflict pe care omul nu
  // avea de unde sa-l vada venind.
  const meseLibere = mese.data ?? []
  const masaAleasaOcupata =
    tableId !== FARA_MASA && meseLibere.some((m) => m.table_id === tableId && !m.libera)

  useEffect(() => {
    if (masaAleasaOcupata) setTableId(FARA_MASA)
  }, [masaAleasaOcupata])

  const inLucru = muta.isPending

  function salveaza() {
    if (!dataOraNoua) {
      notificari.eroare(new Error('Data sau ora nu sunt valide.'))
      return
    }

    const modificari: MutareRezervare = {
      id: rezervare.id,
      dataOra: dataOraNoua,
      durataMinute: Number(durata) || rezervare.durata_minute,
      nrPersoane: Number(nrPersoane) || rezervare.nr_persoane,
      tableId: tableId === FARA_MASA ? null : tableId,
      noteInterne: noteInterne.trim() || null,
    }

    muta.mutate(modificari, {
      onSuccess: () => {
        notificari.succes('Rezervarea a fost actualizată.')
        onInchide()
      },
      // Conflictul de masa (23P01) ajunge aici tradus de lib/erori.ts. Nu
      // exista buton de fortare: §15.3 interzice explicit suprapunerea.
      onError: (eroare) => notificari.eroare(eroare),
    })
  }

  return (
    <Dialog open onOpenChange={(deschis) => !deschis && onInchide()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifică rezervarea lui {rezervare.client_nume}</DialogTitle>
          <DialogDescription>
            Telefonul nu se schimbă de aici: el leagă rezervarea de fișa clientului. Dacă numărul
            e greșit, contopește fișele din Clienți.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-zi">Ziua</Label>
              <Input
                id="edit-zi"
                type="date"
                value={ziua}
                onChange={(e) => setZiua(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-ora">Ora</Label>
              <Input
                id="edit-ora"
                type="time"
                value={oraAleasa}
                onChange={(e) => setOraAleasa(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-persoane">Persoane</Label>
              <Input
                id="edit-persoane"
                type="number"
                min={1}
                max={50}
                value={nrPersoane}
                onChange={(e) => setNrPersoane(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-durata">Durată (min)</Label>
              <Input
                id="edit-durata"
                type="number"
                min={30}
                step={15}
                value={durata}
                onChange={(e) => setDurata(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-masa">Masă</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger id="edit-masa" className="h-9">
                <SelectValue placeholder="Alege masa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={FARA_MASA}>Fără masă alocată</SelectItem>
                {meseLibere.map((masa) => (
                  <SelectItem key={masa.table_id} value={masa.table_id} disabled={!masa.libera}>
                    Masa {masa.numar_masa} · {masa.capacitate} loc.
                    {!masa.libera ? ' — ocupată' : ''}
                    {masa.capacitate < Number(nrPersoane) ? ' — sub numărul de persoane' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mese.isFetching ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2Icon className="size-3 animate-spin" />
                Recalculez mesele libere pentru ora aleasă...
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Lista ține cont de ora și de durata de mai sus, plus buffer-ul dintre rezervări.
                Masa ei de acum rămâne disponibilă.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="edit-note">Note interne</Label>
            <Textarea
              id="edit-note"
              rows={2}
              value={noteInterne}
              onChange={(e) => setNoteInterne(e.target.value)}
              placeholder="Vizibile doar personalului."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onInchide} disabled={inLucru}>
            Renunță
          </Button>
          <Button onClick={salveaza} disabled={inLucru}>
            {inLucru && <Loader2Icon className="animate-spin" />}
            Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
