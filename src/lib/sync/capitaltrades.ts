/**
 * Capitol Trades sync — fetches from capitaltrades.com public API
 * Rate limits: be respectful, add delay between pages
 */

import { slugify } from '../utils'

const BASE_URL = 'https://capitaltrades.com/api'

export interface CapitalTradesTransaction {
  _id: string
  politician: {
    _id: string
    name: string
    party: string
    chamber: string
    state: string
  }
  issuer: {
    _id: string
    name: string
    ticker: string
  } | null
  txDate: string
  filedDate: string
  type: string // 'buy' | 'sell'
  amount: number
  size: string // range label
  comment: string
}

export interface CapitalTradesResponse {
  data: CapitalTradesTransaction[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

function normalizeParty(party: string): string {
  const p = party.toUpperCase()
  if (p.includes('DEM') || p === 'D') return 'D'
  if (p.includes('REP') || p === 'R') return 'R'
  return 'I'
}

function normalizeChamber(chamber: string): string {
  const c = chamber.toLowerCase()
  if (c.includes('senate') || c === 's') return 'Senate'
  return 'House'
}

function normalizeType(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('buy') || t.includes('purchase')) return 'Purchase'
  if (t.includes('sell') || t.includes('sale')) return 'Sale'
  return 'Exchange'
}

export function mapToDbTrade(tx: CapitalTradesTransaction) {
  const politician = {
    full_name: tx.politician.name,
    slug: slugify(tx.politician.name),
    party: normalizeParty(tx.politician.party),
    chamber: normalizeChamber(tx.politician.chamber),
    state: tx.politician.state,
  }

  const trade = {
    ticker: tx.issuer?.ticker?.toUpperCase() || null,
    company_name: tx.issuer?.name || null,
    transaction_type: normalizeType(tx.type),
    asset_type: 'Stock',
    amount_min: tx.amount || null,
    amount_max: null as number | null,
    transaction_date: tx.txDate ? tx.txDate.split('T')[0] : null,
    disclosure_date: tx.filedDate ? tx.filedDate.split('T')[0] : null,
    comment: tx.comment || null,
    source: 'capitaltrades',
    source_id: tx._id,
  }

  return { politician, trade }
}

export async function fetchCapitalTradesPage(page = 1, pageSize = 100): Promise<CapitalTradesResponse> {
  const url = `${BASE_URL}/transactions?page=${page}&pageSize=${pageSize}&sortField=filedDate&sortOrder=desc`
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CapitolMirror/1.0',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Capitol Trades API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
