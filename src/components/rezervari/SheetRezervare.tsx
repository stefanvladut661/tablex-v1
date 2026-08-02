import { useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { trimiteWhatsAppSimulat } from '@/services/whatsapp'

type Props = {
  rezervare: Rezervare | null
  onInchide: () => void
  restaurantId: string
  fus: string
}

export function SheetRezervare({ rezervare, onInchide, restaurantId, fus }: Props) {
  const { schimbaStatus } = useMutatiiRezervari(restaurantId)
  const notificari = useNotificari()

  /** §24.7 — respingerea si anularea sunt distructive: cer confirmare. */
  const [deConfirmat, setDeConfirmat] = useState<{
    status: StatusRezervare
    mesaj: string
    emailTip?: TipEmail
    whatsappSablon?: string
  } | null>(null)

  /**
   * emailTip declanseaza si un email catre client, DUPA ce schimbarea de status
   * a reusit. Trimiterea nu poate anula schimbarea: rezervarea e deja
   * confirmata sau respinsa in baza.
   *
   * §16.2: acceptarea si respingerea incearca AMBELE canale — email (daca
   * exista) si WhatsApp. Mesajul WhatsApp consuma 1 credit si pleaca doar
   * daca restaurantul are credite; fara ele, doar jurnalul consemneaza esecul.
   */
  function executa(
    status: StatusRezervare,
    mesaj: string,
    emailTip?: TipEmail,
    whatsappSablon?: string,
  ) {
    if (!rezervare) return
    const id = rezervare.id
    const areEmail = Boolean(rezervare.email)
    const telefon = rezervare.telefon

    schimbaStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          notificari.succes(mesaj)
          onInchide()
          if (emailTip && areEmail) void trimiteEmail(emailTip, id)
          if (whatsappSablon && telefon) {
            void trimiteWhatsAppSimulat(telefon, whatsappSablon, undefined, id)
          }
        },
        onError: (eroare) => notificari.eroare(eroare),
      },
    )
  }

  function schimba(
    status: StatusRezervare,
    mesaj: string,
    emailTip?: TipEmail,
    whatsappSablon?: string,
  ) {
    if (status === 'respinsa' || status === 'anulata') {
      setDeConfirmat({ status, mesaj, emailTip, whatsappSablon })
      return
    }
    executa(status, mesaj, emailTip, whatsappSablon)
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

              {/* Raspunsurile la intrebarile proprii ale restaurantului
                  (migratia 23). Cheile sunt cele din formular_campuri, pastrate
                  ca atare — le afisam asa cum sunt, fiindca o eticheta
                  redenumita intre timp nu trebuie sa rescrie raspunsuri vechi. */}
              {rezervare.campuri_custom &&
                typeof rezervare.campuri_custom === 'object' &&
                !Array.isArray(rezervare.campuri_custom) &&
                Object.keys(rezervare.campuri_custom).length > 0 && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Raspunsuri din formular
                    </p>
                    <dl className="mt-1 grid gap-1 text-sm">
                      {Object.entries(rezervare.campuri_custom as Record<string, unknown>).map(
                        ([cheie, valoare]) => (
                          <div key={cheie} className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">{cheie.replace(/_/g, ' ')}</dt>
                            <dd className="font-medium">{String(valoare ?? '—')}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </div>
                )}

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
                      onClick={() =>
                        schimba(
                          'confirmata',
                          'Rezervare confirmata.',
                          'rezervare_confirmata',
                          'Confirmare Rezervare',
                        )
                      }
                    >
                      <CheckIcon />
                      Confirma
                    </Button>
                    <Button
                      variant="outline"
                      disabled={inLucru}
                      onClick={() =>
                        schimba(
                          'respinsa',
                          'Rezervare respinsa.',
                          'rezervare_respinsa',
                          'Rezervare Respinsa',
                        )
                      }
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

                {/* §7.5 — sala e plina si masa nu s-a eliberat la timp: un
                    mesaj scurt de intarziere catre client, pe credite (§14:
                    simulat — consuma 1 credit si intra in jurnal). */}
                {rezervare.status === 'confirmata' && rezervare.telefon && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void trimiteWhatsAppSimulat(
                        rezervare.telefon!,
                        'Intarziere scurta',
                        `${rezervare.client_nume}, masa ta se elibereaza cu o mica intarziere. Ne cerem scuze — te asteptam!`,
                        rezervare.id,
                      ).then((trimis) =>
                        trimis
                          ? notificari.succes('Mesajul de intarziere a fost consemnat.')
                          : notificari.atentie('Fara credite WhatsApp: mesajul nu a plecat.'),
                      )
                    }}
                  >
                    <ClockIcon />
                    Anunta intarziere scurta
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

            {deConfirmat && (
              <Dialog open onOpenChange={(deschis) => !deschis && setDeConfirmat(null)}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>
                      {deConfirmat.status === 'respinsa' ? 'Respingi' : 'Anulezi'} rezervarea?
                    </DialogTitle>
                    <DialogDescription>
                      {rezervare.client_nume} · {rezervare.nr_persoane} persoane ·{' '}
                      {ora(rezervare.data_ora, fus)}
                      {deConfirmat.status === 'respinsa' &&
                        ' — clientul primeste anuntul pe email si WhatsApp, daca exista.'}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeConfirmat(null)}>
                      Renunta
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={schimbaStatus.isPending}
                      onClick={() => {
                        executa(
                          deConfirmat.status,
                          deConfirmat.mesaj,
                          deConfirmat.emailTip,
                          deConfirmat.whatsappSablon,
                        )
                        setDeConfirmat(null)
                      }}
                    >
                      {deConfirmat.status === 'respinsa' ? 'Respinge' : 'Anuleaza rezervarea'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
