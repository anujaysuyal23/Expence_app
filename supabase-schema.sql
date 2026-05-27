create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null,
  category text not null default 'Other',
  amount numeric(12, 2) not null check (amount > 0),
  paid_by uuid not null references public.group_members(id) on delete restrict,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.group_expense_participants (
  expense_id uuid not null references public.group_expenses(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  primary key (expense_id, member_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_expenses enable row level security;
alter table public.group_expense_participants enable row level security;

-- Prototype policy for a trusted 2-3 person app.
-- Before sharing publicly, replace this with login-based policies.
create policy "prototype read groups" on public.groups for select using (true);
create policy "prototype insert groups" on public.groups for insert with check (true);
create policy "prototype update groups" on public.groups for update using (true);
create policy "prototype delete groups" on public.groups for delete using (true);

create policy "prototype read members" on public.group_members for select using (true);
create policy "prototype insert members" on public.group_members for insert with check (true);
create policy "prototype update members" on public.group_members for update using (true);
create policy "prototype delete members" on public.group_members for delete using (true);

create policy "prototype read expenses" on public.group_expenses for select using (true);
create policy "prototype insert expenses" on public.group_expenses for insert with check (true);
create policy "prototype update expenses" on public.group_expenses for update using (true);
create policy "prototype delete expenses" on public.group_expenses for delete using (true);

create policy "prototype read participants" on public.group_expense_participants for select using (true);
create policy "prototype insert participants" on public.group_expense_participants for insert with check (true);
create policy "prototype update participants" on public.group_expense_participants for update using (true);
create policy "prototype delete participants" on public.group_expense_participants for delete using (true);
