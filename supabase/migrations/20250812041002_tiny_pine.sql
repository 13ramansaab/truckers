/*
  # Add user-based Row Level Security

  1. Extensions
    - Enable pgcrypto extension for UUID functions

  2. Schema Changes
    - Add user_id column to trips, fuel_purchases, location_points
    - Default to auth.uid() for automatic user assignment

  3. Security
    - Enable RLS on all three tables
    - Add policies for user-owned data only
    - Users can only access their own trips, fuel purchases, and location points

  4. Storage (Optional)
    - Add policies for receipts bucket if used
    - Allow authenticated users to read/upload receipts
*/

-- Enable pgcrypto extension for UUID functions
create extension if not exists pgcrypto;

-- Add user_id columns with default to current user
alter table public.trips           add column if not exists user_id uuid default auth.uid();
alter table public.fuel_purchases  add column if not exists user_id uuid default auth.uid();
alter table public.location_points add column if not exists user_id uuid default auth.uid();

-- Enable Row Level Security on all tables
alter table public.trips           enable row level security;
alter table public.fuel_purchases  enable row level security;
alter table public.location_points enable row level security;

-- Drop existing policies if they exist
drop policy if exists "own trips"  on public.trips;
drop policy if exists "own fuel"   on public.fuel_purchases;
drop policy if exists "own points" on public.location_points;

-- Create user-owned data policies
create policy "own trips" on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own fuel" on public.fuel_purchases
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own points" on public.location_points
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Optional: Storage policies for receipts bucket
create policy if not exists "read receipts" on storage.objects 
  for select to authenticated using (bucket_id='receipts');

create policy if not exists "upload receipts" on storage.objects 
  for insert to authenticated with check (bucket_id='receipts');

-- Notify PostgREST to reload schema
notify pgrst, 'reload schema';