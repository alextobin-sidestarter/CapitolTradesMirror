'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

interface PricePoint {
  date: string
  close: number
}

interface StockChartProps {
  ticker: string
}

const RANGES = ['1W', '1M', '3M', '6M', '1Y'] as const
type Range = typeof RANGES[number]

const RANGE_DAYS: Record<Range, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365
}

export default function StockChart({ ticker }: StockChartProps) {
  const [data, setData] = useState<PricePoint[]>([])
  const [range, setRange] = useState<Range>('3M')
  const [loading, setLoading] = useState(true)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const days = RANGE_DAYS[range]
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - days)

        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]
        const fromTs = Math.floor(from.getTime() / 1000)
        const toTs = Math.floor(to.getTime() / 1000)

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${fromTs}&period2=${toTs}`
        const res = await fetch(`/api/proxy/yahoo?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('Failed')

        const json = await res.json()
        const result = json?.chart?.result?.[0]
        if (!result) return

        const timestamps: number[] = result.timestamp || []
        const closes: number[] = result.indicators?.quote?.[0]?.close || []

        const points = timestamps
          .map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            close: closes[i],
          }))
          .filter(p => p.close != null && p.close > 0)

        setData(points)
        if (points.length > 0) {
          const last = points[points.length - 1].close
          const first = points[0].close
          setCurrentPrice(last)
          setChange(((last - first) / first) * 100)
        }
      } catch (e) {
        console.error('Chart error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ticker, range])

  const isPositive = (change || 0) >= 0
  const color = isPositive ? '#10b981' : '#ef4444'

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs">
        <div className="text-gray-400">{format(parseISO(payload[0].payload.date), 'MMM d, yyyy')}</div>
        <div className="text-white font-bold">${payload[0].value?.toFixed(2)}</div>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          {currentPrice && (
            <div className="text-3xl font-bold text-white">${currentPrice.toFixed(2)}</div>
          )}
          {change !== null && (
            <div className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{change.toFixed(2)}% ({range})
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse">
          Loading chart...
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
          No price data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={192}>
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={d => format(parseISO(d), 'MMM d')}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${v.toFixed(0)}`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${ticker})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
