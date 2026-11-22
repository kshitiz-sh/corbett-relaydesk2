-- Run this once in your Supabase Project -> SQL Editor

create table if not exists public.clients (
  id text primary key,
  slug text unique not null,
  whatsapp_phone_number_id text,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_slug on public.clients (slug);
create index if not exists idx_clients_phone_id on public.clients (whatsapp_phone_number_id);

create table if not exists public.conversations (
  id text primary key,
  client_id text not null,
  customer_phone text not null,
  status text not null default 'active',
  bot_paused boolean not null default false,
  last_message_at timestamptz not null default now(),
  data jsonb not null
);

create index if not exists idx_conversations_client on public.conversations (client_id, last_message_at desc);
create index if not exists idx_conversations_client_phone on public.conversations (client_id, customer_phone);

create table if not exists public.webhook_logs (
  id text primary key,
  client_id text not null,
  timestamp timestamptz not null default now(),
  data jsonb not null
);

create index if not exists idx_webhook_logs_ts on public.webhook_logs (timestamp desc);

create table if not exists public.webhook_receipts (
  message_id text primary key,
  client_id text not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_webhook_receipts_received_at on public.webhook_receipts (received_at desc);

-- Keep tables locked from public browser/anon access; server uses SUPABASE_SERVICE_ROLE_KEY
alter table public.clients enable row level security;
alter table public.conversations enable row level security;
alter table public.webhook_logs enable row level security;
alter table public.webhook_receipts enable row level security;
