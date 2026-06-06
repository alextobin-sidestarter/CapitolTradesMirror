'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatAmountRange, partyColor } from '@/lib/utils'
import type { Politician, TradeWithPolitician } from '@/types'
import { Plus, X, TrendingUp, TrendingDown, Briefcase } from 'lucide-react'

export default function PortfolioPage() {
  const [watchlist, setWatchlist] = useState<string[]>([]) // politician IDs
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [recentTrades, setRecentTrades] = useState<TradeWithPolitician[]>([])
  const [allPoliticians, setAllPoliticians] = useState<Politician[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Load saved watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cm_watchlist')
    if (saved) setWatchlist(JSON.parse(saved))
  }, [])

  // Fetch all politicians for search
  useEffect(() => {
    supabase.from('politicians').select('*').eq('is_active', true).order('last_name')
      .then(({ data }) => setAllPoliticians(data || []))
  }, [])

  // Load watchlist politicians + their recent trades
  useEffect(() => {
    if (!watchlist.length) {
      setPoliticians([])
      setRecentTrades([])
      return
    }
    setLoading(true)

    Promise.all([
      supabase.from('politicians').select('*').in('id', watchlist),
      supabase.from('trades')
        .select('*, politicians(*)')
        .in('politician_id', watchlist)
        .order('transaction_date', { ascending: false })
        .limit(50),
    ]).then(([pols, trades]) => {
      setPoliticians(pols.data || [])
      setRecentTrades((trades.data as TradeWithPolitician[]) || [])
      setLoading(false)
    })
  }, [watchlist])

  function addToWatchlist(id: string) {
    const updated = watchlist.includes(id) ? watchlist : [...watchlist, id]
    setWatchlist(updated)
    localStorage.setItem('cm_watchlist', JSON.stringify(updated))
  }

  function removeFromWatchlist(id: string) {
    const updated = watchlist.filter(w => w !== id)
    setWatchlist(updated)
    localStorage.setItem('cm_watchlist', JSON.stringify(updated))
  }

  const filtered = search
    ? allPoliticians.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : []

  const purchases = recentTrades.filter(t => t.transaction_type === 'Purchase')
  const sales = recentTrades.filter(t => t.transaction_type === 'Sale')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Mirror Portfolio</h1>
        <p className="text-gray-400 text-sm mt-1">
          Follow congress members and track what they're buying and selling
        </p>
      </div>

      {/* Add politicians */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Plus size={14} className="text-emerald-400" /> Add Politicians to Mirror
        </h2>
        <input
          type="text"
          placeholder="Search politicians by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
        {filtered.length > 0 && (
          <div className="mt-2 space-y-1">
            {filtered.map(pol => (
              <button
                key={pol.id}
                onClick={() => { addToWatchlist(pol.id); setSearch('') }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                  {pol.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-white">{pol.full_name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    <span className={partyColor(pol.party || null)}>{pol.party}</span> · {pol.chamber} · {pol.state}
                  </span>
                </div>
                {watchlist.includes(pol.id) && (
                  <span className="text-xs text-emerald-400">Already following</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Currently following */}
      {watchlist.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Following ({watchlist.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {politicians.map(pol => (
              <div
                key={pol.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm"
              >
                <span className={partyColor(pol.party || null)}>●</span>
                <Link href={`/politicians/${pol.slug}`} className="text-white hover:text-emerald-400 transition-colors">
                  {pol.full_name}
                </Link>
                <button
                  onClick={() => removeFromWatchlist(pol.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-1"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recent Trades</div>
            <div className="text-2xl font-bold text-white">{recentTrades.length}</div>
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
      )}

      {/* Trade feed for mirrored politicians */}
      {watchlist.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Their Recent Activity</h2>
          {loading ? (
            <div className="text-center text-gray-500 py-12 animate-pulse">Loading trades...</div>
          ) : recentTrades.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No trades found for your followed politicians.</div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_100px_130px_110px] gap-4 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
                <div>Politician</div>
                <div>Stock</div>
                <div>Type</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Date</div>
              </div>
              {recentTrades.map(trade => {
                const pol = trade.politicians
                return (
                  <div key={trade.id} className="grid grid-cols-[1fr_100px_100px_130px_110px] gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm items-center">
                    <Link href={`/politicians/${pol?.slug}`} className="text-white hover:text-emerald-400 transition-colors truncate">
                      {pol?.full_name}
                    </Link>
                    <div className="font-mono font-bold">
                      {trade.ticker ? (
                        <Link href={`/stocks/${trade.ticker}`} className="text-white hover:text-emerald-400">{trade.ticker}</Link>
                      ) : <span className="text-gray-500">—</span>}
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${trade.transaction_type === 'Purchase' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {trade.transaction_type}
                      </span>
                    </div>
                    <div className="text-gray-300 text-right">{formatAmountRange(trade.amount_min, trade.amount_max)}</div>
                    <div className="text-gray-500 text-right">{formatDate(trade.transaction_date)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {watchlist.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Briefcase size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-400">No politicians followed yet</p>
          <p className="text-sm mt-1">Search above to add congress members to your mirror portfolio</p>
        </div>
      )}
    </div>
  )
}
