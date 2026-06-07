import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Subscribe to alerts for a politician
export async function POST(req: NextRequest) {
  const { politician_id, email } = await req.json()

  if (!politician_id || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = createServiceClient()

  const { error } = await db.from('alert_subscriptions').upsert(
    { politician_id, email: email.toLowerCase(), is_active: true },
    { onConflict: 'politician_id,email' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// Unsubscribe
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const db = createServiceClient()
  await db.from('alert_subscriptions').update({ is_active: false }).eq('unsubscribe_token', token)

  return NextResponse.json({ success: true })
}
