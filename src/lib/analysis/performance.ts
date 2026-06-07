/**
 * Copy Trading Performance Calculator
 *
 * Simulates what would happen if you invested $10,000
 * and copied a politician's trades for a given period.
 *
 * Methodology:
 * - On disclosure date (when public finds out), you buy/sell
 * - Use Yahoo Finance historical prices
 * - Compare to S&P 500 (SPY) benchmark
 */

export interface TradePerformance {
  trade_id: string
  ticker: string
  company_name: string | null
  transaction_type: string
  transaction_date: string | null
  disclosure_date: string | null
  price_at_disclosure: number | null
  price_current: number | null
  price_change_pct: number | null
  simulated_investment: number
  simulated_return: number
  simulated_profit: number
}

export interface PortfolioPerformance {
  politician_name: string
  politician_slug: string
  period_days: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  total_return_pct: number
  total_profit: number
  simulated_investment: number
  simulated_value: number
  spy_return_pct: number // S&P 500 benchmark
  alpha: number // outperformance vs SPY
  trades: TradePerformance[]
  best_trade: TradePerformance | null
  worst_trade: TradePerformance | null
}

export async function fetchPriceAtDate(ticker: string, date: string): Promise<number | null> {
  try {
    const ts = Math.floor(new Date(date).getTime() / 1000)
    const tsEnd = ts + 86400 * 5 // +5 days to handle weekends

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${ts}&period2=${tsEnd}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    })
    if (!res.ok) return null

    const data = await res.json()
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
    const price = closes?.find((c: number | null) => c != null)
    return price || null
  } catch {
    return null
  }
}

export async function fetchCurrentPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.quoteResponse?.result?.[0]?.regularMarketPrice || null
  } catch {
    return null
  }
}

export async function calculatePortfolioPerformance(
  politicianName: string,
  politicianSlug: string,
  trades: {
    id: string
    ticker: string | null
    company_name: string | null
    transaction_type: string
    transaction_date: string | null
    disclosure_date: string | null
    amount_min: number | null
    amount_max: number | null
  }[],
  investmentPerTrade = 1000
): Promise<PortfolioPerformance> {
  const stockTrades = trades.filter(t => t.ticker && t.disclosure_date)
  const tradePerformances: TradePerformance[] = []

  // Fetch prices in parallel (batched)
  for (const trade of stockTrades) {
    if (!trade.ticker || !trade.disclosure_date) continue

    const [disclosurePrice, currentPrice, spyAtDisclosure, spyCurrent] = await Promise.all([
      fetchPriceAtDate(trade.ticker, trade.disclosure_date),
      fetchCurrentPrice(trade.ticker),
      fetchPriceAtDate('SPY', trade.disclosure_date),
      fetchCurrentPrice('SPY'),
    ])

    if (!disclosurePrice || !currentPrice) continue

    const isBuy = trade.transaction_type === 'Purchase'
    const priceChangePct = isBuy
      ? ((currentPrice - disclosurePrice) / disclosurePrice) * 100
      : ((disclosurePrice - currentPrice) / disclosurePrice) * 100 // short

    const profit = (investmentPerTrade * priceChangePct) / 100

    tradePerformances.push({
      trade_id: trade.id,
      ticker: trade.ticker,
      company_name: trade.company_name,
      transaction_type: trade.transaction_type,
      transaction_date: trade.transaction_date,
      disclosure_date: trade.disclosure_date,
      price_at_disclosure: disclosurePrice,
      price_current: currentPrice,
      price_change_pct: priceChangePct,
      simulated_investment: investmentPerTrade,
      simulated_return: investmentPerTrade + profit,
      simulated_profit: profit,
    })
  }

  const totalInvested = tradePerformances.length * investmentPerTrade
  const totalReturn = tradePerformances.reduce((sum, t) => sum + t.simulated_return, 0)
  const totalProfit = tradePerformances.reduce((sum, t) => sum + t.simulated_profit, 0)
  const totalReturnPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0

  const winners = tradePerformances.filter(t => t.simulated_profit > 0)
  const losers = tradePerformances.filter(t => t.simulated_profit < 0)

  const sorted = [...tradePerformances].sort((a, b) => b.simulated_profit - a.simulated_profit)

  return {
    politician_name: politicianName,
    politician_slug: politicianSlug,
    period_days: 365,
    total_trades: tradePerformances.length,
    winning_trades: winners.length,
    losing_trades: losers.length,
    win_rate: tradePerformances.length > 0 ? (winners.length / tradePerformances.length) * 100 : 0,
    total_return_pct: totalReturnPct,
    total_profit: totalProfit,
    simulated_investment: totalInvested,
    simulated_value: totalReturn,
    spy_return_pct: 0, // filled in separately
    alpha: 0,
    trades: tradePerformances,
    best_trade: sorted[0] || null,
    worst_trade: sorted[sorted.length - 1] || null,
  }
}
