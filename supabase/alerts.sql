-- Alert subscriptions table
create table if not exists alert_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  politician_id uuid references politicians(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  is_active boolean default true,
  unsubscribe_token text default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz default now(),
  unique(politician_id, email)
);

create index if not exists alert_subscriptions_politician_idx on alert_subscriptions(politician_id);
create index if not exists alert_subscriptions_email_idx on alert_subscriptions(email);

alter table alert_subscriptions enable row level security;

create policy "Users manage own subscriptions" on alert_subscriptions
  for all using (auth.uid() = user_id);

-- Public insert for email-only subscriptions (no auth)
create policy "Public can subscribe" on alert_subscriptions
  for insert with check (true);
