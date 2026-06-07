'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Activity, TrendingUp, Users, BarChart3, Briefcase } from 'lucide-react'

const nav = [
  { href: '/', label: 'Home', icon: Activity },
  { href: '/feed', label: 'Feed', icon: TrendingUp },
  { href: '/politicians', label: 'Politicians', icon: Users },
  { href: '/stocks', label: 'Stocks', icon: BarChart3 },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-t border-white/10 sm:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1',
              pathname === href ? 'text-emerald-400' : 'text-gray-500'
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
