import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CopyIcon, ExternalLinkIcon, ImageIcon, Loader2Icon, Trash2Icon } from 'lucide-react'

import { CampuriFormular } from '@/components/setari/CampuriFormular'
import { FormularPublic } from '@/components/widget/FormularPublic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useNotificari } from '@/hooks/useNotificari'
import { RUTE } from '@/lib/rute'
import { stergeLogo, urcaLogo } from '@/services/branding'
import { actualizeazaRestaurant } from '@/services/setari-restaurant'
import { CHEIE_CAMPURI, getCampuriFormular } from '@/services/widget'
import type { Tables } from '@/types/database'

/**
 * Form Builder (§8.3, §27) — pagina 4 din sidebar.
 *
 * Split-screen, cum cere §27.5: editorul in stanga, previzualizarea LIVE in
 * dreapta. Previzualizarea nu e o imitatie: e exact componenta care ruleaza pe
 * /r/[slug], in modul in care nu trimite nimic. Un preview scris separat arata
 * bine in ziua in care il faci si minte doua saptamani mai tarziu.
 */
export function FormularPage() {
  const { profil, reincarcaProfil } = useAuth()
  const notificari = useNotificari()
  const queryClient = useQueryClient()
  const refFisier = useRef<HTMLInputElement | null>(null)

  const restaurant = profil?.tip === 'admin' ? profil.restaurant : null
  const [culoare, setCuloare] = useState(restaurant?.culoare_accent ?? '#059669')

  const campuri = useQuery({
    queryKey: CHEIE_CAMPURI(restaurant?.id ?? ''),
    queryFn: () => getCampuriFormular(restaurant!.id),
    enabled: Boolean(restaurant),
  })

  /**
   * Logoul se salveaza in `restaurants`, iar profilul din context il tine in
   * memorie: fara reincarcarea lui, sigla noua ar aparea abia la urmatoarea
   * autentificare.
   */
  const reincarca = () => {
    void queryClient.invalidateQueries({ queryKey: CHEIE_CAMPURI(restaurant?.id ?? '') })
    void reincarcaProfil()
  }

  const salveazaCuloare = useMutation({
    mutationFn: (valoare: string) =>
      actualizeazaRestaurant(restaurant!.id, { culoare_accent: valoare }),
    onSuccess: () => notificari.succes('Culoarea de accent a fost salvată.'),
    onError: (eroare) => notificari.eroare(eroare),
  })

  const incarcaLogo = useMutation({
    mutationFn: (fisier: File) => urcaLogo(restaurant!.id, fisier),
    onSuccess: () => {
      notificari.succes('Logoul a fost încărcat.', {
        descriere: 'Apare pe pagina publică de rezervări.',
      })
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  const eliminaLogo = useMutation({
    mutationFn: () => stergeLogo(restaurant!.id),
    onSuccess: () => {
      notificari.succes('Logoul a fost șters.')
      reincarca()
    },
    onError: (eroare) => notificari.eroare(eroare),
  })

  if (!restaurant) return null

  const linkPublic = `${window.location.origin}${RUTE.widget(restaurant.slug)}`
  const codIframe = `<iframe src="${linkPublic}" width="100%" height="900" style="border:0;border-radius:12px" title="Rezervări ${restaurant.nume}"></iframe>`

  /**
   * Previzualizarea are nevoie de forma publica a restaurantului. O construim
   * din profil, nu dintr-o cerere: managerul se uita la propriul restaurant,
   * iar un apel in plus ar arata acelasi lucru cu o intarziere.
   */
  const restaurantPublic = {
    id: restaurant.id,
    slug: restaurant.slug,
    nume: restaurant.nume,
    oras: restaurant.oras,
    tip_locatie: restaurant.tip_locatie,
    logo_url: restaurant.logo_url,
    culoare_accent: culoare,
    program_standard: restaurant.program_standard,
    fus_orar: restaurant.fus_orar,
    durata_implicita_minute: restaurant.durata_implicita_minute,
    max_scaune_masa: restaurant.max_scaune_masa,
    aprobare_automata: restaurant.aprobare_automata,
  } satisfies Tables<'restaurante_publice'>

  return (
    <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-2">
      <div className="grid content-start gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Formularul de rezervare</h1>
          <p className="text-sm text-muted-foreground">
            Ce întreabă pagina ta publică, și cum arată. Modificările se văd imediat în dreapta.
          </p>
        </div>

        {/* §27.6 — branding: logo si culoare de accent. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cum arată</CardTitle>
            <CardDescription>
              Logoul și culoarea ta înlocuiesc marca TableX pe pagina publică.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {restaurant.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={`Logo ${restaurant.nume}`}
                    className="size-12 rounded-md border border-border object-contain"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded-md border border-dashed border-border text-muted-foreground">
                    <ImageIcon className="size-4" />
                  </span>
                )}
                <input
                  ref={refFisier}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const fisier = e.target.files?.[0]
                    if (fisier) incarcaLogo.mutate(fisier)
                    e.target.value = ''
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={incarcaLogo.isPending}
                  onClick={() => refFisier.current?.click()}
                >
                  {incarcaLogo.isPending && <Loader2Icon className="animate-spin" />}
                  Încarcă
                </Button>
                {restaurant.logo_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={eliminaLogo.isPending}
                    onClick={() => eliminaLogo.mutate()}
                  >
                    <Trash2Icon className="size-3.5" />
                    Șterge
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP sau SVG, până la 2 MB. Limita e impusă pe server.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="culoare">Culoare de accent</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="culoare"
                  type="color"
                  value={culoare}
                  onChange={(e) => setCuloare(e.target.value)}
                  onBlur={() => {
                    if (culoare !== restaurant.culoare_accent) salveazaCuloare.mutate(culoare)
                  }}
                  className="h-9 w-16 p-1"
                />
                <span className="font-mono text-sm text-muted-foreground">{culoare}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campurile proprii — acelasi editor ca in Setari (§27.1-27.3). */}
        <CampuriFormular restaurantId={restaurant.id} />

        {/* §27.7 — codul de integrare. */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pune formularul pe site-ul tău</CardTitle>
            <CardDescription>
              Copiază codul și lipește-l unde vrei să apară. Se actualizează singur.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="link-scurt">Link direct</Label>
              <div className="flex gap-2">
                <Input id="link-scurt" readOnly value={linkPublic} className="font-mono text-xs" />
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Copiază linkul"
                  onClick={() => {
                    void navigator.clipboard?.writeText(linkPublic)
                    notificari.succes('Link copiat.')
                  }}
                >
                  <CopyIcon />
                </Button>
                <Button size="icon-sm" variant="outline" asChild aria-label="Deschide">
                  <a href={linkPublic} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bun pentru bio de Instagram sau un mesaj pe WhatsApp.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="cod-iframe">Cod de integrare</Label>
              <Textarea id="cod-iframe" readOnly rows={3} value={codIframe} className="font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="justify-self-start"
                onClick={() => {
                  void navigator.clipboard?.writeText(codIframe)
                  notificari.succes('Cod copiat.')
                }}
              >
                <CopyIcon className="size-3.5" />
                Copiază codul
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Previzualizarea live (§27.5) ── */}
      <div className="grid content-start gap-2">
        <p className="text-sm font-medium">Așa îl vede clientul</p>
        <div
          className="rounded-lg border border-border bg-card p-4"
          style={{ '--primary': culoare } as React.CSSProperties}
        >
          <div className="mb-4 flex items-center gap-2">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt=""
                className="size-8 rounded object-contain"
              />
            )}
            <span className="font-semibold tracking-tight">{restaurant.nume}</span>
          </div>
          <FormularPublic
            restaurant={restaurantPublic}
            campuri={campuri.data ?? []}
            slug={restaurant.slug}
            previzualizare
          />
        </div>
        <p className="text-xs text-muted-foreground">
          E chiar formularul de pe pagina publică, doar că nu trimite nimic.
        </p>
      </div>
    </div>
  )
}
