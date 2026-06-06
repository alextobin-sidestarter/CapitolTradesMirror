-- Capitol Mirror Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Politicians table
create table if not exists politicians (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  first_name text,
  last_name text,
  slug text unique not null,
  party text, -- 'D', 'R', 'I'
  chamber text, -- 'Senate', 'House'
  state text,
  district text,
  photo_url text,
  bio text,
  website_url text,
  twitter_handle text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stocks table
create table if not exists stocks (
  id uuid primary key default uuid_generate_v4(),
  ticker text unique not null,
  company_name text not null,
  sector text,
  industry text,
  market_cap bigint,
  logo_url text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trades table (congressional disclosures)
create table if not exists trades (
  id uuid primary key default uuid_generate_v4(),
  politician_id uuid references politicians(id) on delete cascade,
  ticker text,
  company_name text,
  asset_type text default 'Stock', -- 'Stock', 'Option', 'Bond', etc.
  transaction_type text not null, -- 'Purchase', 'Sale', 'Exchange'
  amount_min bigint, -- lower bound of reported range
  amount_max bigint, -- upper bound of reported range
  transaction_date date,
  disclosure_date date,
  comment text,
  source text, -- 'senate', 'house', 'capitaltrades', 'quiverquant'
  source_id text, -- external ID from data source for dedup
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(source, source_id)
);

-- Stock prices cache (daily OHLCV from Polygon.io)
create table if not exists stock_prices (
  id uuid primary key default uuid_generate_v4(),
  ticker text not null,
  date date not null,
  open numeric(12,4),
  high numeric(12,4),
  low numeric(12,4),
  close numeric(12,4),
  volume bigint,
  created_at timestamptz default now(),
  unique(ticker, date)
);

-- User mirror portfolios
create table if not exists user_portfolios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'My Portfolio',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Which politicians a user is mirroring
create table if not exists portfolio_politicians (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid references user_portfolios(id) on delete cascade,
  politician_id uuid references politicians(id) on delete cascade,
  allocation_pct numeric(5,2) default 100, -- % of portfolio allocated to mirror this person
  created_at timestamptz default now(),
  unique(portfolio_id, politician_id)
);

-- Simulated trades in mirror portfolio
create table if not exists portfolio_trades (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid references user_portfolios(id) on delete cascade,
  trade_id uuid references trades(id) on delete cascade,
  simulated_price numeric(12,4), -- price at time of disclosure
  simulated_shares numeric(12,4),
  simulated_amount numeric(14,2),
  created_at timestamptz default now(),
  unique(portfolio_id, trade_id)
);

-- Sync log for data ingestion tracking
create table if not exists sync_log (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  status text not null, -- 'success', 'error', 'partial'
  records_fetched integer default 0,
  records_inserted integer default 0,
  records_updated integer default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- Indexes
create index if not exists trades_politician_id_idx on trades(politician_id);
create index if not exists trades_ticker_idx on trades(ticker);
create index if not exists trades_transaction_date_idx on trades(transaction_date desc);
create index if not exists trades_disclosure_date_idx on trades(disclosure_date desc);
create index if not exists stock_prices_ticker_date_idx on stock_prices(ticker, date desc);

-- RLS Policies
alter table politicians enable row level security;
alter table stocks enable row level security;
alter table trades enable row level security;
alter table stock_prices enable row level security;
alter table user_portfolios enable row level security;
alter table portfolio_politicians enable row level security;
alter table portfolio_trades enable row level security;

-- Public read access for politicians, stocks, trades, prices
create policy "Public read politicians" on politicians for select using (true);
create policy "Public read stocks" on stocks for select using (true);
create policy "Public read trades" on trades for select using (true);
create policy "Public read stock_prices" on stock_prices for select using (true);

-- User-scoped portfolio policies
create policy "Users manage own portfolios" on user_portfolios
  for all using (auth.uid() = user_id);
create policy "Users manage own portfolio_politicians" on portfolio_politicians
  for all using (
    portfolio_id in (select id from user_portfolios where user_id = auth.uid())
  );
create policy "Users manage own portfolio_trades" on portfolio_trades
  for all using (
    portfolio_id in (select id from user_portfolios where user_id = auth.uid())
  );

-- Helper function: upsert politician
create or replace function upsert_politician(
  p_full_name text,
  p_slug text,
  p_party text,
  p_chamber text,
  p_state text
) returns uuid language plpgsql as $$
declare
  v_id uuid;
begin
  insert into politicians(full_name, slug, party, chamber, state)
  values (p_full_name, p_slug, p_party, p_chamber, p_state)
  on conflict (slug) do update set
    full_name = excluded.full_name,
    party = excluded.party,
    chamber = excluded.chamber,
    state = excluded.state,
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;
