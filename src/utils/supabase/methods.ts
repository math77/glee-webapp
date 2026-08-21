import { supabase } from "./client"

export async function getCanvassesData(userWallet: string) {
  const { data, error } = await supabase
    .from("canvas")
    .select("id, created_at, user_wallet, canvas_id, token_uri")
    .eq('user_wallet', userWallet)
    .order('id', { ascending: false })

  return { data, error }
}

export async function getTotalCanvasByUser(userWallet: string) {

  const { count, error } = await supabase
    .from('canvas')
    .select('*', { count: 'exact', head: true })
    .eq('user_wallet', userWallet)

  return { count, error }
}