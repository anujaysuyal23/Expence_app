alter table public.group_expenses
add column if not exists category text not null default 'Other';
