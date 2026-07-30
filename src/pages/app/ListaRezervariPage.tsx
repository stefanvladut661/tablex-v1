import { useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react'

import { BadgeStatus } from '@/components/rezervari/BadgeStatus'
import { SheetRezervare } from '@/components/rezervari/SheetRezervare'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useAuth } from '@/hooks/useAuth'
import { useRezervari } from '@/hooks/useRezervari'
import { ETICHETE_STATUS_REZERVARE, ETICHETE_SURSA_REZERVARE } from '@/lib/etichete'
import { addDays, etichetaZi, inceputZi, ora, sfarsitZi, toZonedTime } from '@/lib/timp'
import type { Rezervare, StatusRezervare } from '@/services/rezervari'

const TOATE = 'toate'

export function ListaRezervariPage() {
  const { profil } = useAuth()
  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const fus = restaurant?.fus_orar ?? 'Europe/Bucharest'

  const [zi, setZi] = useState(() => toZonedTime(new Date(), fus))
  const [status, setStatus] = useState<string>(TOATE)
  const [caut, setCaut] = useState('')
  const [selectata, setSelectata] = useState<Rezervare | null>(null)

  const [deLa, panaLa] = useMemo(() => [inceputZi(zi, fus), sfarsitZi(zi, fus)], [zi, fus])
  const rezervari = useRezervari(restaurant?.id, deLa, panaLa)

  const filtrate = useMemo(() => {
    const termen = caut.trim().toLowerCase()
    return (rezervari.data ?? []).filter((r) => {
      if (status !== TOATE && r.status !== status) return false
      if (!termen) return true
      return (
        r.client_nume.toLowerCase().includes(termen) ||
        r.telefon.includes(termen) ||
        (r.masa?.numar_masa ?? '').toLowerCase().includes(termen)
      )
    })
  }, [rezervari.data, status, caut])

  if (!restaurant) return null

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setZi((c) => addDays(c, -1))}
            aria-label="Ziua anterioara"
          >
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZi(toZonedTime(new Date(), fus))}>
            Azi
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setZi((c) => addDays(c, 1))}
            aria-label="Ziua urmatoare"
          >
            <ChevronRightIcon />
          </Button>
          <h1 className="ml-1 text-lg font-semibold tracking-tight capitalize">
            {etichetaZi(zi, fus)}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={caut}
              onChange={(e) => setCaut(e.target.value)}
              placeholder="Nume, telefon, masa"
              className="h-8 w-48 pl-7"
              aria-label="Caut in rezervari"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TOATE}>Toate statusurile</SelectItem>
              {(Object.keys(ETICHETE_STATUS_REZERVARE) as StatusRezervare[]).map((cheie) => (
                <SelectItem key={cheie} value={cheie}>
                  {ETICHETE_STATUS_REZERVARE[cheie]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rezervari.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Ora</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="w-32">Telefon</TableHead>
                <TableHead className="w-16">Pers.</TableHead>
                <TableHead className="w-28">Masa</TableHead>
                <TableHead className="w-24">Sursa</TableHead>
                <TableHead className="w-32">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrate.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Nicio rezervare pentru filtrele alese.
                  </TableCell>
                </TableRow>
              ) : (
                filtrate.map((rezervare) => (
                  <TableRow
                    key={rezervare.id}
                    onClick={() => setSelectata(rezervare)}
                    className="cursor-pointer"
                  >
                    <TableCell className="tabular-nums">{ora(rezervare.data_ora, fus)}</TableCell>
                    <TableCell className="font-medium">{rezervare.client_nume}</TableCell>
                    <TableCell className="tabular-nums">{rezervare.telefon}</TableCell>
                    <TableCell className="tabular-nums">{rezervare.nr_persoane}</TableCell>
                    <TableCell>
                      {rezervare.masa?.numar_masa ?? (
                        <span className="text-muted-foreground italic">nealocata</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ETICHETE_SURSA_REZERVARE[rezervare.sursa]}
                    </TableCell>
                    <TableCell>
                      <BadgeStatus status={rezervare.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <SheetRezervare
        rezervare={selectata}
        onInchide={() => setSelectata(null)}
        restaurantId={restaurant.id}
        fus={fus}
      />
    </div>
  )
}
