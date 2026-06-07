/**
 * Senate eFD (Electronic Financial Disclosure) scraper
 * Source: https://efts.senate.gov/LATEST/search-index?q=&dateRange=custom&fromDate=2024-01-01&toDate=2024-12-31&filingType=trade
 */

import { slugify } from '../utils'

const SENATE_API = 'https://efts.senate.gov/LATEST/search-index'

export interface SenateFiling {
  id: string
  firstName: string
  lastName: string
  stateCode: string
  filingDate: string
  reportTitle: string
  fileName: string
}

export interface SenateTransaction {
  transactionDate: string
  owner: string
  ticker: string
  assetName: string
  assetType: string
  type: string // 'Purchase', 'Sale (Partial)', 'Sale (Full)', 'Exchange'
  amount: string // '$1,001 - $15,000'
  comment: string
}

function parseAmount(amount: string): { min: number; max: number } | null {
  if (!amount) return null
  const cleaned = amount.replace(/[$,\s]/g, '')
  const parts = cleaned.split('-').map(s => parseInt(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] }
  }
  const over = cleaned.match(/(\d+)\+/)
  if (over) return { min: parseInt(over[1]), max: parseInt(over[1]) * 5 }
  return null
}

function normalizeType(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('purchase')) return 'Purchase'
  if (t.includes('sale') || t.includes('sold')) return 'Sale'
  if (t.includes('exchange')) return 'Exchange'
  return 'Purchase'
}

export async function fetchSenateFilings(year: number = new Date().getFullYear()): Promise<SenateFiling[]> {
  const url = `${SENATE_API}?q=&dateRange=custom&fromDate=${year}-01-01&toDate=${year}-12-31&filingType=trade&limit=100`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CapitolMirror/1.0 (public data aggregator)',
    },
  })

  if (!res.ok) throw new Error(`Senate API error: ${res.status}`)

  const data = await res.json()
  return data.hits?.hits?.map((h: any) => h._source) || []
}

export async function fetchSenateTransactions(filing: SenateFiling): Promise<SenateTransaction[]> {
  // Senate stores individual transaction PDFs — we parse the XML report
  const xmlUrl = `https://efts.senate.gov/LATEST/search-index?id=${filing.id}`

  try {
    const res = await fetch(xmlUrl, {
      headers: { 'User-Agent': 'CapitolMirror/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.transactions || []
  } catch {
    return []
  }
}

export function mapSenateToDb(filing: SenateFiling, tx: SenateTransaction) {
  const range = parseAmount(tx.amount)
  const fullName = `${filing.firstName} ${filing.lastName}`

  const politician = {
    full_name: fullName,
    first_name: filing.firstName,
    last_name: filing.lastName,
    slug: slugify(fullName),
    party: null as string | null, // Senate eFD doesn't include party
    chamber: 'Senate',
    state: filing.stateCode,
  }

  const trade = {
    ticker: tx.ticker?.toUpperCase()?.trim() || null,
    company_name: tx.assetName || null,
    asset_type: tx.assetType || 'Stock',
    transaction_type: normalizeType(tx.type),
    amount_min: range?.min || null,
    amount_max: range?.max || null,
    transaction_date: tx.transactionDate || null,
    disclosure_date: filing.filingDate || null,
    comment: tx.comment || null,
    source: 'senate_efd',
    source_id: `${filing.id}-${tx.ticker}-${tx.transactionDate}`,
  }

  return { politician, trade }
}
