import { useState } from 'react'
import { KeyRoundIcon, Loader2Icon, LogOutIcon } from 'lucide-react'

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
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { verificaParola } from '@/lib/parola'

/**
 * Actiunile de cont din bara laterala: schimbarea parolei (§49.9) si iesirea
 * din cont, cu confirmare (§49.3).
 *
 * Schimbarea parolei lipsea complet: singurul drum era „Am uitat parola" de pe
 * ecranul de login, iar ruta aceea e in spatele garzii de OASPETE — adica
 * inaccesibila tocmai celui autentificat care voia s-o schimbe. Un ospatar
 * caruia i-a vazut cineva parola nu avea ce face.
 */
export function MeniuCont() {
  const { deconectare, seteazaParolaNoua } = useAuth()
  const notificari = useNotificari()

  const [dialogParola, setDialogParola] = useState(false)
  const [dialogIesire, setDialogIesire] = useState(false)
  const [parola, setParola] = useState('')
  const [confirmare, setConfirmare] = useState('')
  const [eroare, setEroare] = useState<string | null>(null)
  const [inLucru, setInLucru] = useState(false)

  async function schimba() {
    const problema = verificaParola(parola)
    if (problema) {
      setEroare(problema)
      return
    }
    if (parola !== confirmare) {
      setEroare('Cele două parole nu coincid.')
      return
    }

    setInLucru(true)
    try {
      await seteazaParolaNoua(parola)
      notificari.succes('Parola a fost schimbată.', {
        descriere: 'Rămâi autentificat pe dispozitivul ăsta.',
      })
      setDialogParola(false)
      setParola('')
      setConfirmare('')
      setEroare(null)
    } catch (e) {
      notificari.eroare(e)
    } finally {
      setInLucru(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        onClick={() => setDialogParola(true)}
      >
        <KeyRoundIcon />
        Schimbă parola
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        onClick={() => setDialogIesire(true)}
      >
        <LogOutIcon />
        Ieși din cont
      </Button>

      {dialogParola && (
        <Dialog open onOpenChange={(deschis) => !deschis && setDialogParola(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Schimbă parola</DialogTitle>
              <DialogDescription>
                Minim 8 caractere, cu o literă mare și o cifră. Sesiunile deschise pe alte
                dispozitive rămân active.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="parola-noua">Parola nouă</Label>
                <Input
                  id="parola-noua"
                  type="password"
                  autoComplete="new-password"
                  value={parola}
                  onChange={(e) => {
                    setParola(e.target.value)
                    setEroare(null)
                  }}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="parola-confirmare">Încă o dată</Label>
                <Input
                  id="parola-confirmare"
                  type="password"
                  autoComplete="new-password"
                  value={confirmare}
                  onChange={(e) => {
                    setConfirmare(e.target.value)
                    setEroare(null)
                  }}
                />
              </div>
              {eroare && <p className="text-xs font-medium text-destructive">{eroare}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogParola(false)}>
                Renunță
              </Button>
              <Button disabled={inLucru} onClick={() => void schimba()}>
                {inLucru && <Loader2Icon className="animate-spin" />}
                Schimbă parola
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* §49.3 cere confirmare explicita la iesire. Motivul e cel de teren: pe
          o tableta tinuta in mana, butonul din coltul barei se apasa din
          greseala, iar reintrarea cere parola pe care ospatarul poate n-o stie
          pe de rost. */}
      {dialogIesire && (
        <Dialog open onOpenChange={(deschis) => !deschis && setDialogIesire(false)}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Ieși din cont?</DialogTitle>
              <DialogDescription>
                Va trebui să te autentifici din nou pe dispozitivul ăsta.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogIesire(false)}>
                Rămâi
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void deconectare().catch((e) => notificari.eroare(e))
                }}
              >
                Ieși
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
