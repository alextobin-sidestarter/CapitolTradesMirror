/**
 * Stock price fetcher using Yahoo Finance (free, no key needed)
 * Falls back gracefully if rate limited
 */

export interface StockQuote {
  ticker: string
  price: number
  open: number
  high: number
  low: number
  volume: number
  date: string
}

export async function fetchYahooQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    })

    if (!res.ok) return null

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const quote = result.indicators?.quote?.[0]

    return {
      ticker: ticker.toUpperCase(),
      price: meta.regularMarketPrice,
      open: quote?.open?.[0] || meta.regularMarketPrice,
      high: quote?.high?.[0] || meta.regularMarketPrice,
      low: quote?.low?.[0] || meta.regularMarketPrice,
      volume: quote?.volume?.[0] || 0,
      date: new Date().toISOString().split('T')[0],
    }
  } catch {
    return null
  }
}

export async function fetchYahooHistory(
  ticker: string,
  from: string, // YYYY-MM-DD
  to: string    // YYYY-MM-DD
): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const fromTs = Math.floor(new Date(from).getTime() / 1000)
    const toTs = Math.floor(new Date(to).getTime() / 1000)

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${fromTs}&period2=${toTs}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    })

    if (!res.ok) return []

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return []

    const timestamps: number[] = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quote.open?.[i] || 0,
      high: quote.high?.[i] || 0,
      low: quote.low?.[i] || 0,
      close: quote.close?.[i] || 0,
      volume: quote.volume?.[i] || 0,
    })).filter(d => d.close > 0)
  } catch {
    return []
  }
}

export async function fetchMultipleQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>()

  // Yahoo supports batch queries
  const symbols = tickers.join(',')
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    })

    if (!res.ok) return results

    const data = await res.json()
    const quotes = data?.quoteResponse?.result || []

    for (const q of quotes) {
      results.set(q.symbol, {
        ticker: q.symbol,
        price: q.regularMarketPrice,
        open: q.regularMarketOpen,
        high: q.regularMarketDayHigh,
        low: q.regularMarketDayLow,
        volume: q.regularMarketVolume,
        date: new Date().toISOString().split('T')[0],
      })
    }
  } catch {}

  return results
}
