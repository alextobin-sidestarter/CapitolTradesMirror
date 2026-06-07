/**
 * Seed script using plain fetch — no WebSocket issues
 * Run: node scripts/seed.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates',
}

async function upsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${table}: ${err}`)
  }
  return res.json()
}

const POLITICIANS = [
  { full_name: 'Nancy Pelosi', slug: 'nancy-pelosi', party: 'D', chamber: 'House', state: 'CA', is_active: true },
  { full_name: 'Dan Crenshaw', slug: 'dan-crenshaw', party: 'R', chamber: 'House', state: 'TX', is_active: true },
  { full_name: 'Tommy Tuberville', slug: 'tommy-tuberville', party: 'R', chamber: 'Senate', state: 'AL', is_active: true },
  { full_name: 'Mark Kelly', slug: 'mark-kelly', party: 'D', chamber: 'Senate', state: 'AZ', is_active: true },
  { full_name: 'Ro Khanna', slug: 'ro-khanna', party: 'D', chamber: 'House', state: 'CA', is_active: true },
  { full_name: 'Josh Gottheimer', slug: 'josh-gottheimer', party: 'D', chamber: 'House', state: 'NJ', is_active: true },
  { full_name: 'Michael McCaul', slug: 'michael-mccaul', party: 'R', chamber: 'House', state: 'TX', is_active: true },
  { full_name: 'Marjorie Taylor Greene', slug: 'marjorie-taylor-greene', party: 'R', chamber: 'House', state: 'GA', is_active: true },
  { full_name: 'Kevin Hern', slug: 'kevin-hern', party: 'R', chamber: 'House', state: 'OK', is_active: true },
  { full_name: 'Pete Sessions', slug: 'pete-sessions', party: 'R', chamber: 'House', state: 'TX', is_active: true },
]

const TRADES_RAW = [
  { slug: 'nancy-pelosi', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 500001, max: 1000000, date: '2025-12-15', disclosed: '2025-12-28' },
  { slug: 'nancy-pelosi', ticker: 'AAPL', company: 'Apple Inc.', type: 'Purchase', min: 250001, max: 500000, date: '2025-11-20', disclosed: '2025-12-01' },
  { slug: 'nancy-pelosi', ticker: 'GOOG', company: 'Alphabet Inc.', type: 'Sale', min: 1000001, max: 5000000, date: '2025-10-10', disclosed: '2025-10-22' },
  { slug: 'nancy-pelosi', ticker: 'MSFT', company: 'Microsoft Corporation', type: 'Purchase', min: 500001, max: 1000000, date: '2025-09-05', disclosed: '2025-09-18' },
  { slug: 'dan-crenshaw', ticker: 'XOM', company: 'Exxon Mobil', type: 'Purchase', min: 15001, max: 50000, date: '2026-01-10', disclosed: '2026-01-24' },
  { slug: 'dan-crenshaw', ticker: 'CVX', company: 'Chevron Corporation', type: 'Purchase', min: 50001, max: 100000, date: '2026-01-10', disclosed: '2026-01-24' },
  { slug: 'dan-crenshaw', ticker: 'LMT', company: 'Lockheed Martin', type: 'Purchase', min: 100001, max: 250000, date: '2025-12-01', disclosed: '2025-12-15' },
  { slug: 'tommy-tuberville', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-14', disclosed: '2026-02-28' },
  { slug: 'tommy-tuberville', ticker: 'AAPL', company: 'Apple Inc.', type: 'Sale', min: 15001, max: 50000, date: '2026-01-20', disclosed: '2026-02-01' },
  { slug: 'tommy-tuberville', ticker: 'TSLA', company: 'Tesla Inc.', type: 'Purchase', min: 100001, max: 250000, date: '2025-11-15', disclosed: '2025-11-28' },
  { slug: 'mark-kelly', ticker: 'BA', company: 'Boeing Company', type: 'Purchase', min: 50001, max: 100000, date: '2026-01-05', disclosed: '2026-01-20' },
  { slug: 'mark-kelly', ticker: 'RTX', company: 'Raytheon Technologies', type: 'Purchase', min: 15001, max: 50000, date: '2025-12-10', disclosed: '2025-12-24' },
  { slug: 'ro-khanna', ticker: 'AMZN', company: 'Amazon.com Inc.', type: 'Purchase', min: 100001, max: 250000, date: '2026-02-01', disclosed: '2026-02-15' },
  { slug: 'ro-khanna', ticker: 'META', company: 'Meta Platforms', type: 'Sale', min: 250001, max: 500000, date: '2026-01-15', disclosed: '2026-01-29' },
  { slug: 'ro-khanna', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 500001, max: 1000000, date: '2025-12-20', disclosed: '2026-01-03' },
  { slug: 'josh-gottheimer', ticker: 'JPM', company: 'JPMorgan Chase', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-10', disclosed: '2026-02-24' },
  { slug: 'josh-gottheimer', ticker: 'GS', company: 'Goldman Sachs', type: 'Purchase', min: 15001, max: 50000, date: '2026-01-25', disclosed: '2026-02-08' },
  { slug: 'josh-gottheimer', ticker: 'AAPL', company: 'Apple Inc.', type: 'Sale', min: 100001, max: 250000, date: '2025-12-05', disclosed: '2025-12-19' },
  { slug: 'michael-mccaul', ticker: 'NOC', company: 'Northrop Grumman', type: 'Purchase', min: 250001, max: 500000, date: '2026-01-08', disclosed: '2026-01-22' },
  { slug: 'michael-mccaul', ticker: 'LMT', company: 'Lockheed Martin', type: 'Purchase', min: 100001, max: 250000, date: '2025-11-10', disclosed: '2025-11-24' },
  { slug: 'kevin-hern', ticker: 'MSFT', company: 'Microsoft Corporation', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-20', disclosed: '2026-03-05' },
  { slug: 'kevin-hern', ticker: 'AMZN', company: 'Amazon.com Inc.', type: 'Sale', min: 100001, max: 250000, date: '2026-01-30', disclosed: '2026-02-13' },
  { slug: 'pete-sessions', ticker: 'TSLA', company: 'Tesla Inc.', type: 'Sale', min: 50001, max: 100000, date: '2026-02-05', disclosed: '2026-02-19' },
  { slug: 'pete-sessions', ticker: 'NVDA', company: 'NVIDIA Corporation', type: 'Purchase', min: 100001, max: 250000, date: '2026-01-15', disclosed: '2026-01-29' },
  { slug: 'marjorie-taylor-greene', ticker: 'COIN', company: 'Coinbase Global', type: 'Purchase', min: 15001, max: 50000, date: '2026-03-01', disclosed: '2026-03-15' },
  { slug: 'marjorie-taylor-greene', ticker: 'MSTR', company: 'MicroStrategy Inc.', type: 'Purchase', min: 50001, max: 100000, date: '2026-02-15', disclosed: '2026-03-01' },
]

async function seed() {
  console.log('🌱 Seeding Capitol Mirror...\n')

  // Upsert politicians
  console.log('Inserting politicians...')
  const pols = await upsert('politicians', POLITICIANS)
  console.log(`✅ ${pols.length} politicians inserted\n`)

  // Build slug -> id map
  const idMap = {}
  for (const p of pols) idMap[p.slug] = p.id

  // Build trades
  const trades = TRADES_RAW
    .filter(t => idMap[t.slug])
    .map(t => ({
      politician_id: idMap[t.slug],
      ticker: t.ticker,
      company_name: t.company,
      asset_type: 'Stock',
      transaction_type: t.type,
      amount_min: t.min,
      amount_max: t.max,
      transaction_date: t.date,
      disclosure_date: t.disclosed,
      source: 'seed',
      source_id: `seed-${t.slug}-${t.ticker}-${t.date}`,
      is_verified: true,
    }))

  console.log(`Inserting ${trades.length} trades...`)
  const inserted = await upsert('trades', trades)
  console.log(`✅ ${inserted.length} trades inserted\n`)
  console.log('🎉 Done! Visit http://45.55.38.251 to see your data.')
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message)
  process.exit(1)
})
