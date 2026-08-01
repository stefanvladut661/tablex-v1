import { supabase } from '@/lib/supabase'
import { actualizeazaRestaurant } from '@/services/setari-restaurant'

const BUCKET = 'branding'

/**
 * Logoul restaurantului (§27.6).
 *
 * Bucketul e PUBLIC, spre deosebire de `schite`: logoul trebuie citit de orice
 * vizitator anonim al paginii /r/[slug], inclusiv din iframe-ul de pe site-ul
 * restaurantului. Cu bucket privat ar fi fost nevoie de URL-uri semnate, care
 * expira — adica un logo care dispare dupa o ora.
 *
 * Calea incepe cu `restaurant_id`, iar politicile de scriere compara primul
 * segment cu restaurantul contului: public inseamna „oricine poate citi", nu
 * „oricine poate pune ce vrea".
 */
export async function urcaLogo(restaurantId: string, fisier: File): Promise<string> {
  const extensie = fisier.name.split('.').pop()?.toLowerCase() ?? 'png'
  // Numele poarta un timestamp: fara el, browserul ar servi din cache logoul
  // vechi la aceeasi cale, iar restaurantul ar crede ca incarcarea n-a mers.
  const cale = `${restaurantId}/logo-${Date.now()}.${extensie}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(cale, fisier, { upsert: true, contentType: fisier.type })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(cale)
  await actualizeazaRestaurant(restaurantId, { logo_url: data.publicUrl })
  return data.publicUrl
}

/**
 * Sterge doar referinta din `restaurants`, nu si fisierul: un logo vechi de
 * cateva zeci de kiloocteti nu merita riscul de a sterge fisierul gresit, iar
 * bucketul poate fi curatat oricand. Ce conteaza pentru client e ca pagina
 * publica nu-l mai arata.
 */
export async function stergeLogo(restaurantId: string): Promise<void> {
  await actualizeazaRestaurant(restaurantId, { logo_url: null })
}
