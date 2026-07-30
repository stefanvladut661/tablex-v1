import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type SetariApp = Tables<'app_settings'>

export const CHEI_SETARI = {
  app: ['setari-app'] as const,
}

/**
 * app_settings e singleton (un rand, id = true) si e singura tabela citibila
 * de un vizitator anonim — de aici ia landing page-ul preturile reale.
 */
export async function getSetariApp(): Promise<SetariApp> {
  const { data, error } = await supabase.from('app_settings').select('*').single()
  if (error) throw error
  return data
}
