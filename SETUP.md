# Capitol Mirror — Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your project URL and anon key from **Settings → API**
3. Copy your service role key (keep this secret)

## 2. Run the Database Schema

In Supabase → **SQL Editor**, paste and run the contents of `supabase/schema.sql`

## 3. Configure Environment Variables

Edit `.env.local` and fill in your real values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SYNC_SECRET=some-random-string-you-choose
QUIVERQUANT_API_KEY=your-key  # free at quiverquant.com
POLYGON_API_KEY=your-key      # free tier at polygon.io
```

## 4. Get API Keys

- **QuiverQuant** (congressional trades): https://www.quiverquant.com/quiverapi/
- **Polygon.io** (stock prices): https://polygon.io/dashboard (free tier: 5 calls/min)
- **Capitol Trades** (no key needed — public API)

## 5. Run Locally

```bash
npm run dev
# → http://localhost:3000
```

## 6. Populate Initial Data

Once `.env.local` is set, trigger the first sync:

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "x-sync-secret: your-sync-secret-here"
```

This pulls from Capitol Trades API + QuiverQuant and populates your Supabase tables.

## 7. Deploy to Vercel

```bash
npx vercel
# Set the same env vars in Vercel dashboard → Settings → Environment Variables
```

## 8. Set Up Recurring Sync

In Vercel → **Cron Jobs** (or use a free service like cron-job.org):

```
POST https://your-app.vercel.app/api/sync
Header: x-sync-secret: your-sync-secret-here
Schedule: 0 */6 * * *  (every 6 hours)
```

## Architecture

```
Capitol Trades API ─┐
QuiverQuant API    ─┼─► /api/sync ──► Supabase PostgreSQL ──► Next.js pages
House/Senate EFTS  ─┘                                         (SSR + client)
                                                               ↓
                                                            Vercel
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats + recent trades |
| `/feed` | Full paginated trade feed with filters |
| `/politicians` | Browse all congress members |
| `/politicians/[slug]` | Individual politician trade history |
| `/stocks` | Most traded stocks leaderboard |
| `/stocks/[ticker]` | Stock page showing all political activity |
| `/portfolio` | Mirror portfolio — follow politicians |
| `/api/trades` | REST API for trade data |
| `/api/sync` | Trigger data sync (protected) |
