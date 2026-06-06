import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '0')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const ticker = searchParams.get('ticker')
  const type = searchParams.get('type')
  const politician_id = searchParams.get('politician_id')

  const db = createServiceClient()
  let query = db
    .from('trades')
    .select('*, politicians(*)', { count: 'exact' })
    .order('disclosure_date', { ascending: false })
    .order('transaction_date', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (ticker) query = query.ilike('ticker', `%${ticker}%`)
  if (type) query = query.eq('transaction_type', type)
  if (politician_id) query = query.eq('politician_id', politician_id)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ trades: data, count, page, limit })
}
