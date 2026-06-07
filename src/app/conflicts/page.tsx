import { getAllPoliticians, getPoliticianTrades } from '@/lib/data'
import Link from 'next/link'
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react'
import { calculateConflictScore, KNOWN_COMMITTEES } from '@/lib/analysis/conflicts'
import { formatDate, formatAmountRange, partyColor } from '@/lib/utils'

export const revalidate = 3600

const SEVERITY_COLOR = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export default async function ConflictsPage() {
  const politicians = await getAllPoliticians()

  // Analyze each politician's trades against their committees
  const allConflicts: {
    politician: (typeof politicians)[number]
    trade: {
      id: string
      ticker: string | null
      company_name: string | null
      transaction_type: string
      disclosure_date: string | null
      amount_min: number | null
      amount_max: number | null
    }
    score: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    committee: string
    role: string
    sectors: string[]
    explanation: string
  }[] = []

  for (const pol of politicians) {
    const committees = KNOWN_COMMITTEES[pol.slug] || []
    if (!committees.length) continue

    const trades = await getPoliticianTrades(pol.id)

    for (const trade of trades) {
      if (!trade.ticker) continue

      const conflicts = calculateConflictScore(
        trade.ticker,
        trade.transaction_type,
        trade.amount_max,
        committees
      )

      if (conflicts.length === 0) continue

      const top = conflicts[0]
      if (top.score < 20) continue

      allConflicts.push({
        politician: pol,
        trade,
        score: top.score,
        severity: top.severity,
        committee: top.committee_name,
        role: top.committee_role,
        sectors: top.overlap_sectors,
        explanation: top.explanation,
      })
    }
  }

  allConflicts.sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.score - a.score
  )

  const criticalCount = allConflicts.filter(c => c.severity === 'critical').length
  const highCount = allConflicts.filter(c => c.severity === 'high').length

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8">
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-3">
          <ShieldAlert size={16} />
          Conflict of Interest Analysis
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Committee Power vs Stock Trades
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Cross-referencing committee assignments with stock trades to surface potential conflicts of interest.
          A conflict exists when a member trades stocks in industries they directly oversee through committee work.
        </p>
        <div className="flex flex-wrap gap-4 mt-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm">
            <span className="text-red-400 font-bold">{criticalCount}</span>
            <span className="text-gray-400 ml-1">Critical</span>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2 text-sm">
            <span className="text-orange-400 font-bold">{highCount}</span>
            <span className="text-gray-400 ml-1">High</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm">
            <span className="text-white font-bold">{allConflicts.length}</span>
            <span className="text-gray-400 ml-1">Total Flagged Trades</span>
          </div>
        </div>
      </div>

      {/* Methodology callout */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 flex gap-3 text-sm text-gray-400">
        <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div>
          <span className="text-white font-medium">Methodology: </span>
          Conflict scores (0-100) are based on committee sector overlap, member role (Chair +30pts, Ranking Member +20pts),
          and trade size. Scores ≥75 are Critical, ≥50 High, ≥25 Medium. This is for informational purposes only.
        </div>
      </div>

      {/* Conflicts list */}
      {allConflicts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No conflicts detected with current trade data.
          <br />
          <span className="text-xs">Run a sync or add more data to analyze.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {allConflicts.map((conflict, i) => (
            <div
              key={`${conflict.politician.id}-${conflict.trade.id || i}`}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                {/* Left: politician + trade */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {conflict.politician.full_name.charAt(0)}
                  </div>
                  <div>
                    <Link href={`/politicians/${conflict.politician.slug}`} className="font-semibold text-white hover:text-emerald-400 transition-colors">
                      {conflict.politician.full_name}
                    </Link>
                    <div className="text-xs text-gray-500">
                      <span className={partyColor(conflict.politician.party || null)}>
                        {conflict.politician.party === 'D' ? 'Democrat' : conflict.politician.party === 'R' ? 'Republican' : 'Independent'}
                      </span>
                      {' · '}{conflict.politician.state}{' · '}{conflict.politician.chamber}
                    </div>
                  </div>
                </div>

                {/* Right: severity badge + score */}
                <div className="flex items-center gap-2">
                  <div className={`text-xs px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${SEVERITY_COLOR[conflict.severity]}`}>
                    {conflict.severity}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                    {conflict.score}
                  </div>
                </div>
              </div>

              {/* Trade info */}
              <div className="grid sm:grid-cols-[1fr_auto] gap-3 mb-3">
                <div className="bg-white/5 rounded-lg px-3 py-2 text-sm">
                  <span className={`font-medium ${conflict.trade.transaction_type === 'Purchase' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {conflict.trade.transaction_type === 'Purchase' ? '↑ Bought' : '↓ Sold'}
                  </span>
                  {' '}
                  <Link href={`/stocks/${conflict.trade.ticker}`} className="font-mono font-bold text-white hover:text-emerald-400">
                    {conflict.trade.ticker}
                  </Link>
                  {' '}
                  <span className="text-gray-400">({conflict.trade.company_name})</span>
                  {conflict.trade.amount_max && (
                    <span className="text-gray-400 ml-2">
                      · {formatAmountRange(conflict.trade.amount_min, conflict.trade.amount_max)}
                    </span>
                  )}
                  {conflict.trade.disclosure_date && (
                    <span className="text-gray-500 ml-2">· {formatDate(conflict.trade.disclosure_date)}</span>
                  )}
                </div>
              </div>

              {/* Committee + overlap sectors */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1 text-xs text-orange-300">
                  {conflict.role} — {conflict.committee} Committee
                </div>
                {conflict.sectors.map(s => (
                  <div key={s} className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-gray-400">
                    {s}
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <p className="text-sm text-gray-400 leading-relaxed">
                <AlertTriangle size={12} className="inline text-yellow-400 mr-1 -mt-0.5" />
                {conflict.explanation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
