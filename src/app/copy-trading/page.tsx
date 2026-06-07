import { getAllPoliticians, getPoliticianTrades } from '@/lib/data'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Trophy, ArrowRight } from 'lucide-react'
import { formatAmountRange } from '@/lib/utils'

export const revalidate = 3600

export default async function CopyTradingPage() {
  const politicians = await getAllPoliticians()

  // Get trade counts per politician for the leaderboard
  const politiciansWithCounts = await Promise.all(
    politicians.slice(0, 20).map(async pol => {
      const trades = await getPoliticianTrades(pol.id)
      const purchases = trades.filter(t => t.transaction_type === 'Purchase').length
      const sales = trades.filter(t => t.transaction_type === 'Sale').length
      return { ...pol, trade_count: trades.length, purchases, sales }
    })
  )

  const sorted = politiciansWithCounts
    .filter(p => p.trade_count > 0)
    .sort((a, b) => b.trade_count - a.trade_count)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-3">
          <Trophy size={16} />
          Copy Trading Simulator
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          What if you copied Congress?
        </h1>
        <p className="text-gray-400 max-w-2xl">
          See exactly what you would have made (or lost) if you mirrored a congress member's stock trades.
          We simulate buying on disclosure date — when the public finds out — using real historical prices.
        </p>
        <div className="flex flex-wrap gap-4 mt-6 text-sm">
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <span className="text-gray-400">Simulation method: </span>
            <span className="text-white font-medium">Buy/sell on disclosure date</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <span className="text-gray-400">Investment per trade: </span>
            <span className="text-white font-medium">$1,000</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <span className="text-gray-400">Benchmark: </span>
            <span className="text-white font-medium">S&P 500 (SPY)</span>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Select a Congress Member to Analyze
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((pol, i) => (
            <Link
              key={pol.id}
              href={`/copy-trading/${pol.slug}`}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white group-hover:bg-emerald-500/20 transition-colors">
                    {pol.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {pol.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {pol.party === 'D' ? 'Democrat' : pol.party === 'R' ? 'Republican' : 'Independent'}
                      {' · '}{pol.chamber}{' · '}{pol.state}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-500">#{i + 1}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-lg font-bold text-white">{pol.trade_count}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Trades</div>
                </div>
                <div className="bg-emerald-500/10 rounded-lg py-2">
                  <div className="text-lg font-bold text-emerald-400">{pol.purchases}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Buys</div>
                </div>
                <div className="bg-red-500/10 rounded-lg py-2">
                  <div className="text-lg font-bold text-red-400">{pol.sales}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sells</div>
                </div>
              </div>

              <div className="flex items-center justify-end mt-3 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                View performance <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
