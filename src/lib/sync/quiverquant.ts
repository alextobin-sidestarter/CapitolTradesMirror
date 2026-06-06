/**
 * QuiverQuant congressional trading sync
 * Docs: https://www.quiverquant.com/sources/congressional
 * Requires API key (free tier available)
 */

import { slugify } from '../utils'

const BASE_URL = 'https://api.quiverquant.com/beta'

export interface QuiverTrade {
  Date: string
  Senator?: string
  Representative?: string
  Party: string
  State: string
  Ticker: string
  Description: string
  Transaction: string // 'Purchase' | 'Sale (Partial)' | 'Sale (Full)'
  Range: string // '$1,001 - $15,000' etc
  House: string // 'Senate' | 'House'
}

function normalizeType(transaction: string): string {
  const t = transaction.toLowerCase()
  if (t.includes('purchase')) return 'Purchase'
  if (t.includes('sale')) return 'Sale'
  return 'Exchange'
}

function parseRange(range: string): { min: number; max: number } | null {
  if (!range) return null
  const cleaned = range.replace(/[$,]/g, '')
  const parts = cleaned.split('-').map(s => parseInt(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] }
  }
  // Handle '$1,000,001 +' style
  const match = cleaned.match(/(\d+)\s*\+/)
  if (match) return { min: parseInt(match[1]), max: parseInt(match[1]) * 10 }
  return null
}

export function mapQuiverToDb(trade: QuiverTrade, sourceId: string) {
  const name = trade.Senator || trade.Representative || 'Unknown'
  const chamber = trade.House === 'Senate' ? 'Senate' : 'House'
  const range = parseRange(trade.Range)

  const politician = {
    full_name: name,
    slug: slugify(name),
    party: trade.Party?.toUpperCase()?.charAt(0) || 'I',
    chamber,
    state: trade.State,
  }

  const dbTrade = {
    ticker: trade.Ticker?.toUpperCase() || null,
    company_name: trade.Description || null,
    transaction_type: normalizeType(trade.Transaction),
    asset_type: 'Stock',
    amount_min: range?.min || null,
    amount_max: range?.max || null,
    transaction_date: trade.Date || null,
    disclosure_date: null as string | null,
    comment: null as string | null,
    source: 'quiverquant',
    source_id: sourceId,
  }

  return { politician, trade: dbTrade }
}

export async function fetchQuiverQuant(endpoint: 'senate' | 'house'): Promise<QuiverTrade[]> {
  const apiKey = process.env.QUIVERQUANT_API_KEY
  if (!apiKey) throw new Error('QUIVERQUANT_API_KEY not set')

  const url = `${BASE_URL}/live/congresstrading${endpoint === 'senate' ? '?house=Senate' : '?house=House'}`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`QuiverQuant API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
