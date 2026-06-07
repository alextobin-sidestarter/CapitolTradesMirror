'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TrendingUp, Users, BarChart3, Briefcase, Activity, Trophy, ShieldAlert } from 'lucide-react'
import SearchBar from './SearchBar'
import AuthButton from './AuthButton'

const nav = [
  { href: '/', label: 'Dashboard', icon: Activity },
  { href: '/feed', label: 'Trade Feed', icon: TrendingUp },
  { href: '/politicians', label: 'Politicians', icon: Users },
  { href: '/stocks', label: 'Stocks', icon: BarChart3 },
  { href: '/copy-trading', label: 'Copy Trading', icon: Trophy },
  { href: '/conflicts', label: 'Conflicts', icon: ShieldAlert },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-white shrink-0">
          <span className="text-emerald-400 text-lg">⚖</span>
          <span className="hidden sm:block">Capitol Mirror</span>
        </Link>

        <div className="flex items-center gap-0.5 overflow-x-auto shrink-0">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                pathname === href
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={14} />
              <span className="hidden md:block">{label}</span>
            </Link>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          <SearchBar />
          <AuthButton />
        </div>
      </div>
    </nav>
  )
}
