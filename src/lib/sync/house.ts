/**
 * House Financial Disclosures scraper
 * Source: https://disclosures-clerk.house.gov/FinancialDisclosure
 * PTR (Periodic Transaction Reports) are filed within 45 days of a trade
 */

import { slugify } from '../utils'

const HOUSE_SEARCH_URL = 'https://disclosures-clerk.house.gov/FinancialDisclosure/ViewMemberSearchResult'
const HOUSE_PTR_URL = 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs'

export interface HousePTR {
  id: string
  name: string
  office: string // state + district
  year: string
  filingDate: string
  docId: string
}

export interface HouseTransaction {
  transactionDate: string
  owner: string
  ticker: string
  assetName: string
  assetType: string
  type: string
  amount: string
  comment: string
  Capitol: string
}

function parseAmount(amount: string): { min: number; max: number } | null {
  if (!amount) return null
  const ranges: Record<string, { min: number; max: number }> = {
    '$1,001 - $15,000': { min: 1001, max: 15000 },
    '$15,001 - $50,000': { min: 15001, max: 50000 },
    '$50,001 - $100,000': { min: 50001, max: 100000 },
    '$100,001 - $250,000': { min: 100001, max: 250000 },
    '$250,001 - $500,000': { min: 250001, max: 500000 },
    '$500,001 - $1,000,000': { min: 500001, max: 1000000 },
    '$1,000,001 - $5,000,000': { min: 1000001, max: 5000000 },
    '$5,000,001 - $25,000,000': { min: 5000001, max: 25000000 },
    '$25,000,001 - $50,000,000': { min: 25000001, max: 50000000 },
    'Over $50,000,000': { min: 50000001, max: 500000000 },
  }

  if (ranges[amount]) return ranges[amount]

  // Fallback: parse manually
  const cleaned = amount.replace(/[$,\s]/g, '')
  const parts = cleaned.split('-').map(s => parseInt(s.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] }
  }
  return null
}

function normalizeType(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('purchase') || t === 'p') return 'Purchase'
  if (t.includes('sale') || t === 's') return 'Sale'
  if (t.includes('exchange') || t === 'e') return 'Exchange'
  return 'Purchase'
}

function parseState(office: string): string {
  // office format: "TX-10" or "CA-Senate"
  return office?.split('-')[0] || ''
}

export async function fetchHousePTRs(year: number = new Date().getFullYear()): Promise<HousePTR[]> {
  const url = `${HOUSE_SEARCH_URL}?reportYear=${year}&reportType=P&&State=&District=`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CapitolMirror/1.0',
      },
    })

    if (!res.ok) return []

    const text = await res.text()

    // Parse JSON response if available
    try {
      const data = JSON.parse(text)
      return data.data || []
    } catch {
      return []
    }
  } catch {
    return []
  }
}

export async function fetchHouseTransactions(ptr: HousePTR): Promise<HouseTransaction[]> {
  // House PTRs are PDFs — we use the XML version where available
  const xmlUrl = `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${ptr.year}/${ptr.docId}.xml`

  try {
    const res = await fetch(xmlUrl, {
      headers: { 'User-Agent': 'CapitolMirror/1.0' },
    })
    if (!res.ok) return []

    const xml = await res.text()
    return parseHouseXML(xml)
  } catch {
    return []
  }
}

function parseHouseXML(xml: string): HouseTransaction[] {
  const transactions: HouseTransaction[] = []

  // Simple regex-based XML parser for House PTR format
  const txRegex = /<Transaction>([\s\S]*?)<\/Transaction>/g
  let match

  while ((match = txRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`))
      return m ? m[1].trim() : ''
    }

    transactions.push({
      transactionDate: get('TransactionDate'),
      owner: get('Owner'),
      ticker: get('Ticker'),
      assetName: get('AssetName'),
      assetType: get('AssetType'),
      type: get('Type'),
      amount: get('Amount'),
      comment: get('Comment'),
      Capitol: get('Capitol'),
    })
  }

  return transactions
}

export function mapHouseToDb(ptr: HousePTR, tx: HouseTransaction) {
  const range = parseAmount(tx.amount)
  const nameParts = ptr.name.split(',').map(s => s.trim())
  const lastName = nameParts[0] || ''
  const firstName = nameParts[1] || ''
  const fullName = `${firstName} ${lastName}`.trim()

  const politician = {
    full_name: fullName || ptr.name,
    first_name: firstName || null,
    last_name: lastName || null,
    slug: slugify(fullName || ptr.name),
    party: null as string | null,
    chamber: 'House',
    state: parseState(ptr.office),
    district: ptr.office || null,
  }

  const trade = {
    ticker: tx.ticker?.toUpperCase()?.trim() || null,
    company_name: tx.assetName || null,
    asset_type: tx.assetType || 'Stock',
    transaction_type: normalizeType(tx.type),
    amount_min: range?.min || null,
    amount_max: range?.max || null,
    transaction_date: tx.transactionDate || null,
    disclosure_date: ptr.filingDate || null,
    comment: tx.comment || null,
    source: 'house_ptr',
    source_id: `${ptr.docId}-${tx.ticker}-${tx.transactionDate}`,
  }

  return { politician, trade }
}
