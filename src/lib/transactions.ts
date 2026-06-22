import { supabase } from './supabase'

export async function addTransaction(
  assetId: string,
  type: 'buy' | 'sell',
  quantity: number,
  price: number,
  date: string,
  note?: string,
  tryRate?: number,
  tryTotal?: number
) {
  const { error } = await supabase.from('transactions').insert({
    asset_id: assetId,
    type,
    quantity,
    price,
    total: quantity * price,
    transaction_date: date,
    note: note || null,
    try_rate: tryRate || null,
    try_total: tryTotal || null
  })

  if (error) return { error }

  const { error: fnError } = await supabase.rpc('update_asset_stats', {
    p_asset_id: assetId
  })

  return { error: fnError }
}

export async function fetchTransactions(assetId: string) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('asset_id', assetId)
    .order('transaction_date', { ascending: false })

  return data || []
}