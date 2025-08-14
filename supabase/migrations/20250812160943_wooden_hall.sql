create extension if not exists pgcrypto;

-- Add owner column (auto owner = auth.uid())
alter table public.trips           add column if not exists user_id uuid default auth.uid();
alter table public.fuel_purchases  add column if not exists user_id uuid default auth.uid();
alter table public.location_points add column if not exists user_id uuid default auth.uid();

-- Enable RLS
alter table public.trips           enable row level security;
alter table public.fuel_purchases  enable row level security;
alter table public.location_points enable row level security;

-- Remove any permissive policies
drop policy if exists "allow all trips" on public.trips;
drop policy if exists "allow all fuel"  on public.fuel_purchases;
drop policy if exists "allow all pts"   on public.location_points;
drop policy if exists "own trips"  on public.trips;
drop policy if exists "own fuel"   on public.fuel_purchases;
drop policy if exists "own points" on public.location_points;

-- Owner-only policies (hide null user_id too)
create policy "own trips" on public.trips
  for all
  using (user_id = auth.uid() and user_id is not null)
  with check (user_id = auth.uid());

create policy "own fuel" on public.fuel_purchases
  for all
  using (user_id = auth.uid() and user_id is not null)
  with check (user_id = auth.uid());

create policy "own points" on public.location_points
  for all
  using (user_id = auth.uid() and user_id is not null)
  with check (user_id = auth.uid());

-- Refresh PostgREST cache
notify pgrst, 'reload schema';