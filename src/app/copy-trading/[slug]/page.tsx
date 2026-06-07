'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Trophy, AlertTriangle, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, partyColor, transactionBadge } from '@/lib/utils'
import type { Politician, Trade } from '@/types'

interface TradeWithPerf extends Trade {
  price_at_disclosure?: number | null
  price_current?: number | null
  price_change_pct?: number | null
  simulated_profit?: number
}

export default function CopyTradingDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [politician, setPolitician] = useState<Politician | null>(null)
  const [trades, setTrades] = useState<TradeWithPerf[]>([])
  const [loading, setLoading] = useState(true)
  const [pricesLoading, setPricesLoading] = useState(false)

  const INVESTMENT = 1000

  useEffect(() => {
    async function load() {
      const { data: pol } = await supabase.from('politicians').select('*').eq('slug', slug).single()
      if (!pol) return

      setPolitician(pol)

      const { data: tradeData } = await supabase
        .from('trades')
        .select('*')
        .eq('politician_id', pol.id)
        .not('ticker', 'is', null)
        .not('disclosure_date', 'is', null)
        .order('disclosure_date', { ascending: false })

      setTrades(tradeData || [])
      setLoading(false)

      // Fetch prices via our proxy
      if (tradeData?.length) {
        setPricesLoading(true)
        const enriched = await enrichWithPrices(tradeData)
        setTrades(enriched)
        setPricesLoading(false)
      }
    }
    load()
  }, [slug])

  async function enrichWithPrices(trades: Trade[]): Promise<TradeWithPerf[]> {
    return Promise.all(trades.map(async trade => {
      if (!trade.ticker || !trade.disclosure_date) return trade

      try {
        const ts = Math.floor(new Date(trade.disclosure_date).getTime() / 1000)
        const tsEnd = ts + 86400 * 5

        const [histRes, currentRes] = await Promise.all([
          fetch(`/api/proxy/yahoo?url=${encodeURIComponent(
            `https://query1.finance.yahoo.com/v8/finance/chart/${trade.ticker}?interval=1d&period1=${ts}&period2=${tsEnd}`
          )}`),
          fetch(`/api/proxy/yahoo?url=${encodeURIComponent(
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${trade.ticker}`
          )}`),
        ])

        const histData = await histRes.json()
        const currentData = await currentRes.json()

        const closes = histData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close
        const disclosurePrice = closes?.find((c: number | null) => c != null) || null
        const currentPrice = currentData?.quoteResponse?.result?.[0]?.regularMarketPrice || null

        if (!disclosurePrice || !currentPrice) return trade

        const isBuy = trade.transaction_type === 'Purchase'
        const pct = isBuy
          ? ((currentPrice - disclosurePrice) / disclosurePrice) * 100
          : ((disclosurePrice - currentPrice) / disclosurePrice) * 100

        return {
          ...trade,
          price_at_disclosure: disclosurePrice,
          price_current: currentPrice,
          price_change_pct: pct,
          simulated_profit: (INVESTMENT * pct) / 100,
        }
      } catch {
        return trade
      }
    }))
  }

  const enrichedTrades = trades.filter(t => t.price_change_pct != null)
  const totalProfit = enrichedTrades.reduce((s, t) => s + (t.simulated_profit || 0), 0)
  const totalInvested = enrichedTrades.length * INVESTMENT
  const totalReturnPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
  const winRate = enrichedTrades.length > 0
    ? (enrichedTrades.filter(t => (t.simulated_profit || 0) > 0).length / enrichedTrades.length) * 100
    : 0

  const sorted = [...enrichedTrades].sort((a, b) => (b.simulated_profit || 0) - (a.simulated_profit || 0))
  const bestTrade = sorted[0]
  const worstTrade = sorted[sorted.length - 1]

  if (loading) return <div className="text-center py-20 text-gray-500 animate-pulse">Loading...</div>
  if (!politician) return <div className="text-center py-20 text-gray-500">Politician not found.</div>

  return (
    <div className="space-y-8">
      <Link href="/copy-trading" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
        <ArrowLeft size={14} /> Copy Trading
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-bold text-white shrink-0">
          {politician.full_name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{politician.full_name}</h1>
          <div className="text-sm text-gray-400 mt-1">
            <span className={partyColor(politician.party || null)}>{politician.party === 'D' ? 'Democrat' : politician.party === 'R' ? 'Republican' : 'Independent'}</span>
            {' · '}{politician.chamber}{' · '}{politician.state}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Simulating $1,000 invested per trade on disclosure date
          </div>
        </div>
      </div>

      {/* Performance summary */}
      {pricesLoading ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500 animate-pulse">
          Fetching live prices to calculate performance...
        </div>
      ) : enrichedTrades.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Return</div>
              <div className={`text-2xl font-bold ${totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">P&L</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">on ${totalInvested.toLocaleString()} invested</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-white">{winRate.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">{enrichedTrades.filter(t => (t.simulated_profit||0) > 0).length}W / {enrichedTrades.filter(t => (t.simulated_profit||0) < 0).length}L</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Trades Analyzed</div>
              <div className="text-2xl font-bold text-white">{enrichedTrades.length}</div>
            </div>
          </div>

          {/* Best/Worst */}
          <div className="grid sm:grid-cols-2 gap-4">
            {bestTrade && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <TrendingUp size={12} /> Best Trade
                </div>
                <div className="font-mono font-bold text-white text-xl">{bestTrade.ticker}</div>
                <div className="text-sm text-gray-400">{bestTrade.company_name}</div>
                <div className="text-emerald-400 font-bold text-lg mt-1">
                  +${bestTrade.simulated_profit?.toFixed(0)} ({bestTrade.price_change_pct?.toFixed(1)}%)
                </div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(bestTrade.disclosure_date)}</div>
              </div>
            )}
            {worstTrade && worstTrade.trade_id !== bestTrade?.trade_id && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="text-xs text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <TrendingDown size={12} /> Worst Trade
                </div>
                <div className="font-mono font-bold text-white text-xl">{worstTrade.ticker}</div>
                <div className="text-sm text-gray-400">{worstTrade.company_name}</div>
                <div className="text-red-400 font-bold text-lg mt-1">
                  ${worstTrade.simulated_profit?.toFixed(0)} ({worstTrade.price_change_pct?.toFixed(1)}%)
                </div>
                <div className="text-xs text-gray-500 mt-1">{formatDate(worstTrade.disclosure_date)}</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-gray-500">
          Not enough price data to calculate performance yet.
        </div>
      )}

      {/* Trade breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Trade Breakdown</h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_80px_100px_90px_90px] gap-3 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
            <div>Ticker</div>
            <div>Company</div>
            <div>Type</div>
            <div className="text-right">Entry Price</div>
            <div className="text-right">Now</div>
            <div className="text-right">P&L</div>
          </div>

          {trades.map(trade => {
            const hasPerf = trade.price_change_pct != null
            const profit = trade.simulated_profit || 0
            return (
              <div key={trade.id} className="grid grid-cols-[80px_1fr_80px_100px_90px_90px] gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm items-center">
                <Link href={`/stocks/${trade.ticker}`} className="font-mono font-bold text-white hover:text-emerald-400">
                  {trade.ticker}
                </Link>
                <div className="text-gray-400 truncate text-xs">{trade.company_name}</div>
                <div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${transactionBadge(trade.transaction_type)}`}>
                    {trade.transaction_type === 'Purchase' ? 'Buy' : 'Sell'}
                  </span>
                </div>
                <div className="text-right text-gray-300">
                  {trade.price_at_disclosure ? `$${trade.price_at_disclosure.toFixed(2)}` : '—'}
                </div>
                <div className="text-right text-gray-300">
                  {trade.price_current ? `$${trade.price_current.toFixed(2)}` : pricesLoading ? '...' : '—'}
                </div>
                <div className={`text-right font-medium ${!hasPerf ? 'text-gray-500' : profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {!hasPerf ? (pricesLoading ? '...' : '—') : `${profit >= 0 ? '+' : ''}$${profit.toFixed(0)}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
