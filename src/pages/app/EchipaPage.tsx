import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller } from 'react-hook-form'
import { CopyIcon, KeyRoundIcon, Loader2Icon, Trash2Icon, UserPlusIcon } from 'lucide-react'
import { z } from 'zod'

import { CampText } from '@/components/formular/CampText'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useInvitatii, useMembriEchipa, useMutatiiEchipa } from '@/hooks/useEchipa'
import { useNotificari } from '@/hooks/useNotificari'
import { ETICHETE_ROL_ADMIN, ETICHETE_STATUS_INVITATIE } from '@/lib/etichete'
import { reseteazaParolaOspatar } from '@/services/echipa'
import { trimiteEmail } from '@/services/email'
import { RUTE } from '@/lib/rute'
import { emailSchema } from '@/lib/validari'
import type { Enums } from '@/types/database'

const schemaInvitatie = z.object({
  email: emailSchema,
  rol: z.enum(['manager', 'ospatar']),
})

type FormInvitatie = z.infer<typeof schemaInvitatie>

function dataScurta(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function EchipaPage() {
  const { profil, utilizator } = useAuth()
  const notificari = useNotificari()

  const restaurantId = profil?.tip === 'admin' ? profil.restaurant.id : undefined
  const membri = useMembriEchipa(restaurantId)
  const invitatii = useInvitatii(restaurantId)
  const { invita, anuleaza, comutaActiv, schimbaRol, sterge } = useMutatiiEchipa(restaurantId)
  const [deSters, setDeSters] = useState<{ id: string; nume: string } | null>(null)
  /** §49.8 — parola generata se arata O data, apoi dispare cu dialogul. */
  const [parolaNoua, setParolaNoua] = useState<{ ospatar: string; parola: string } | null>(null)
  const [resetInLucru, setResetInLucru] = useState<string | null>(null)

  const form = useForm<FormInvitatie>({
    resolver: zodResolver(schemaInvitatie),
    defaultValues: { email: '', rol: 'ospatar' },
  })

  if (profil?.tip !== 'admin') return null

  const invitatiiActive = (invitatii.data ?? []).filter((i) => i.status === 'trimisa')

  async function trimiteInvitatie(valori: FormInvitatie) {
    const email = valori.email.trim().toLowerCase()

    // Verificari de bun-sens inainte de a lovi constrangerile din DB, ca
    // mesajul sa fie clar in loc de o eroare de unicitate.
    if ((membri.data ?? []).some((m) => (m.email ?? '').toLowerCase() === email)) {
      form.setError('email', { message: 'Persoana face deja parte din echipă.' })
      return
    }
    if (invitatiiActive.some((i) => i.email.toLowerCase() === email)) {
      form.setError('email', { message: 'Există deja o invitație activă pentru acest email.' })
      return
    }

    try {
      const invitatie = await invita.mutateAsync({
        email,
        rol: valori.rol,
        invitatDe: utilizator!.id,
      })
      form.reset({ email: '', rol: valori.rol })

      // Emailul e best-effort: daca nu e configurat niciun furnizor (sau
      // trimiterea eșueaza), managerul primeste linkul in clipboard si il
      // trimite el. Invitatia exista in ambele cazuri.
      const rezultatEmail = await trimiteEmail('invitatie', invitatie.id)
      if (rezultatEmail.trimis) {
        notificari.succes('Invitație trimisă pe email.', { descriere: invitatie.email })
      } else {
        await copiazaLink(
          invitatie.token,
          rezultatEmail.simulat
            ? 'Invitație creată. Emailul automat nu e configurat, deci linkul e în clipboard.'
            : 'Invitație creată. Linkul e în clipboard.',
        )
      }
    } catch (eroare) {
      notificari.eroare(eroare)
    }
  }

  async function copiazaLink(token: string, mesaj = 'Link copiat.') {
    const link = `${window.location.origin}${RUTE.invitatie}?token=${encodeURIComponent(token)}`
    try {
      await navigator.clipboard.writeText(link)
      notificari.succes(mesaj, { descriere: 'Trimite-l persoanei invitate.' })
    } catch {
      // Clipboard-ul poate fi blocat (permisiuni, http). Aratam linkul.
      notificari.info('Copiază manual linkul', { descriere: link, durata: 15_000 })
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto grid max-w-4xl gap-4">
        <h1 className="text-lg font-semibold tracking-tight">Echipa</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invită o persoană</CardTitle>
            <CardDescription>
              Se creează un link unic, valabil 7 zile, legat de adresa de email. Persoana își
              setează singură parola.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(trimiteInvitatie)}
              noValidate
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <CampText
                  eticheta="Email"
                  type="email"
                  placeholder="ospatar@restaurant.ro"
                  eroare={form.formState.errors.email?.message}
                  {...form.register('email')}
                />
              </div>
              <div className="grid gap-1.5 sm:w-40">
                <Label htmlFor="rol-invitatie">Rol</Label>
                <Controller
                  control={form.control}
                  name="rol"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="rol-invitatie" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ospatar">Ospătar</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <Button type="submit" disabled={invita.isPending}>
                {invita.isPending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
                Invită
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membri</CardTitle>
            <CardDescription>
              Ospătarii nu au acces la setări, facturare sau gestiunea echipei.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membri.isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persoană</TableHead>
                    <TableHead className="w-40">Rol</TableHead>
                    <TableHead className="w-28">Activ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(membri.data ?? []).map((membru) => {
                    const esteEu = membru.user_id === utilizator?.id
                    return (
                      <TableRow key={membru.id}>
                        <TableCell>
                          <div className="font-medium">
                            {membru.nume ?? membru.email ?? 'Fără nume'}
                            {esteEu && (
                              <Badge variant="secondary" className="ml-2">
                                tu
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{membru.email}</div>
                        </TableCell>
                        <TableCell>
                          {/* Propriul rol nu se poate schimba de aici: un manager
                              care se retrogradeaza singur ar lasa restaurantul
                              fara nimeni care sa gestioneze echipa. */}
                          {esteEu ? (
                            <Badge variant="secondary">{ETICHETE_ROL_ADMIN[membru.rol]}</Badge>
                          ) : (
                            <Select
                              value={membru.rol}
                              onValueChange={(rol) =>
                                schimbaRol.mutate(
                                  { id: membru.id, rol: rol as Enums<'admin_rol'> },
                                  { onError: (eroare) => notificari.eroare(eroare) },
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ospatar">Ospătar</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={membru.activ}
                              disabled={esteEu}
                              aria-label={`Acces pentru ${membru.email}`}
                              onCheckedChange={(activ) =>
                                comutaActiv.mutate(
                                  { id: membru.id, activ },
                                  { onError: (eroare) => notificari.eroare(eroare) },
                                )
                              }
                            />
                            {/* §49.8 — parola noua se genereaza pe server si se
                                arata o singura data; managerul i-o dicteaza. */}
                            {!esteEu && membru.rol === 'ospatar' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Resetează parola pentru ${membru.email}`}
                                disabled={resetInLucru === membru.id}
                                onClick={async () => {
                                  setResetInLucru(membru.id)
                                  try {
                                    const rezultat = await reseteazaParolaOspatar(membru.id)
                                    setParolaNoua({
                                      ospatar:
                                        rezultat.ospatar ??
                                        membru.nume ??
                                        membru.email ??
                                        'ospătar',
                                      parola: rezultat.parola,
                                    })
                                  } catch (eroare) {
                                    notificari.eroare(eroare)
                                  } finally {
                                    setResetInLucru(null)
                                  }
                                }}
                              >
                                {resetInLucru === membru.id ? (
                                  <Loader2Icon className="animate-spin" />
                                ) : (
                                  <KeyRoundIcon />
                                )}
                              </Button>
                            )}

                            {/* §30.3 — stergerea DEFINITIVA, doar pentru Ospatar:
                                managerii se dezactiveaza, nu se sterg, iar
                                propriul cont e aparat si de baza. */}
                            {!esteEu && membru.rol === 'ospatar' && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Șterge contul ${membru.email}`}
                                onClick={() =>
                                  setDeSters({
                                    id: membru.id,
                                    nume: membru.nume ?? membru.email ?? 'acest cont',
                                  })
                                }
                              >
                                <Trash2Icon />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitații</CardTitle>
            <CardDescription>
              Emailurile automate vin într-o etapă următoare; până atunci trimite linkul tu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitatii.isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (invitatii.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nicio invitație trimisă.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-28">Rol</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-28">Expiră</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invitatii.data ?? []).map((invitatie) => (
                    <TableRow key={invitatie.id}>
                      <TableCell className="font-medium">{invitatie.email}</TableCell>
                      <TableCell>{ETICHETE_ROL_ADMIN[invitatie.rol]}</TableCell>
                      <TableCell>
                        <Badge variant={invitatie.status === 'trimisa' ? 'default' : 'secondary'}>
                          {ETICHETE_STATUS_INVITATIE[invitatie.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {dataScurta(invitatie.expira_la)}
                      </TableCell>
                      <TableCell>
                        {invitatie.status === 'trimisa' && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Copiază linkul"
                              onClick={() => void copiazaLink(invitatie.token)}
                            >
                              <CopyIcon />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                anuleaza.mutate(invitatie.id, { onError: (eroare) => notificari.eroare(eroare) })
                              }
                            >
                              Anulează
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* §49.8 — parola noua, o singura data. Inchiderea o pierde definitiv:
          nu o pastram nicaieri, nici in stare dupa dialog, nici in loguri. */}
      {parolaNoua && (
        <Dialog open onOpenChange={(deschis) => !deschis && setParolaNoua(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Parolă nouă pentru {parolaNoua.ospatar}</DialogTitle>
              <DialogDescription>
                Dictează-i-o sau copiaz-o acum — nu se mai poate afișa din nou. Ospătarul și-o
                poate schimba apoi din contul lui.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <code className="font-mono text-lg tracking-wider">{parolaNoua.parola}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copiază parola"
                onClick={() => {
                  void navigator.clipboard?.writeText(parolaNoua.parola)
                  notificari.succes('Parolă copiată.')
                }}
              >
                <CopyIcon />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => setParolaNoua(null)}>Am notat-o</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmarea standard (§24.7) inainte de o actiune definitiva. */}
      {deSters && (
        <Dialog open onOpenChange={(deschis) => !deschis && setDeSters(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Ștergi contul {deSters.nume}?</DialogTitle>
              <DialogDescription>
                Definitiv: ospătarul nu se mai poate autentifica, iar contul dispare din echipă.
                Dacă vrei doar o pauză, folosește comutatorul de acces.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeSters(null)}>
                Renunță
              </Button>
              <Button
                variant="destructive"
                disabled={sterge.isPending}
                onClick={() =>
                  sterge.mutate(deSters.id, {
                    onSuccess: () => {
                      notificari.succes('Contul a fost șters.')
                      setDeSters(null)
                    },
                    onError: (eroare) => notificari.eroare(eroare),
                  })
                }
              >
                Șterge contul
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
