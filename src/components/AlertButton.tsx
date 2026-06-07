'use client'

import { useState } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'

interface AlertButtonProps {
  politicianId: string
  politicianName: string
}

export default function AlertButton({ politicianId, politicianName }: AlertButtonProps) {
  const [email, setEmail] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ politician_id: politicianId, email }),
      })

      if (res.ok) {
        setSubscribed(true)
        setShowInput(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to subscribe')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
        <Check size={14} />
        Alerts enabled
      </div>
    )
  }

  return (
    <div className="relative">
      {showInput ? (
        <form onSubmit={handleSubscribe} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoFocus
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-48"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Alert me'}
          </button>
          <button
            type="button"
            onClick={() => setShowInput(false)}
            className="px-2 py-1.5 text-gray-500 hover:text-white text-sm transition-colors"
          >
            ✕
          </button>
          {error && <p className="absolute top-full mt-1 text-xs text-red-400">{error}</p>}
        </form>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
        >
          <Bell size={14} />
          Get alerts
        </button>
      )}
    </div>
  )
}
