import Link from 'next/link'
import { formatDate, formatAmountRange, transactionBadge, partyColor } from '@/lib/utils'
import type { TradeWithPolitician } from '@/types'

interface TradeRowProps {
  trade: TradeWithPolitician
}

export default function TradeRow({ trade }: TradeRowProps) {
  const pol = trade.politicians

  return (
    <div className="grid grid-cols-[1fr_120px_100px_130px_110px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm items-center">
      {/* Politician */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
          {pol?.full_name?.charAt(0) || '?'}
        </div>
        <div className="min-w-0">
          <Link
            href={`/politicians/${pol?.slug || ''}`}
            className="font-medium text-white hover:text-emerald-400 transition-colors truncate block"
          >
            {pol?.full_name || 'Unknown'}
          </Link>
          <div className="text-xs text-gray-500 flex gap-1.5">
            <span className={partyColor(pol?.party || null)}>{pol?.party}</span>
            <span>·</span>
            <span>{pol?.chamber}</span>
            {pol?.state && <><span>·</span><span>{pol.state}</span></>}
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="min-w-0">
        {trade.ticker ? (
          <Link
            href={`/stocks/${trade.ticker}`}
            className="font-mono font-bold text-white hover:text-emerald-400 transition-colors"
          >
            {trade.ticker}
          </Link>
        ) : (
          <span className="text-gray-500 italic text-xs truncate block">{trade.company_name || '—'}</span>
        )}
        {trade.ticker && trade.company_name && (
          <div className="text-xs text-gray-500 truncate">{trade.company_name}</div>
        )}
      </div>

      {/* Type */}
      <div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${transactionBadge(trade.transaction_type)}`}>
          {trade.transaction_type}
        </span>
      </div>

      {/* Amount */}
      <div className="text-gray-300 text-right">
        {formatAmountRange(trade.amount_min, trade.amount_max)}
      </div>

      {/* Date */}
      <div className="text-gray-500 text-right">
        {formatDate(trade.transaction_date)}
      </div>
    </div>
  )
}
