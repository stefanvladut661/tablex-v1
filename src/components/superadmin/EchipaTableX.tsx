import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CopyIcon, UserPlusIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useNotificari } from '@/hooks/useNotificari'
import { ETICHETE_ROL_ECHIPA, ETICHETE_STATUS_INVITATIE } from '@/lib/etichete'
import { RUTE } from '@/lib/rute'
import { trimiteEmail } from '@/services/email'
import {
  CHEI_ECHIPA_TX,
  actualizeazaMembruEchipa,
  anuleazaInvitatiaEchipa,
  getInvitatiiEchipa,
  getMembriEchipa,
  invitaInEchipa,
} from '@/services/super-admin'
import type { Enums } from '@/types/database'

const ROLURI: Array<Enums<'super_admin_rol'>> = ['super_admin', 'designer_architect', 'support']

/**
 * Echipa TableX (§9.2.7). Membrii NU se adauga direct: se invita pe email, iar
 * randul din `super_admin_users` il creeaza RPC-ul de acceptare, cu user_id-ul
 * contului care a acceptat. Altfel ar trebui sa stim dinainte un id din
 * auth.users — adica sa-l copiem de mana, ceea ce inlocuim aici.
 *
 * Doar rolul `super_admin` scrie; ceilalti membri vad echipa, dar nu o schimba.
 * Regula e a bazei (is_super_admin_deplin), nu a acestui ecran.
 */
export function EchipaTableX({ esteDeplin, userId }: { esteDeplin: boolean; userId: string }) {
  const notificari = useNotificari()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<Enums<'super_admin_rol'>>('support')

  const membri = useQuery({ queryKey: CHEI_ECHIPA_TX.membri, queryFn: getMembriEchipa })
  const invitatii = useQuery({ queryKey: CHEI_ECHIPA_TX.invitatii, queryFn: getInvitatiiEchipa })

  const reincarca = () => {
    void queryClient.invalidateQueries({ queryKey: CHEI_ECHIPA_TX.membri })
    void queryClient.invalidateQueries({ queryKey: CHEI_ECHIPA_TX.invitatii })
  }

  const invita = useMutation({
    mutationFn: () => invitaInEchipa(email, rol, userId),
    onSuccess: async (invitatie) => {
      setEmail('')
      reincarca()

      // Emailul e best-effort (§47.1): daca furnizorul nu e configurat sau
      // trimiterea esueaza, linkul ajunge in clipboard si il trimiti tu.
      // Invitatia exista in ambele cazuri.
      const rezultat = await trimiteEmail('invitatie_echipa', invitatie.id)
      if (rezultat.trimis) {
        notificari.succes('Invitatie trimisa pe email.', { descriere: invitatie.email })
      } else {
        copiazaLink(invitatie.token)
        notificari.succes('Invitatie creata.', {
          descriere: rezultat.simulat
            ? 'Emailul automat nu e configurat, deci linkul e in clipboard.'
            : 'Linkul e in clipboard. Trimite-l pe email persoanei invitate.',
        })
      }
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const anuleaza = useMutation({
    mutationFn: anuleazaInvitatiaEchipa,
    onSuccess: () => {
      notificari.succes('Invitatie anulata.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const schimbaMembru = useMutation({
    mutationFn: ({
      id,
      modificari,
    }: {
      id: string
      modificari: Parameters<typeof actualizeazaMembruEchipa>[1]
    }) => actualizeazaMembruEchipa(id, modificari),
    onSuccess: () => {
      notificari.succes('Membru actualizat.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  function copiazaLink(token: string) {
    const link = `${window.location.origin}${RUTE.invitatie}?token=${token}`
    void navigator.clipboard?.writeText(link)
  }

  return (
    <div className="grid gap-4">
      {esteDeplin ? (
        <form
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!email.trim()) return
            invita.mutate()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="email-echipa">Email</Label>
            <Input
              id="email-echipa"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coleg@tablex.ro"
              className="h-9 w-64"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rol-echipa">Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as Enums<'super_admin_rol'>)}>
              <SelectTrigger id="rol-echipa" className="h-9 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLURI.map((valoare) => (
                  <SelectItem key={valoare} value={valoare}>
                    {ETICHETE_ROL_ECHIPA[valoare]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={invita.isPending}>
            <UserPlusIcon className="size-4" />
            Invita
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Contul se creeaza abia cand persoana accepta invitatia, cu adresa careia i-a fost
            trimisa. Linkul ajunge in clipboard: pana la conectarea furnizorului de email,
            trimite-l tu.
          </p>
        </form>
      ) : (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Vezi echipa, dar doar rolul „Super admin" poate invita sau schimba membri. Regula e
          impusa de baza de date, nu doar de ecranul asta.
        </p>
      )}

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Membri</h2>
        {membri.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membru</TableHead>
                  <TableHead className="w-56">Rol</TableHead>
                  <TableHead className="w-28">Acces</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(membri.data ?? []).map((membru) => (
                  <TableRow key={membru.id}>
                    <TableCell>
                      <div className="font-medium">{membru.nume ?? 'Fara nume'}</div>
                      <div className="text-xs text-muted-foreground">{membru.email ?? '—'}</div>
                    </TableCell>
                    <TableCell>
                      {esteDeplin ? (
                        <Select
                          value={membru.rol}
                          onValueChange={(v) =>
                            schimbaMembru.mutate({
                              id: membru.id,
                              modificari: { rol: v as Enums<'super_admin_rol'> },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLURI.map((valoare) => (
                              <SelectItem key={valoare} value={valoare}>
                                {ETICHETE_ROL_ECHIPA[valoare]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{ETICHETE_ROL_ECHIPA[membru.rol]}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {esteDeplin ? (
                        <Button
                          size="xs"
                          variant={membru.activ ? 'outline' : 'default'}
                          onClick={() =>
                            schimbaMembru.mutate({
                              id: membru.id,
                              modificari: { activ: !membru.activ },
                            })
                          }
                        >
                          {membru.activ ? 'Dezactiveaza' : 'Reactiveaza'}
                        </Button>
                      ) : (
                        <Badge variant={membru.activ ? 'secondary' : 'outline'}>
                          {membru.activ ? 'Activ' : 'Inactiv'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Invitatii</h2>
        {invitatii.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (invitatii.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Nicio invitatie trimisa.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-52">Rol</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-48 text-right">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invitatii.data ?? []).map((invitatie) => (
                  <TableRow key={invitatie.id}>
                    <TableCell className="font-medium">{invitatie.email}</TableCell>
                    <TableCell>{ETICHETE_ROL_ECHIPA[invitatie.rol]}</TableCell>
                    <TableCell>
                      <Badge variant={invitatie.status === 'trimisa' ? 'secondary' : 'outline'}>
                        {ETICHETE_STATUS_INVITATIE[invitatie.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invitatie.status === 'trimisa' && esteDeplin && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              copiazaLink(invitatie.token)
                              notificari.succes('Link copiat.')
                            }}
                          >
                            <CopyIcon className="size-3.5" />
                            Copiaza
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={anuleaza.isPending}
                            onClick={() => anuleaza.mutate(invitatie.id)}
                          >
                            Anuleaza
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
