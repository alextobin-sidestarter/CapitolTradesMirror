import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy')
  } catch {
    return date
  }
}

export function formatDateRelative(date: string | null): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true })
  } catch {
    return date
  }
}

export function formatMoney(amount: number | null): string {
  if (amount == null) return '—'
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

export function formatAmountRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Undisclosed'
  const fmtMin = formatMoney(min)
  const fmtMax = formatMoney(max)
  if (min && max) return `${fmtMin} – ${fmtMax}`
  return fmtMin
}

export function partyColor(party: string | null): string {
  if (party === 'D') return 'text-blue-500'
  if (party === 'R') return 'text-red-500'
  return 'text-gray-400'
}

export function partyBg(party: string | null): string {
  if (party === 'D') return 'bg-blue-500'
  if (party === 'R') return 'bg-red-500'
  return 'bg-gray-400'
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function transactionColor(type: string): string {
  if (type === 'Purchase') return 'text-emerald-400'
  if (type === 'Sale') return 'text-red-400'
  return 'text-yellow-400'
}

export function transactionBadge(type: string): string {
  if (type === 'Purchase') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  if (type === 'Sale') return 'bg-red-500/20 text-red-400 border border-red-500/30'
  return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
}
