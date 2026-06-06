/**
 * Central ingest orchestrator — merges data from multiple sources,
 * deduplicates by (source, source_id), and upserts to Supabase.
 */

import { createServiceClient } from '../supabase'
import { fetchCapitalTradesPage, mapToDbTrade } from './capitaltrades'
import { fetchQuiverQuant, mapQuiverToDb } from './quiverquant'

export async function ingestCapitalTrades(maxPages = 5) {
  const db = createServiceClient()
  let inserted = 0
  let updated = 0

  for (let page = 1; page <= maxPages; page++) {
    const response = await fetchCapitalTradesPage(page)
    const { data: transactions } = response

    if (!transactions.length) break

    for (const tx of transactions) {
      const { politician: politicianData, trade: tradeData } = mapToDbTrade(tx)

      // Upsert politician
      const { data: politician, error: polError } = await db
        .from('politicians')
        .upsert(politicianData, { onConflict: 'slug' })
        .select('id')
        .single()

      if (polError || !politician) continue

      // Upsert trade
      const { error: tradeError, data: trade } = await db
        .from('trades')
        .upsert(
          { ...tradeData, politician_id: politician.id },
          { onConflict: 'source,source_id', ignoreDuplicates: false }
        )
        .select('id')
        .single()

      if (!tradeError && trade) inserted++
    }

    // Stop if we've hit the last page
    if (page >= response.meta.totalPages) break

    // Respect rate limits
    await new Promise(r => setTimeout(r, 300))
  }

  return { inserted, updated }
}

export async function ingestQuiverQuant() {
  const db = createServiceClient()
  let inserted = 0

  for (const chamber of ['senate', 'house'] as const) {
    const trades = await fetchQuiverQuant(chamber)

    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i]
      const sourceId = `qv-${chamber}-${trade.Date}-${trade.Ticker}-${i}`
      const { politician: politicianData, trade: tradeData } = mapQuiverToDb(trade, sourceId)

      const { data: politician, error: polError } = await db
        .from('politicians')
        .upsert(politicianData, { onConflict: 'slug' })
        .select('id')
        .single()

      if (polError || !politician) continue

      const { error } = await db
        .from('trades')
        .upsert(
          { ...tradeData, politician_id: politician.id },
          { onConflict: 'source,source_id', ignoreDuplicates: true }
        )

      if (!error) inserted++
    }
  }

  return { inserted }
}

export async function runFullSync() {
  const db = createServiceClient()

  const logEntry = await db
    .from('sync_log')
    .insert({ source: 'full', status: 'running' })
    .select('id')
    .single()

  try {
    const [ct, qv] = await Promise.allSettled([
      ingestCapitalTrades(10),
      ingestQuiverQuant(),
    ])

    const ctResult = ct.status === 'fulfilled' ? ct.value : { inserted: 0, updated: 0 }
    const qvResult = qv.status === 'fulfilled' ? qv.value : { inserted: 0 }

    const total = ctResult.inserted + qvResult.inserted

    if (logEntry.data) {
      await db.from('sync_log').update({
        status: 'success',
        records_inserted: total,
        completed_at: new Date().toISOString(),
      }).eq('id', logEntry.data.id)
    }

    return { success: true, inserted: total }
  } catch (err) {
    if (logEntry.data) {
      await db.from('sync_log').update({
        status: 'error',
        error_message: String(err),
        completed_at: new Date().toISOString(),
      }).eq('id', logEntry.data.id)
    }
    throw err
  }
}
