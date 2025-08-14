/*
  # Create user profiles table with RLS

  1. New Tables
    - `profiles`
      - `user_id` (uuid, primary key, references auth.users)
      - `country` (text, check constraint for USA/Canada)
      - `unit_system` (text, check constraint for us/metric)
      - `currency` (text, check constraint for USD/CAD)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Functions
    - `set_profile_defaults()` - Auto-fills unit_system and currency based on country
    - Trigger to call function on insert/update

  3. Security
    - Enable RLS on profiles table
    - Policy "own profile" - users can only access their own profile data

  4. Features
    - Country-based defaults: USA → us/USD, Canada → metric/CAD
    - Automatic updated_at timestamp on changes
    - Cascading delete when user is deleted
*/

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country text check (country in ('USA','Canada')) default null,
  unit_system text check (unit_system in ('us','metric')) default null,
  currency text check (currency in ('USD','CAD')) default null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_profile_defaults()
returns trigger language plpgsql as $$
begin
  if NEW.country is not null then
    if NEW.country = 'USA' then
      NEW.unit_system := coalesce(NEW.unit_system, 'us');
      NEW.currency := coalesce(NEW.currency, 'USD');
    elsif NEW.country = 'Canada' then
      NEW.unit_system := coalesce(NEW.unit_system, 'metric');
      NEW.currency := coalesce(NEW.currency, 'CAD');
    end if;
  end if;
  NEW.updated_at := now();
  return NEW;
end$$;

drop trigger if exists profiles_defaults_trg on public.profiles;
create trigger profiles_defaults_trg
before insert or update on public.profiles
for each row execute function public.set_profile_defaults();

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';