'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import TradeRow from '@/components/TradeRow'
import type { TradeWithPolitician } from '@/types'
import { Search, Filter } from 'lucide-react'

const PAGE_SIZE = 50

export default function FeedPage() {
  const [trades, setTrades] = useState<TradeWithPolitician[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    transaction_type: '',
    chamber: '',
    party: '',
    ticker: '',
  })

  const fetchTrades = useCallback(async (p: number) => {
    setLoading(true)
    let query = supabase
      .from('trades')
      .select('*, politicians(*)', { count: 'exact' })
      .order('disclosure_date', { ascending: false })
      .order('transaction_date', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

    if (filters.transaction_type) query = query.eq('transaction_type', filters.transaction_type)
    if (filters.ticker) query = query.ilike('ticker', `%${filters.ticker}%`)

    const { data, count: total } = await query
    setTrades((data as TradeWithPolitician[]) || [])
    setCount(total || 0)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    setPage(0)
    fetchTrades(0)
  }, [filters, fetchTrades])

  useEffect(() => {
    fetchTrades(page)
  }, [page, fetchTrades])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trade Feed</h1>
        <p className="text-gray-400 text-sm mt-1">
          All congressional stock disclosures — {count.toLocaleString()} trades tracked
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by ticker..."
            value={filters.ticker}
            onChange={e => setFilters(f => ({ ...f, ticker: e.target.value }))}
            className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-40"
          />
        </div>

        <select
          value={filters.transaction_type}
          onChange={e => setFilters(f => ({ ...f, transaction_type: e.target.value }))}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Types</option>
          <option value="Purchase">Purchases</option>
          <option value="Sale">Sales</option>
          <option value="Exchange">Exchanges</option>
        </select>

        {(filters.transaction_type || filters.ticker) && (
          <button
            onClick={() => setFilters({ transaction_type: '', chamber: '', party: '', ticker: '' })}
            className="text-xs text-gray-500 hover:text-white px-2 py-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_130px_110px] gap-4 px-4 py-2.5 text-xs text-gray-500 uppercase tracking-wider border-b border-white/10">
          <div>Politician</div>
          <div>Stock</div>
          <div>Type</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Trade Date</div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 animate-pulse">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No trades found.</div>
        ) : (
          trades.map(trade => <TradeRow key={trade.id} trade={trade} />)
        )}
      </div>

      {/* Pagination */}
      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} of {count.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= count}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
