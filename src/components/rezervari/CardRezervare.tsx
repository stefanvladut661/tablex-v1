import { useState } from 'react'
import {
  BanIcon,
  CheckIcon,
  LogInIcon,
  PencilIcon,
  StickyNoteIcon,
  UserXIcon,
} from 'lucide-react'

import { BadgeStatus } from '@/components/rezervari/BadgeStatus'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ETICHETE_SURSA_REZERVARE } from '@/lib/etichete'
import { ora } from '@/lib/timp'
import type { CampCard } from '@/services/preferinte'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

/**
 * O rezervare = un card, cu TOATE actiunile direct pe el (§26.1, §26.3).
 *
 * Spec-ul cere explicit sa nu fie nevoie de un click in plus ca sa ajungi la
 * actiuni. Motivul se vede in sala: la ora de varf, receptia confirma zece
 * rezervari una dupa alta — un panou care se deschide si se inchide de zece ori
 * costa mai mult decat toate cele zece confirmari la un loc.
 */
export function CardRezervare({
  rezervare,
  fus,
  ascunse,
  readOnly,
  inLucru,
  onSchimbaStatus,
  onEditeaza,
  onSalveazaNote,
}: {
  rezervare: Rezervare
  fus: string
  ascunse: Set<CampCard>
  /** Zilele care nu sunt azi se citesc, nu se opereaza (§8.2). */
  readOnly: boolean
  inLucru: boolean
  onSchimbaStatus: (status: StatusRezervare, mesaj: string) => void
  onEditeaza: () => void
  onSalveazaNote: (note: string | null) => void
}) {
  const [noteDeschise, setNoteDeschise] = useState(false)
  const [note, setNote] = useState(rezervare.note_interne ?? '')

  const arata = (camp: CampCard) => !ascunse.has(camp)
  const activ = rezervare.status !== 'anulata' && rezervare.status !== 'no_show'

  return (
    <li className="grid gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold tabular-nums">
              {ora(rezervare.data_ora, fus)}
            </span>
            <span className="truncate font-medium">{rezervare.client_nume}</span>
            <BadgeStatus status={rezervare.status} />
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {arata('persoane') && <span className="tabular-nums">{rezervare.nr_persoane} pers.</span>}
            {arata('telefon') && (
              <span className="tabular-nums">
                {rezervare.telefon ? (
                  <a href={`tel:${rezervare.telefon}`} className="hover:underline">
                    {rezervare.telefon}
                  </a>
                ) : (
                  // Walk-in anonim (§25.6): nu inventam un numar.
                  'fara telefon'
                )}
              </span>
            )}
            {arata('masa') && (
              <span>
                {rezervare.masa ? `masa ${rezervare.masa.numar_masa}` : 'masa nealocata'}
              </span>
            )}
            {arata('zona') && rezervare.zona && <span>{rezervare.zona.nume}</span>}
            {arata('sursa') && <span>{ETICHETE_SURSA_REZERVARE[rezervare.sursa]}</span>}
            {rezervare.sosit_la && (
              <span className="tabular-nums">sosit {ora(rezervare.sosit_la, fus)}</span>
            )}
          </div>

          {arata('note') && rezervare.note_client && (
            <p className="mt-1.5 rounded-md bg-muted px-2 py-1 text-xs">
              <span className="text-muted-foreground">Nota clientului: </span>
              {rezervare.note_client}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1.5">
            {rezervare.status === 'pending' && (
              <>
                <Button
                  size="xs"
                  disabled={inLucru}
                  onClick={() => onSchimbaStatus('confirmata', 'Rezervare confirmata.')}
                >
                  <CheckIcon className="size-3.5" />
                  Accepta
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={inLucru}
                  onClick={() => onSchimbaStatus('respinsa', 'Rezervare respinsa.')}
                >
                  Respinge
                </Button>
              </>
            )}

            {(rezervare.status === 'confirmata' || rezervare.status === 'pending') && (
              <Button
                size="xs"
                variant="secondary"
                disabled={inLucru}
                onClick={() => onSchimbaStatus('sosita', 'Client marcat ca sosit.')}
              >
                <LogInIcon className="size-3.5" />
                Sosit
              </Button>
            )}

            {activ && (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={inLucru}
                  onClick={() => onSchimbaStatus('no_show', 'Marcat ca neprezentat.')}
                >
                  <UserXIcon className="size-3.5" />
                  Neprezentat
                </Button>
                <Button size="xs" variant="outline" disabled={inLucru} onClick={onEditeaza}>
                  <PencilIcon className="size-3.5" />
                  Modifica
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={inLucru}
                  onClick={() => onSchimbaStatus('anulata', 'Rezervare anulata.')}
                >
                  <BanIcon className="size-3.5" />
                  Anuleaza
                </Button>
              </>
            )}

            <Button
              size="xs"
              variant="ghost"
              aria-expanded={noteDeschise}
              onClick={() => setNoteDeschise((d) => !d)}
            >
              <StickyNoteIcon className="size-3.5" />
              Note
            </Button>
          </div>
        )}
      </div>

      {/* Notele interne (§26.4): camp expandabil pe card, nu ecran separat.
          Nu apar niciodata catre client. */}
      {noteDeschise && !readOnly && (
        <div className="grid gap-1.5 border-t border-border pt-2">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note interne — vizibile doar personalului."
            aria-label={`Note interne pentru ${rezervare.client_nume}`}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setNote(rezervare.note_interne ?? '')
                setNoteDeschise(false)
              }}
            >
              Renunta
            </Button>
            <Button
              size="xs"
              disabled={inLucru || note === (rezervare.note_interne ?? '')}
              onClick={() => {
                onSalveazaNote(note.trim() || null)
                setNoteDeschise(false)
              }}
            >
              Salveaza nota
            </Button>
          </div>
        </div>
      )}

      {readOnly && rezervare.note_interne && (
        <p className="border-t border-border pt-2 text-xs text-muted-foreground">
          Nota interna: {rezervare.note_interne}
        </p>
      )}
    </li>
  )
}
