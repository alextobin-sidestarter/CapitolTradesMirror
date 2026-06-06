import { getDashboardStats, getRecentTrades, getTopStocks } from '@/lib/data'
import StatCard from '@/components/StatCard'
import TradeRow from '@/components/TradeRow'
import Link from 'next/link'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

export const revalidate = 300 // 5 min cache

export default async function DashboardPage() {
  const [stats, { trades }, topStocks] = await Promise.all([
    getDashboardStats(),
    getRecentTrades(10),
    getTopStocks(10),
  ])

  const buyRatio = stats.total_trades > 0
    ? Math.round((stats.recent_purchases / stats.total_trades) * 100)
    : 0

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          <span className="text-emerald-400">Capitol</span> Mirror
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Real-time congressional stock trade tracker — STOCK Act disclosures from Senate & House
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Trades Tracked"
          value={stats.total_trades.toLocaleString()}
          sub="across all sources"
        />
        <StatCard
          label="Active Traders"
          value={stats.total_politicians.toLocaleString()}
          sub="current congress members"
        />
        <StatCard
          label="Purchases"
          value={stats.recent_purchases.toLocaleString()}
          sub={`${buyRatio}% of all trades`}
          accent="green"
        />
        <StatCard
          label="Sales"
          value={stats.recent_sales.toLocaleString()}
          sub={`${100 - buyRatio}% of all trades`}
          accent="red"
        />
      </div>

      {/* Recent trades */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Recent Disclosures</h2>
          <Link href="/feed" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_100px_130px_110px] gap-4 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
            <div>Politician</div>
            <div>Stock</div>
            <div>Type</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Trade Date</div>
          </div>

          {trades.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              No trades yet. Run a sync to populate data.
            </div>
          ) : (
            trades.map(trade => <TradeRow key={trade.id} trade={trade} />)
          )}
        </div>
      </section>

      {/* Top stocks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Most Traded Stocks</h2>
          <Link href="/stocks" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {topStocks.length === 0 ? (
            <div className="col-span-5 text-center text-gray-500 py-8">No stock data yet.</div>
          ) : (
            topStocks.map(stock => (
              <Link
                key={stock.ticker}
                href={`/stocks/${stock.ticker}`}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
              >
                <div className="font-mono font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">
                  {stock.ticker}
                </div>
                <div className="text-xs text-gray-500 truncate mb-3">{stock.company_name}</div>
                <div className="text-xs flex gap-3">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp size={10} /> {stock.buy_count}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <TrendingDown size={10} /> {stock.sell_count}
                  </span>
                  <span className="text-gray-500">{stock.trade_count} total</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
