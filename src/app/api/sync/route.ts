import { NextRequest, NextResponse } from 'next/server'
import { runFullSync } from '@/lib/sync/ingest'

export async function POST(req: NextRequest) {
  // Protect with a simple secret header
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runFullSync()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
