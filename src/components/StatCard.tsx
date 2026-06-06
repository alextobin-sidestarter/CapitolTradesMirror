import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'blue' | 'default'
}

export default function StatCard({ label, value, sub, accent = 'default' }: StatCardProps) {
  const accentClass = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    default: 'text-white',
  }[accent]

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={cn('text-3xl font-bold tabular-nums', accentClass)}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}
