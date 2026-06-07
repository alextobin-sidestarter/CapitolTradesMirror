'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon } from 'lucide-react'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 hidden md:block truncate max-w-[120px]">{user.email}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md text-sm transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors px-2.5 py-1.5">
        Sign in
      </Link>
      <Link href="/auth/signup" className="text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">
        Sign up
      </Link>
    </div>
  )
}
