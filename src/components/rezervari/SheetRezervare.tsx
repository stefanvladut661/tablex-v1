import {
  BanIcon,
  CheckIcon,
  ClockIcon,
  Loader2Icon,
  LogInIcon,
  PhoneIcon,
  UserXIcon,
  UsersIcon,
} from 'lucide-react'

import { BadgeStatus } from '@/components/rezervari/BadgeStatus'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useNotificari } from '@/hooks/useNotificari'
import { useMutatiiRezervari } from '@/hooks/useRezervari'
import { ETICHETE_SURSA_REZERVARE } from '@/lib/etichete'
import { formatFus, ora } from '@/lib/timp'
import { trimiteEmail, type TipEmail } from '@/services/email'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

type Props = {
  rezervare: Rezervare | null
  onInchide: () => void
  restaurantId: string
  fus: string
}

export function SheetRezervare({ rezervare, onInchide, restaurantId, fus }: Props) {
  const { schimbaStatus } = useMutatiiRezervari(restaurantId)
  const notificari = useNotificari()

  /**
   * emailTip declanseaza si un email catre client, DUPA ce schimbarea de status
   * a reusit. Trimiterea nu poate anula schimbarea: rezervarea e deja
   * confirmata sau respinsa in baza.
   */
  function schimba(status: StatusRezervare, mesaj: string, emailTip?: TipEmail) {
    if (!rezervare) return
    const id = rezervare.id
    const areEmail = Boolean(rezervare.email)

    schimbaStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          notificari.succes(mesaj)
          onInchide()
          if (emailTip && areEmail) void trimiteEmail(emailTip, id)
        },
        onError: (eroare) => notificari.eroare(eroare),
      },
    )
  }

  const inLucru = schimbaStatus.isPending

  return (
    <Sheet open={Boolean(rezervare)} onOpenChange={(deschis) => !deschis && onInchide()}>
      <SheetContent className="w-full sm:max-w-md">
        {rezervare && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {rezervare.client_nume}
                <BadgeStatus status={rezervare.status} />
              </SheetTitle>
              <SheetDescription>
                {formatFus(rezervare.data_ora, 'EEEE, d MMMM yyyy', fus)}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 px-4">
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <ClockIcon className="size-4" />
                    Interval
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {ora(rezervare.data_ora, fus)} – {ora(rezervare.se_termina_la, fus)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      (+{rezervare.buffer_minute} min buffer)
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <UsersIcon className="size-4" />
                    Persoane
                  </dt>
                  <dd className="font-medium">{rezervare.nr_persoane}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <PhoneIcon className="size-4" />
                    Telefon
                  </dt>
                  <dd className="font-medium">
                    {rezervare.telefon ? (
                      <a href={`tel:${rezervare.telefon}`} className="hover:underline">
                        {rezervare.telefon}
                      </a>
                    ) : (
                      // Walk-in anonim (§25.6): nu inventam un numar de telefon.
                      <span className="text-muted-foreground">Fara telefon</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Masa</dt>
                  <dd className="font-medium">
                    {rezervare.masa
                      ? `${rezervare.masa.numar_masa} (${rezervare.masa.capacitate} loc.)`
                      : 'Nealocata'}
                    {rezervare.zona ? ` · ${rezervare.zona.nume}` : ''}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Sursa</dt>
                  <dd className="font-medium">{ETICHETE_SURSA_REZERVARE[rezervare.sursa]}</dd>
                </div>
                {rezervare.sosit_la && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Sosit la</dt>
                    <dd className="font-medium tabular-nums">{ora(rezervare.sosit_la, fus)}</dd>
                  </div>
                )}
              </dl>

              {rezervare.note_client && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">Nota clientului</p>
                  <p className="mt-1 text-sm">{rezervare.note_client}</p>
                </div>
              )}
              {rezervare.note_interne && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Note interne (invizibile clientului)
                  </p>
                  <p className="mt-1 text-sm">{rezervare.note_interne}</p>
                </div>
              )}

              <div className="grid gap-2 border-t border-border pt-4">
                {inLucru && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2Icon className="size-4 animate-spin" />
                    Se salveaza...
                  </p>
                )}

                {rezervare.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={inLucru}
                      onClick={() => schimba('confirmata', 'Rezervare confirmata.', 'rezervare_confirmata')}
                    >
                      <CheckIcon />
                      Confirma
                    </Button>
                    <Button
                      variant="outline"
                      disabled={inLucru}
                      onClick={() => schimba('respinsa', 'Rezervare respinsa.', 'rezervare_respinsa')}
                    >
                      <BanIcon />
                      Respinge
                    </Button>
                  </div>
                )}

                {(rezervare.status === 'confirmata' || rezervare.status === 'pending') && (
                  <Button
                    variant="secondary"
                    disabled={inLucru}
                    onClick={() => schimba('sosita', 'Client marcat ca sosit.')}
                  >
                    <LogInIcon />
                    Marcheaza sosit
                  </Button>
                )}

                {rezervare.status !== 'anulata' && rezervare.status !== 'no_show' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      disabled={inLucru}
                      onClick={() => schimba('no_show', 'Marcat ca neprezentat.')}
                    >
                      <UserXIcon />
                      Neprezentat
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={inLucru}
                      onClick={() => schimba('anulata', 'Rezervare anulata.')}
                    >
                      <BanIcon />
                      Anuleaza
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
