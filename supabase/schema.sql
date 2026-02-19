-- Run in Supabase SQL editor.

-- Partners (owned by a user)
create table if not exists ride_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  price_out numeric(10,2) not null,
  price_back numeric(10,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ride_partners_user_id_idx on ride_partners(user_id);

-- Optional recurring templates
create table if not exists ride_templates (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references ride_partners(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  outbound boolean not null default false,
  return_ride boolean not null default false
);

create index if not exists ride_templates_partner_id_idx on ride_templates(partner_id);

-- Rides (each ride stores the charge amount at that time)
create table if not exists rides (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references ride_partners(id) on delete cascade,
  date date not null,
  outbound boolean not null default false,
  return_ride boolean not null default false,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists rides_partner_id_idx on rides(partner_id);
create index if not exists rides_date_idx on rides(date);

-- Payments (positive amounts increase credit)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references ride_partners(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  date date not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists payments_partner_id_idx on payments(partner_id);
create index if not exists payments_date_idx on payments(date);
