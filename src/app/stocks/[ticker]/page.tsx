import { getStockTrades } from '@/lib/data'
import { formatDate, formatAmountRange, transactionBadge, partyColor } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import StockChart from '@/components/StockChart'

export const revalidate = 300

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const tickerUpper = ticker.toUpperCase()
  const trades = await getStockTrades(tickerUpper)

  const purchases = trades.filter(t => t.transaction_type === 'Purchase')
  const sales = trades.filter(t => t.transaction_type === 'Sale')
  const companyName = trades[0]?.company_name || tickerUpper

  const politicianMap = new Map<string, { pol: typeof trades[0]['politicians']; buys: number; sells: number }>()
  for (const trade of trades) {
    const pol = trade.politicians
    if (!pol) continue
    const existing = politicianMap.get(pol.id) || { pol, buys: 0, sells: 0 }
    if (trade.transaction_type === 'Purchase') existing.buys++
    if (trade.transaction_type === 'Sale') existing.sells++
    politicianMap.set(pol.id, existing)
  }
  const politiciansSorted = Array.from(politicianMap.values())
    .sort((a, b) => (b.buys + b.sells) - (a.buys + a.sells))

  return (
    <div className="space-y-8">
      <Link href="/stocks" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
        <ArrowLeft size={14} /> All Stocks
      </Link>

      {/* Header */}
      <div className="flex items-end gap-4">
        <div>
          <h1 className="text-4xl font-mono font-bold text-white">{tickerUpper}</h1>
          <p className="text-gray-400 mt-1">{companyName}</p>
        </div>
        <div className="flex gap-4 mb-1 text-sm">
          <span className="flex items-center gap-1 text-emerald-400">
            <TrendingUp size={14} /> {purchases.length} buys
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <TrendingDown size={14} /> {sales.length} sells
          </span>
        </div>
      </div>

      {/* Price chart */}
      <StockChart ticker={tickerUpper} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Trades</div>
          <div className="text-2xl font-bold text-white">{trades.length}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Purchases</div>
          <div className="text-2xl font-bold text-emerald-400">{purchases.length}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sales</div>
          <div className="text-2xl font-bold text-red-400">{sales.length}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-8">
        {/* Trade history */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Trade History</h2>
          <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_130px_110px] gap-4 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
              <div>Politician</div>
              <div>Type</div>
              <div className="text-right">Amount</div>
              <div className="text-right">Trade Date</div>
            </div>

            {trades.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No trades found for {tickerUpper}.</div>
            ) : (
              trades.map(trade => (
                <div key={trade.id} className="grid grid-cols-[1fr_100px_130px_110px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                      {trade.politicians?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/politicians/${trade.politicians?.slug}`} className="text-white hover:text-emerald-400 transition-colors truncate block">
                        {trade.politicians?.full_name}
                      </Link>
                      <div className="text-xs text-gray-500">
                        <span className={partyColor(trade.politicians?.party || null)}>{trade.politicians?.party}</span>
                        {' · '}{trade.politicians?.chamber}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${transactionBadge(trade.transaction_type)}`}>
                      {trade.transaction_type}
                    </span>
                  </div>
                  <div className="text-gray-300 text-right">{formatAmountRange(trade.amount_min, trade.amount_max)}</div>
                  <div className="text-gray-500 text-right">{formatDate(trade.transaction_date)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Politicians sidebar */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Traders ({politiciansSorted.length})</h2>
          <div className="space-y-2">
            {politiciansSorted.map(({ pol, buys, sells }) => (
              <Link
                key={pol.id}
                href={`/politicians/${pol.slug}`}
                className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-emerald-500/20">
                  {pol.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-emerald-400 truncate">{pol.full_name}</div>
                  <div className="text-xs text-gray-500">
                    <span className={partyColor(pol.party || null)}>{pol.party}</span> · {pol.chamber}
                  </div>
                </div>
                <div className="text-xs flex gap-2 shrink-0">
                  {buys > 0 && <span className="text-emerald-400">↑{buys}</span>}
                  {sells > 0 && <span className="text-red-400">↓{sells}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
