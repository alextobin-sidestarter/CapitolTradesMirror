'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { partyColor, partyBg } from '@/lib/utils'
import type { Politician } from '@/types'
import { Search } from 'lucide-react'

export default function PoliticiansPage() {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [chamber, setChamber] = useState('')
  const [party, setParty] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('politicians')
        .select('*')
        .eq('is_active', true)
        .order('last_name', { ascending: true })

      if (chamber) query = query.eq('chamber', chamber)
      if (party) query = query.eq('party', party)
      if (search) query = query.ilike('full_name', `%${search}%`)

      const { data } = await query
      setPoliticians(data || [])
      setLoading(false)
    }
    load()
  }, [search, chamber, party])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Politicians</h1>
        <p className="text-gray-400 text-sm mt-1">Browse all active congress members with trade activity</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-44"
          />
        </div>
        <select
          value={chamber}
          onChange={e => setChamber(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Chambers</option>
          <option value="Senate">Senate</option>
          <option value="House">House</option>
        </select>
        <select
          value={party}
          onChange={e => setParty(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Parties</option>
          <option value="D">Democrat</option>
          <option value="R">Republican</option>
          <option value="I">Independent</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-gray-500 py-16 animate-pulse">Loading...</div>
      ) : politicians.length === 0 ? (
        <div className="text-center text-gray-500 py-16">No politicians found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {politicians.map(pol => (
            <Link
              key={pol.id}
              href={`/politicians/${pol.slug}`}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-white mb-3 group-hover:bg-emerald-500/20 transition-colors">
                {pol.full_name.charAt(0)}
              </div>
              <div className="font-medium text-white text-sm group-hover:text-emerald-400 transition-colors truncate">
                {pol.full_name}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1.5">
                <span className={partyColor(pol.party)}>
                  {pol.party === 'D' ? 'Democrat' : pol.party === 'R' ? 'Republican' : 'Independent'}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{pol.chamber} · {pol.state}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
