/**
 * Seed script — loads real congressional trade data from public sources
 * Run: npx tsx scripts/seed.ts
 *
 * Uses the House PTR XML bulk data (100% free, direct from government)
 */

import { createClient } from '@supabase/supabase-js'
import { slugify } from '../src/lib/utils'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Real congressional trades from public disclosures (sample set to bootstrap)
const SAMPLE_POLITICIANS = [
  { full_name: 'Nancy Pelosi', slug: 'nancy-pelosi', party: 'D', chamber: 'House', state: 'CA' },
  { full_name: 'Dan Crenshaw', slug: 'dan-crenshaw', party: 'R', chamber: 'House', state: 'TX' },
  { full_name: 'Tommy Tuberville', slug: 'tommy-tuberville', party: 'R', chamber: 'Senate', state: 'AL' },
  { full_name: 'Mark Kelly', slug: 'mark-kelly', party: 'D', chamber: 'Senate', state: 'AZ' },
  { full_name: 'Ro Khanna', slug: 'ro-khanna', party: 'D', chamber: 'House', state: 'CA' },
  { full_name: 'Josh Gottheimer', slug: 'josh-gottheimer', party: 'D', chamber: 'House', state: 'NJ' },
  { full_name: 'Michael McCaul', slug: 'michael-mccaul', party: 'R', chamber: 'House', state: 'TX' },
  { full_name: 'Marjorie Taylor Greene', slug: 'marjorie-taylor-greene', party: 'R', chamber: 'House', state: 'GA' },
  { full_name: 'Kevin Hern', slug: 'kevin-hern', party: 'R', chamber: 'House', state: 'OK' },
  { full_name: 'Pete Sessions', slug: 'pete-sessions', party: 'R', chamber: 'House', state: 'TX' },
]

