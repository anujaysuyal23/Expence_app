create table if not exists public.car_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('Expense', 'Income')),
  category text not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  entry_date date not null default current_date,
  odometer_km numeric(12, 2),
  liters numeric(12, 2),
  fuel_price_per_liter numeric(12, 2),
  created_at timestamptz not null default now()
);

alter table public.car_entries add column if not exists odometer_km numeric(12, 2);
alter table public.car_entries add column if not exists liters numeric(12, 2);
alter table public.car_entries add column if not exists fuel_price_per_liter numeric(12, 2);
alter table public.car_entries add column if not exists entry_date date default current_date;

alter table public.car_entries enable row level security;

drop policy if exists "prototype read car entries" on public.car_entries;
drop policy if exists "prototype insert car entries" on public.car_entries;
drop policy if exists "prototype update car entries" on public.car_entries;
drop policy if exists "prototype delete car entries" on public.car_entries;

create policy "prototype read car entries" on public.car_entries for select using (true);
create policy "prototype insert car entries" on public.car_entries for insert with check (true);
create policy "prototype update car entries" on public.car_entries for update using (true);
create policy "prototype delete car entries" on public.car_entries for delete using (true);
