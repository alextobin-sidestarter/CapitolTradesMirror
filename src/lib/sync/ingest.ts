/**
 * Central ingest orchestrator
 * Sources: Senate eFD, House PTR, (QuiverQuant when key available)
 * All free, no API keys required for core functionality
 */

import { createServiceClient } from '../supabase'
import { fetchSenateFilings, fetchSenateTransactions, mapSenateToDb } from './senate'
import { fetchHousePTRs, fetchHouseTransactions, mapHouseToDb } from './house'
import { fetchMultipleQuotes } from './prices'

async function upsertPolitician(db: ReturnType<typeof createServiceClient>, politicianData: any) {
  const { data, error } = await db
    .from('politicians')
    .upsert(politicianData, { onConflict: 'slug' })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

async function upsertTrade(db: ReturnType<typeof createServiceClient>, tradeData: any) {
  const { error } = await db
    .from('trades')
    .upsert(tradeData, { onConflict: 'source,source_id', ignoreDuplicates: true })

  return !error
}

export async function ingestSenate(year?: number): Promise<{ inserted: number; errors: number }> {
  const db = createServiceClient()
  let inserted = 0
  let errors = 0

  try {
    const filings = await fetchSenateFilings(year)
    console.log(`Senate: found ${filings.length} filings`)

    for (const filing of filings.slice(0, 50)) { // batch limit
      try {
        const transactions = await fetchSenateTransactions(filing)

        for (const tx of transactions) {
          if (!tx.ticker && !tx.assetName) continue

          const { politician: polData, trade: tradeData } = mapSenateToDb(filing, tx)
          const politicianId = await upsertPolitician(db, polData)
          if (!politicianId) continue

          const ok = await upsertTrade(db, { ...tradeData, politician_id: politicianId })
          if (ok) inserted++
        }

        await new Promise(r => setTimeout(r, 200)) // rate limit
      } catch (err) {
        errors++
        console.error('Senate filing error:', err)
      }
    }
  } catch (err) {
    console.error('Senate ingest error:', err)
    errors++
  }

  return { inserted, errors }
}

export async function ingestHouse(year?: number): Promise<{ inserted: number; errors: number }> {
  const db = createServiceClient()
  let inserted = 0
  let errors = 0

  try {
    const ptrs = await fetchHousePTRs(year)
    console.log(`House: found ${ptrs.length} PTRs`)

    for (const ptr of ptrs.slice(0, 50)) {
      try {
        const transactions = await fetchHouseTransactions(ptr)

        for (const tx of transactions) {
          if (!tx.ticker && !tx.assetName) continue

          const { politician: polData, trade: tradeData } = mapHouseToDb(ptr, tx)
          const politicianId = await upsertPolitician(db, polData)
          if (!politicianId) continue

          const ok = await upsertTrade(db, { ...tradeData, politician_id: politicianId })
          if (ok) inserted++
        }

        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        errors++
      }
    }
  } catch (err) {
    errors++
  }

  return { inserted, errors }
}

export async function syncStockPrices(): Promise<{ updated: number }> {
  const db = createServiceClient()

  // Get all unique tickers from trades
  const { data: trades } = await db
    .from('trades')
    .select('ticker')
    .not('ticker', 'is', null)

  const tickers = [...new Set((trades || []).map(t => t.ticker).filter(Boolean))] as string[]
  if (!tickers.length) return { updated: 0 }

  // Batch fetch from Yahoo Finance (50 at a time)
  let updated = 0
  for (let i = 0; i < tickers.length; i += 50) {
    const batch = tickers.slice(i, i + 50)
    const quotes = await fetchMultipleQuotes(batch)

    for (const [ticker, quote] of quotes) {
      const { error } = await db.from('stock_prices').upsert({
        ticker,
        date: quote.date,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.price,
        volume: quote.volume,
      }, { onConflict: 'ticker,date' })

      if (!error) updated++
    }

    await new Promise(r => setTimeout(r, 500))
  }

  return { updated }
}

export async function runFullSync(year?: number) {
  const db = createServiceClient()

  const { data: log } = await db
    .from('sync_log')
    .insert({ source: 'full', status: 'running' })
    .select('id')
    .single()

  try {
    console.log('Starting full sync...')

    const [senateResult, houseResult] = await Promise.allSettled([
      ingestSenate(year),
      ingestHouse(year),
    ])

    const senate = senateResult.status === 'fulfilled' ? senateResult.value : { inserted: 0, errors: 1 }
    const house = houseResult.status === 'fulfilled' ? houseResult.value : { inserted: 0, errors: 1 }

    // Sync stock prices for all tickers we now have
    const prices = await syncStockPrices()

    const totalInserted = senate.inserted + house.inserted

    if (log) {
      await db.from('sync_log').update({
        status: 'success',
        records_inserted: totalInserted,
        completed_at: new Date().toISOString(),
      }).eq('id', log.id)
    }

    return {
      success: true,
      senate: senate.inserted,
      house: house.inserted,
      prices: prices.updated,
      total: totalInserted,
    }
  } catch (err) {
    if (log) {
      await db.from('sync_log').update({
        status: 'error',
        error_message: String(err),
        completed_at: new Date().toISOString(),
      }).eq('id', log.id)
    }
    throw err
  }
}