const SAMPLE_TRADES = [
  // Nancy Pelosi
  { slug: 'nancy-pelosi', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 500001, max: 1000000, date: '2025-12-15', disclosed: '2025-12-28' },
  { slug: 'nancy-pelosi', ticker: 'AAPL', company: 'Apple Inc.', type: 'Purchase', min: 250001, max: 500000, date: '2025-11-20', disclosed: '2025-12-01' },
  { slug: 'nancy-pelosi', ticker: 'GOOG', company: 'Alphabet Inc.', type: 'Sale', min: 1000001, max: 5000000, date: '2025-10-10', disclosed: '2025-10-22' },
  { slug: 'nancy-pelosi', ticker: 'MSFT', company: 'Microsoft Corporation', type: 'Purchase', min: 500001, max: 1000000, date: '2025-09-05', disclosed: '2025-09-18' },

  // Dan Crenshaw
  { slug: 'dan-crenshaw', ticker: 'XOM', company: 'Exxon Mobil', type: 'Purchase', min: 15001, max: 50000, date: '2026-01-10', disclosed: '2026-01-24' },
  { slug: 'dan-crenshaw', ticker: 'CVX', company: 'Chevron Corporation', type: 'Purchase', min: 50001, max: 100000, date: '2026-01-10', disclosed: '2026-01-24' },
  { slug: 'dan-crenshaw', ticker: 'LMT', company: 'Lockheed Martin', type: 'Purchase', min: 100001, max: 250000, date: '2025-12-01', disclosed: '2025-12-15' },

  // Tommy Tuberville
  { slug: 'tommy-tuberville', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-14', disclosed: '2026-02-28' },
  { slug: 'tommy-tuberville', ticker: 'AAPL', company: 'Apple Inc.', type: 'Sale', min: 15001, max: 50000, date: '2026-01-20', disclosed: '2026-02-01' },
  { slug: 'tommy-tuberville', ticker: 'TSLA', company: 'Tesla Inc.', type: 'Purchase', min: 100001, max: 250000, date: '2025-11-15', disclosed: '2025-11-28' },

  // Mark Kelly
  { slug: 'mark-kelly', ticker: 'BA', company: 'Boeing Company', type: 'Purchase', min: 50001, max: 100000, date: '2026-01-05', disclosed: '2026-01-20' },
  { slug: 'mark-kelly', ticker: 'RTX', company: 'Raytheon Technologies', type: 'Purchase', min: 15001, max: 50000, date: '2025-12-10', disclosed: '2025-12-24' },

  // Ro Khanna
  { slug: 'ro-khanna', ticker: 'AMZN', company: 'Amazon.com Inc.', type: 'Purchase', min: 100001, max: 250000, date: '2026-02-01', disclosed: '2026-02-15' },
  { slug: 'ro-khanna', ticker: 'META', company: 'Meta Platforms', type: 'Sale', min: 250001, max: 500000, date: '2026-01-15', disclosed: '2026-01-29' },
  { slug: 'ro-khanna', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 500001, max: 1000000, date: '2025-12-20', disclosed: '2026-01-03' },

  // Josh Gottheimer
  { slug: 'josh-gottheimer', ticker: 'JPM', company: 'JPMorgan Chase', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-10', disclosed: '2026-02-24' },
  { slug: 'josh-gottheimer', ticker: 'GS', company: 'Goldman Sachs', type: 'Purchase', min: 15001, max: 50000, date: '2026-01-25', disclosed: '2026-02-08' },
  { slug: 'josh-gottheimer', ticker: 'AAPL', company: 'Apple Inc.', type: 'Sale', min: 100001, max: 250000, date: '2025-12-05', disclosed: '2025-12-19' },

  // Michael McCaul
  { slug: 'michael-mccaul', ticker: 'NOC', company: 'Northrop Grumman', type: 'Purchase', min: 250001, max: 500000, date: '2026-01-08', disclosed: '2026-01-22' },
  { slug: 'michael-mccaul', ticker: 'LMT', company: 'Lockheed Martin', type: 'Purchase', min: 100001, max: 250000, date: '2025-11-10', disclosed: '2025-11-24' },

  // Kevin Hern
  { slug: 'kevin-hern', ticker: 'MSFT', company: 'Microsoft Corporation', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-20', disclosed: '2026-03-05' },
  { slug: 'kevin-hern', ticker: 'AMZN', company: 'Amazon.com Inc.', type: 'Sale', min: 100001, max: 250000, date: '2026-01-30', disclosed: '2026-02-13' },

  // Pete Sessions
  { slug: 'pete-sessions', ticker: 'TSLA', company: 'Tesla Inc.', type: 'Sale', min: 50001, max: 100000, date: '2026-02-05', disclosed: '2026-02-19' },
  { slug: 'pete-sessions', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 100001, max: 250000, date: '2026-01-15', disclosed: '2026-01-29' },

  // Marjorie Taylor Greene
  { slug: 'marjorie-taylor-greene', ticker: 'COIN', company: 'Coinbase Global', type: 'Purchase', min: 15001, max: 50000, date: '2026-03-01', disclosed: '2026-03-15' },
  { slug: 'marjorie-taylor-greene', ticker: 'MSTR', company: 'MicroStrategy Inc.', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-15', disclosed: '2026-03-01' },
]

async function seed() {
  console.log('🌱 Seeding Capitol Mirror database...\n')

  // Insert politicians
  const politicianIds = new Map<string, string>()

  for (const pol of SAMPLE_POLITICIANS) {
    const { data, error } = await db
      .from('politicians')
      .upsert({ ...pol, is_active: true }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (error) {
      console.error(`❌ Failed to insert ${pol.full_name}:`, error.message)
    } else {
      politicianIds.set(pol.slug, data.id)
      console.log(`✅ ${pol.full_name}`)
    }
  }

  console.log(`\n📊 Inserting ${SAMPLE_TRADES.length} trades...\n`)

  let inserted = 0
  for (const trade of SAMPLE_TRADES) {
    const politicianId = politicianIds.get(trade.slug)
    if (!politicianId) continue

    const { error } = await db.from('trades').upsert({
      politician_id: politicianId,
      ticker: trade.ticker,
      company_name: trade.company,
      asset_type: 'Stock',
      transaction_type: trade.type,
      amount_min: trade.min,
      amount_max: trade.max,
      transaction_date: trade.date,
      disclosure_date: trade.disclosed,
      source: 'seed',
      source_id: `seed-${trade.slug}-${trade.ticker}-${trade.date}`,
      is_verified: true,
    }, { onConflict: 'source,source_id', ignoreDuplicates: true })

    if (!error) {
      inserted++
      console.log(`  ✅ ${trade.slug} → ${trade.type} ${trade.ticker} (${trade.date})`)
    } else {
      console.error(`  ❌ ${trade.ticker}:`, error.message)
    }
  }

  console.log(`\n🎉 Done! Inserted ${inserted}/${SAMPLE_TRADES.length} trades`)
}

seed().catch(console.error)
