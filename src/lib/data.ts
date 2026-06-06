import { getSupabase } from './supabase'
import type { Trade, Politician, TradeWithPolitician } from '@/types'

function db() {
  try { return getSupabase() } catch { return null }
}

export async function getRecentTrades(
  limit = 50,
  offset = 0,
  filters?: {
    transaction_type?: string
    ticker?: string
    politician_id?: string
  }
): Promise<{ trades: TradeWithPolitician[]; count: number }> {
  const client = db()
  if (!client) return { trades: [], count: 0 }

  let query = client
    .from('trades')
    .select('*, politicians(*)', { count: 'exact' })
    .not('transaction_date', 'is', null)
    .order('disclosure_date', { ascending: false })
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.transaction_type) query = query.eq('transaction_type', filters.transaction_type)
  if (filters?.ticker) query = query.ilike('ticker', filters.ticker)
  if (filters?.politician_id) query = query.eq('politician_id', filters.politician_id)

  const { data, error, count } = await query
  if (error) throw error
  return { trades: (data as TradeWithPolitician[]) || [], count: count || 0 }
}

export async function getPolitician(slug: string): Promise<Politician | null> {
  const client = db()
  if (!client) return null
  const { data } = await client.from('politicians').select('*').eq('slug', slug).single()
  return data
}

export async function getAllPoliticians(filters?: {
  chamber?: string
  party?: string
  search?: string
}): Promise<Politician[]> {
  const client = db()
  if (!client) return []

  let query = client.from('politicians').select('*').eq('is_active', true).order('last_name')
  if (filters?.chamber) query = query.eq('chamber', filters.chamber)
  if (filters?.party) query = query.eq('party', filters.party)
  if (filters?.search) query = query.ilike('full_name', `%${filters.search}%`)

  const { data } = await query
  return data || []
}

export async function getPoliticianTrades(politicianId: string): Promise<Trade[]> {
  const client = db()
  if (!client) return []
  const { data } = await client
    .from('trades')
    .select('*')
    .eq('politician_id', politicianId)
    .order('transaction_date', { ascending: false })
  return data || []
}

export async function getStockTrades(ticker: string): Promise<TradeWithPolitician[]> {
  const client = db()
  if (!client) return []
  const { data } = await client
    .from('trades')
    .select('*, politicians(*)')
    .ilike('ticker', ticker)
    .order('transaction_date', { ascending: false })
  return (data as TradeWithPolitician[]) || []
}

export async function getTopStocks(limit = 20): Promise<{ ticker: string; company_name: string; trade_count: number; buy_count: number; sell_count: number }[]> {
  const client = db()
  if (!client) return []

  const { data } = await client
    .from('trades')
    .select('ticker, company_name, transaction_type')
    .not('ticker', 'is', null)

  const stockMap = new Map<string, { ticker: string; company_name: string; trade_count: number; buy_count: number; sell_count: number }>()

  for (const trade of data || []) {
    if (!trade.ticker) continue
    const existing = stockMap.get(trade.ticker) || {
      ticker: trade.ticker,
      company_name: trade.company_name || trade.ticker,
      trade_count: 0,
      buy_count: 0,
      sell_count: 0,
    }
    existing.trade_count++
    if (trade.transaction_type === 'Purchase') existing.buy_count++
    if (trade.transaction_type === 'Sale') existing.sell_count++
    stockMap.set(trade.ticker, existing)
  }

  return Array.from(stockMap.values())
    .sort((a, b) => b.trade_count - a.trade_count)
    .slice(0, limit)
}

export async function getDashboardStats() {
  const client = db()
  if (!client) return { total_trades: 0, total_politicians: 0, recent_purchases: 0, recent_sales: 0 }

  const [tradesResult, politiciansResult, purchasesResult, salesResult] = await Promise.all([
    client.from('trades').select('*', { count: 'exact', head: true }),
    client.from('politicians').select('*', { count: 'exact', head: true }).eq('is_active', true),
    client.from('trades').select('*', { count: 'exact', head: true }).eq('transaction_type', 'Purchase'),
    client.from('trades').select('*', { count: 'exact', head: true }).eq('transaction_type', 'Sale'),
  ])

  return {
    total_trades: tradesResult.count || 0,
    total_politicians: politiciansResult.count || 0,
    recent_purchases: purchasesResult.count || 0,
    recent_sales: salesResult.count || 0,
  }
}
