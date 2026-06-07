'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, X } from 'lucide-react'
import { partyColor } from '@/lib/utils'

interface Result {
  type: 'politician' | 'stock'
  label: string
  sub: string
  href: string
  party?: string | null
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const [pols, trades] = await Promise.all([
          supabase
            .from('politicians')
            .select('full_name, slug, party, chamber, state')
            .ilike('full_name', `%${query}%`)
            .limit(5),
          supabase
            .from('trades')
            .select('ticker, company_name')
            .ilike('ticker', `${query}%`)
            .not('ticker', 'is', null)
            .limit(5),
        ])

        const politicianResults: Result[] = (pols.data || []).map(p => ({
          type: 'politician',
          label: p.full_name,
          sub: `${p.party === 'D' ? 'Democrat' : p.party === 'R' ? 'Republican' : 'Independent'} · ${p.chamber} · ${p.state}`,
          href: `/politicians/${p.slug}`,
          party: p.party,
        }))

        // Dedupe tickers
        const seen = new Set<string>()
        const stockResults: Result[] = []
        for (const t of trades.data || []) {
          if (!t.ticker || seen.has(t.ticker)) continue
          seen.add(t.ticker)
          stockResults.push({
            type: 'stock',
            label: t.ticker,
            sub: t.company_name || t.ticker,
            href: `/stocks/${t.ticker}`,
          })
        }

        setResults([...politicianResults, ...stockResults])
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(href: string) {
    setQuery('')
    setOpen(false)
    router.push(href)
  }

  return (
    <div ref={ref} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search politicians, stocks..."
          className="w-full pl-8 pr-8 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={12} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-[#111] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                r.type === 'stock' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
              }`}>
                {r.type === 'stock' ? '$' : r.label.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">{r.label}</div>
                <div className="text-xs text-gray-500 truncate">{r.sub}</div>
              </div>
              <div className="text-xs text-gray-600 shrink-0 ml-auto">
                {r.type === 'politician' ? 'Person' : 'Stock'}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div className="absolute top-full mt-1 w-full bg-[#111] border border-white/10 rounded-xl shadow-xl z-50 px-3 py-4 text-sm text-gray-500 text-center">
          No results for "{query}"
        </div>
      )}
    </div>
  )
}
