import { notFound } from 'next/navigation'
import { getPolitician, getPoliticianTrades } from '@/lib/data'
import { formatDate, formatAmountRange, transactionBadge, partyColor } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import AlertButton from '@/components/AlertButton'

export const revalidate = 300

export default async function PoliticianPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [politician, trades] = await Promise.all([
    getPolitician(slug),
    getPolitician(slug).then(p => p ? getPoliticianTrades(p.id) : []),
  ])

  if (!politician) notFound()

  const purchases = trades.filter(t => t.transaction_type === 'Purchase')
  const sales = trades.filter(t => t.transaction_type === 'Sale')
  const tickers = [...new Set(trades.map(t => t.ticker).filter(Boolean))]

  const totalMin = trades.reduce((sum, t) => sum + (t.amount_min || 0), 0)
  const totalMax = trades.reduce((sum, t) => sum + (t.amount_max || 0), 0)

  return (
    <div className="space-y-8">
      <Link href="/politicians" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
        <ArrowLeft size={14} /> All Politicians
      </Link>

      {/* Profile header */}
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold text-white shrink-0">
          {politician.full_name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-white">{politician.full_name}</h1>
            <AlertButton politicianId={politician.id} politicianName={politician.full_name} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className={`font-semibold ${partyColor(politician.party)}`}>
              {politician.party === 'D' ? 'Democrat' : politician.party === 'R' ? 'Republican' : 'Independent'}
            </span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400">{politician.chamber}</span>
            {politician.state && (
              <>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">{politician.state}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unique Stocks</div>
          <div className="text-2xl font-bold text-white">{tickers.length}</div>
        </div>
      </div>

      {/* Trades table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Trade History ({trades.length})</h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_120px_130px_110px] gap-4 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
            <div>Stock</div>
            <div>Company</div>
            <div>Type</div>
            <div className="text-right">Amount</div>
            <div className="text-right">Trade Date</div>
          </div>

          {trades.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">No trades on record.</div>
          ) : (
            trades.map(trade => (
              <div key={trade.id} className="grid grid-cols-[100px_1fr_120px_130px_110px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm items-center">
                <div>
                  {trade.ticker ? (
                    <Link href={`/stocks/${trade.ticker}`} className="font-mono font-bold text-white hover:text-emerald-400">
                      {trade.ticker}
                    </Link>
                  ) : <span className="text-gray-500">—</span>}
                </div>
                <div className="text-gray-400 truncate">{trade.company_name || '—'}</div>
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
    </div>
  )
}
