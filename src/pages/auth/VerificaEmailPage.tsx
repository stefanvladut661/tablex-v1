import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Loader2Icon, MailCheckIcon } from 'lucide-react'

import { CadruAuth } from '@/components/layout/CadruAuth'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'

export function VerificaEmailPage() {
  const { retrimiteConfirmare } = useAuth()
  const notificari = useNotificari()
  const locatie = useLocation()
  const [seTrimite, setSeTrimite] = useState(false)

  const email = (locatie.state as { email?: string } | null)?.email

  async function retrimite() {
    if (!email) return
    setSeTrimite(true)
    try {
      await retrimiteConfirmare(email)
      notificari.succes('Email retrimis.')
    } catch (eroare) {
      notificari.eroare(eroare)
    } finally {
      setSeTrimite(false)
    }
  }

  return (
    <CadruAuth
      titlu="Confirmă-ți emailul"
      descriere={
        email
          ? `Am trimis un link de confirmare la ${email}.`
          : 'Am trimis un link de confirmare pe adresa ta de email.'
      }
      subsol={
        <Link to={RUTE.login} className="font-medium text-primary hover:underline">
          Înapoi la autentificare
        </Link>
      }
    >
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
          <MailCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            După confirmare te întoarcem automat în aplicație, unde continui configurarea
            restaurantului.
          </p>
        </div>

        {email && (
          <Button variant="outline" onClick={() => void retrimite()} disabled={seTrimite}>
            {seTrimite && <Loader2Icon className="animate-spin" />}
            Retrimite emailul
          </Button>
        )}
      </div>
    </CadruAuth>
  )
}
