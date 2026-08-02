import { useEffect, useRef, useState } from 'react'
import { CameraIcon, CheckCircle2Icon, Loader2Icon, XCircleIcon } from 'lucide-react'

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
import { useNotificari } from '@/hooks/useNotificari'
import { valideazaBilet, type RezultatScanare } from '@/services/evenimente'

/**
 * Validarea biletelor la intrare (§29.6).
 *
 * Camera se deschide DOAR la apasare si se inchide dupa fiecare scanare — spec
 * o cere explicit, si are dreptate: o camera pornita permanent pe tableta de la
 * usa consuma bateria si sperie oaspetii.
 *
 * Citirea codului foloseste `BarcodeDetector`, care exista nativ in Chrome pe
 * Android — adica exact tabletele din sala — fara nicio dependinta noua. Acolo
 * unde lipseste (Safari, Firefox), ramane campul de cod scris de mana, care e
 * oricum necesar: un ecran crapat sau un telefon cu camera proasta se intampla
 * mai des decat ne-ar placea. De aceea codul e scurt si citibil cu ochiul.
 */
type DetectorCoduri = {
  detect: (sursa: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

function detectorDisponibil(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

export function ScanerBilet({ onInchide }: { onInchide: () => void }) {
  const notificari = useNotificari()
  const refVideo = useRef<HTMLVideoElement | null>(null)
  const refFlux = useRef<MediaStream | null>(null)
  const refOprit = useRef(false)

  const [cod, setCod] = useState('')
  const [rezultat, setRezultat] = useState<RezultatScanare | null>(null)
  const [inLucru, setInLucru] = useState(false)
  const [cameraPornita, setCameraPornita] = useState(false)

  function opresteCamera() {
    refOprit.current = true
    refFlux.current?.getTracks().forEach((pista) => pista.stop())
    refFlux.current = null
    setCameraPornita(false)
  }

  // Camera nu are voie sa supravietuiasca dialogului, nici daca se inchide
  // dintr-un Escape sau dintr-o navigare.
  useEffect(() => () => opresteCamera(), [])

  async function verifica(codDeVerificat: string) {
    if (!codDeVerificat.trim()) return
    setInLucru(true)
    try {
      const raspuns = await valideazaBilet(codDeVerificat)
      setRezultat(raspuns)
      opresteCamera()
    } catch (eroare) {
      notificari.eroare(eroare)
    } finally {
      setInLucru(false)
    }
  }

  async function pornesteCamera() {
    if (!detectorDisponibil()) {
      notificari.eroare(
        new Error('Browserul ăsta nu poate citi coduri. Introdu codul de pe bilet manual.'),
      )
      return
    }

    try {
      const flux = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      refFlux.current = flux
      refOprit.current = false
      setCameraPornita(true)
      if (refVideo.current) {
        refVideo.current.srcObject = flux
        await refVideo.current.play()
      }

      const Detector = (window as unknown as { BarcodeDetector: new (o: unknown) => DetectorCoduri })
        .BarcodeDetector
      const detector = new Detector({ formats: ['qr_code'] })

      const cauta = async () => {
        if (refOprit.current || !refVideo.current) return
        try {
          const coduri = await detector.detect(refVideo.current)
          if (coduri.length > 0) {
            await verifica(coduri[0].rawValue)
            return
          }
        } catch {
          // Un cadru neclar nu e o eroare: incercam la urmatorul.
        }
        requestAnimationFrame(() => void cauta())
      }
      void cauta()
    } catch {
      notificari.eroare(new Error('Nu am putut deschide camera. Verifică permisiunea browserului.'))
      opresteCamera()
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(deschis) => {
        if (!deschis) {
          opresteCamera()
          onInchide()
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scanează biletul</DialogTitle>
          <DialogDescription>
            Camera se deschide doar cât scanezi. Sau introdu codul scris pe bilet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {cameraPornita ? (
            <video
              ref={refVideo}
              className="aspect-square w-full rounded-lg bg-muted object-cover"
              muted
              playsInline
            />
          ) : (
            <Button variant="outline" onClick={() => void pornesteCamera()}>
              <CameraIcon />
              Deschide camera
            </Button>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="cod-bilet">Codul biletului</Label>
            <div className="flex gap-2">
              <Input
                id="cod-bilet"
                value={cod}
                onChange={(e) => setCod(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                className="font-mono tracking-wider"
              />
              <Button disabled={inLucru || !cod.trim()} onClick={() => void verifica(cod)}>
                {inLucru && <Loader2Icon className="animate-spin" />}
                Verifică
              </Button>
            </div>
          </div>

          {rezultat && (
            <div
              className={`grid gap-1 rounded-lg border p-3 ${
                rezultat.rezultat === 'valid'
                  ? 'border-status-liber bg-status-liber-soft'
                  : 'border-destructive/50 bg-status-ocupat-soft'
              }`}
            >
              <p className="flex items-center gap-2 font-medium">
                {rezultat.rezultat === 'valid' ? (
                  <CheckCircle2Icon className="size-4 text-status-liber" />
                ) : (
                  <XCircleIcon className="size-4 text-destructive" />
                )}
                {rezultat.rezultat === 'valid' && 'Bilet valid — poate intra'}
                {rezultat.rezultat === 'deja_folosit' && 'Bilet deja folosit'}
                {rezultat.rezultat === 'neplatit' && 'Bilet neplatit'}
                {rezultat.rezultat === 'invalid' && 'Cod necunoscut'}
              </p>
              {'bilet' in rezultat && (
                <p className="text-sm">
                  {rezultat.bilet.client_nume} · {rezultat.bilet.nr_persoane} pers.
                  {rezultat.rezultat === 'deja_folosit' && rezultat.bilet.scanat_la
                    ? ` · scanat la ${new Date(rezultat.bilet.scanat_la).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {rezultat && (
            <Button
              variant="outline"
              onClick={() => {
                setRezultat(null)
                setCod('')
              }}
            >
              Următorul bilet
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              opresteCamera()
              onInchide()
            }}
          >
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
