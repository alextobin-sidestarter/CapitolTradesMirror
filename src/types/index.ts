export type Party = 'D' | 'R' | 'I'
export type Chamber = 'Senate' | 'House'
export type TransactionType = 'Purchase' | 'Sale' | 'Exchange'
export type AssetType = 'Stock' | 'Option' | 'Bond' | 'Other'

export interface Politician {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  slug: string
  party: Party | null
  chamber: Chamber | null
  state: string | null
  district: string | null
  photo_url: string | null
  bio: string | null
  website_url: string | null
  twitter_handle: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Stock {
  id: string
  ticker: string
  company_name: string
  sector: string | null
  industry: string | null
  market_cap: number | null
  logo_url: string | null
  description: string | null
}

export interface Trade {
  id: string
  politician_id: string
  ticker: string | null
  company_name: string | null
  asset_type: AssetType
  transaction_type: TransactionType
  amount_min: number | null
  amount_max: number | null
  transaction_date: string | null
  disclosure_date: string | null
  comment: string | null
  source: string
  source_id: string | null
  is_verified: boolean
  created_at: string
  // Joined
  politicians?: Politician
}

export interface TradeWithPolitician extends Trade {
  politicians: Politician
}

export interface StockPrice {
  ticker: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  portfolio_politicians?: PortfolioPolitician[]
}

export interface PortfolioPolitician {
  id: string
  portfolio_id: string
  politician_id: string
  allocation_pct: number
  politician?: Politician
}

export interface PortfolioTrade {
  id: string
  portfolio_id: string
  trade_id: string
  simulated_price: number | null
  simulated_shares: number | null
  simulated_amount: number | null
  trade?: Trade
}

// Amount range labels from disclosure forms
export const AMOUNT_RANGES: Record<string, { min: number; max: number; label: string }> = {
  '1': { min: 1, max: 1000, label: '$1 - $1K' },
  '2': { min: 1001, max: 15000, label: '$1K - $15K' },
  '3': { min: 15001, max: 50000, label: '$15K - $50K' },
  '4': { min: 50001, max: 100000, label: '$50K - $100K' },
  '5': { min: 100001, max: 250000, label: '$100K - $250K' },
  '6': { min: 250001, max: 500000, label: '$250K - $500K' },
  '7': { min: 500001, max: 1000000, label: '$500K - $1M' },
  '8': { min: 1000001, max: 5000000, label: '$1M - $5M' },
  '9': { min: 5000001, max: 25000000, label: '$5M - $25M' },
  '10': { min: 25000001, max: 50000000, label: '$25M - $50M' },
}

export function formatAmountRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Unknown'
  if (min && max) {
    if (max >= 1_000_000) return `$${(min / 1_000_000).toFixed(1)}M - $${(max / 1_000_000).toFixed(1)}M`
    if (max >= 1_000) return `$${(min / 1_000).toFixed(0)}K - $${(max / 1_000).toFixed(0)}K`
    return `$${min} - $${max}`
  }
  return min ? `$${min}+` : 'Unknown'
}
