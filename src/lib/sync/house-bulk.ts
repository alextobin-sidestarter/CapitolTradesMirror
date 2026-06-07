/**
 * House Financial Disclosures — Bulk XML download
 * Source: https://disclosures-clerk.house.gov/public_disc/financial-pdfs/
 * They publish annual ZIP files containing all PTR (Periodic Transaction Reports)
 * Format: https://disclosures-clerk.house.gov/public_disc/financial-pdfs/2024FD.zip
 *
 * Each ZIP contains XML files for each member's disclosures
 */

import { slugify } from '../utils'

const HOUSE_BASE = 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs'
const HOUSE_INDEX = 'https://disclosures-clerk.house.gov/FinancialDisclosure/ViewMemberSearchResult'

export interface HousePTRIndex {
  FilingID: string
  Last: string
  First: string
  StateDst: string // e.g. "TX05"
  Year: string
  FilingDate: string
  DocID: string
}

function parseState(stateDst: string): string {
  return stateDst?.replace(/\d+/g, '').toUpperCase() || ''
}

function parseAmount(amount: string): { min: number; max: number } | null {
  const ranges: Record<string, [number, number]> = {
    '$1,001 - $15,000': [1001, 15000],
    '$15,001 - $50,000': [15001, 50000],
    '$50,001 - $100,000': [50001, 100000],
    '$100,001 - $250,000': [100001, 250000],
    '$250,001 - $500,000': [250001, 500000],
    '$500,001 - $1,000,000': [500001, 1000000],
    '$1,000,001 - $5,000,000': [1000001, 5000000],
    '$5,000,001 - $25,000,000': [5000001, 25000000],
    '$25,000,001 - $50,000,000': [25000001, 50000000],
    'Over $50,000,000': [50000001, 500000000],
  }
  if (ranges[amount]) return { min: ranges[amount][0], max: ranges[amount][1] }
  return null
}

function normalizeType(type: string): string {
  const t = (type || '').trim().toLowerCase()
  if (t === 'p' || t.includes('purchase')) return 'Purchase'
  if (t === 's' || t.includes('sale')) return 'Sale'
  if (t === 'e' || t.includes('exchange')) return 'Exchange'
  return 'Purchase'
}

function extractXmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : ''
}

export function parseHousePTRXml(xml: string, filing: HousePTRIndex) {
  const results: ReturnType<typeof mapToDb>[] = []

  // Find all Transaction blocks
  const txRegex = /<Transaction>([\s\S]*?)<\/Transaction>/gi
  let match

  while ((match = txRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => extractXmlTag(block, tag)

    const ticker = get('Ticker')?.toUpperCase().trim()
    const assetName = get('AssetName') || get('Asset')
    const type = get('Type')
    const amount = get('Amount')
    const txDate = get('TransactionDate') || get('Date')

    // Skip non-stock assets if no ticker
    if (!ticker && !assetName) continue

    const range = parseAmount(amount)
    const fullName = `${filing.First} ${filing.Last}`.trim()

    const politician = {
      full_name: fullName,
      first_name: filing.First || null,
      last_name: filing.Last || null,
      slug: slugify(fullName),
      party: null as string | null,
      chamber: 'House' as string,
      state: parseState(filing.StateDst),
      district: filing.StateDst || null,
    }

    const trade = {
      ticker: ticker || null,
      company_name: assetName || null,
      asset_type: get('AssetType') || 'Stock',
      transaction_type: normalizeType(type),
      amount_min: range?.min || null,
      amount_max: range?.max || null,
      transaction_date: txDate || null,
      disclosure_date: filing.FilingDate || null,
      comment: get('Comment') || null,
      source: 'house_ptr',
      source_id: `${filing.DocID}-${ticker}-${txDate}-${Math.random().toString(36).slice(2, 7)}`,
    }

    results.push({ politician, trade })
  }

  return results
}

export async function fetchHousePTRIndex(year: number): Promise<HousePTRIndex[]> {
  // House publishes a searchable index
  const url = `${HOUSE_INDEX}?reportYear=${year}&reportType=P&State=&District=&LastName=&search=search`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/html',
        'User-Agent': 'CapitolMirror/1.0',
      },
    })

    if (!res.ok) return []

    // Try JSON first
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('json')) {
      const data = await res.json()
      return data?.data || []
    }

    // Parse HTML table if JSON not available
    const html = await res.text()
    return parseHouseIndexHtml(html)
  } catch {
    return []
  }
}

function parseHouseIndexHtml(html: string): HousePTRIndex[] {
  const results: HousePTRIndex[] = []

  // Match table rows with filing data
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match

  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1]
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
      m[1].replace(/<[^>]+>/g, '').trim()
    )

    if (cells.length < 5) continue

    // Extract DocID from link
    const docMatch = row.match(/DocID=(\w+)/)
    if (!docMatch) continue

    results.push({
      Last: cells[0] || '',
      First: cells[1] || '',
      StateDst: cells[2] || '',
      Year: cells[3] || '',
      FilingDate: cells[4] || '',
      DocID: docMatch[1],
      FilingID: docMatch[1],
    })
  }

  return results
}

export async function fetchHousePTRXml(docId: string, year: string): Promise<string | null> {
  const url = `${HOUSE_BASE}/${year}/${docId}.xml`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CapitolMirror/1.0' },
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

function mapToDb(politician: any, trade: any) {
  return { politician, trade }
}
