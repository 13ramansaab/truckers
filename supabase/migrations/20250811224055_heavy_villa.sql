/*
  # IFTA Data Integrity and Performance Migration

  1. Tables
    - Ensure UUIDs with gen_random_uuid() defaults
    - Add proper timestamp columns
    - Create tax_rates table with indexes
    - Add location_points for GPS tracking
    - Add user_id columns for RLS (if auth enabled)

  2. Indexes
    - Performance indexes for common queries
    - Tax rates lookup optimization

  3. Security
    - Enable RLS on all tables
    - Add owner-only policies

  4. Seed Data
    - US and Canadian tax rates
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Update trips table
DO $$
BEGIN
  -- Add user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN user_id uuid DEFAULT auth.uid();
  END IF;

  -- Ensure proper timestamps
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN started_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE trips ADD COLUMN ended_at timestamptz;
  END IF;
END $$;

-- Update fuel_purchases table
DO $$
BEGIN
  -- Add user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_purchases' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE fuel_purchases ADD COLUMN user_id uuid DEFAULT auth.uid();
  END IF;

  -- Add receipt fields if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_purchases' AND column_name = 'receipt_path'
  ) THEN
    ALTER TABLE fuel_purchases ADD COLUMN receipt_path text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_purchases' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE fuel_purchases ADD COLUMN receipt_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_purchases' AND column_name = 'odometer'
  ) THEN
    ALTER TABLE fuel_purchases ADD COLUMN odometer numeric;
  END IF;
END $$;

-- Create tax_rates table
CREATE TABLE IF NOT EXISTS tax_rates (
  state text NOT NULL,
  rate numeric NOT NULL,
  effective_date date NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  PRIMARY KEY (state, effective_date)
);

-- Create location_points table for GPS tracking
CREATE TABLE IF NOT EXISTS location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  state text,
  speed_mph double precision,
  user_id uuid DEFAULT auth.uid()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS trips_started_at_desc ON trips(started_at DESC);
CREATE INDEX IF NOT EXISTS trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS fuel_purchases_date_desc ON fuel_purchases(date DESC);
CREATE INDEX IF NOT EXISTS fuel_purchases_user_id ON fuel_purchases(user_id);
CREATE INDEX IF NOT EXISTS location_points_trip_ts ON location_points(trip_id, ts);
CREATE INDEX IF NOT EXISTS location_points_user_id ON location_points(user_id);
CREATE INDEX IF NOT EXISTS tax_rates_state_date_desc ON tax_rates(state, effective_date DESC);
CREATE INDEX IF NOT EXISTS tax_rates_user_id ON tax_rates(user_id);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own trips" ON trips
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own fuel purchases" ON fuel_purchases
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own location points" ON location_points
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own tax rates" ON tax_rates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed US tax rates (2024 rates)
INSERT INTO tax_rates (state, rate, effective_date) VALUES
  ('Alabama', 0.19, '2024-01-01'),
  ('Alaska', 0.08, '2024-01-01'),
  ('Arizona', 0.18, '2024-01-01'),
  ('Arkansas', 0.2225, '2024-01-01'),
  ('California', 0.40, '2024-01-01'),
  ('Colorado', 0.2225, '2024-01-01'),
  ('Connecticut', 0.25, '2024-01-01'),
  ('Delaware', 0.22, '2024-01-01'),
  ('Florida', 0.336, '2024-01-01'),
  ('Georgia', 0.184, '2024-01-01'),
  ('Hawaii', 0.16, '2024-01-01'),
  ('Idaho', 0.25, '2024-01-01'),
  ('Illinois', 0.385, '2024-01-01'),
  ('Indiana', 0.16, '2024-01-01'),
  ('Iowa', 0.215, '2024-01-01'),
  ('Kansas', 0.24, '2024-01-01'),
  ('Kentucky', 0.184, '2024-01-01'),
  ('Louisiana', 0.16, '2024-01-01'),
  ('Maine', 0.244, '2024-01-01'),
  ('Maryland', 0.243, '2024-01-01'),
  ('Massachusetts', 0.21, '2024-01-01'),
  ('Michigan', 0.153, '2024-01-01'),
  ('Minnesota', 0.2235, '2024-01-01'),
  ('Mississippi', 0.184, '2024-01-01'),
  ('Missouri', 0.17, '2024-01-01'),
  ('Montana', 0.2775, '2024-01-01'),
  ('Nebraska', 0.248, '2024-01-01'),
  ('Nevada', 0.27, '2024-01-01'),
  ('New Hampshire', 0.222, '2024-01-01'),
  ('New Jersey', 0.325, '2024-01-01'),
  ('New Mexico', 0.17, '2024-01-01'),
  ('New York', 0.331, '2024-01-01'),
  ('North Carolina', 0.343, '2024-01-01'),
  ('North Dakota', 0.21, '2024-01-01'),
  ('Ohio', 0.28, '2024-01-01'),
  ('Oklahoma', 0.16, '2024-01-01'),
  ('Oregon', 0.24, '2024-01-01'),
  ('Pennsylvania', 0.535, '2024-01-01'),
  ('Rhode Island', 0.30, '2024-01-01'),
  ('South Carolina', 0.167, '2024-01-01'),
  ('South Dakota', 0.22, '2024-01-01'),
  ('Tennessee', 0.214, '2024-01-01'),
  ('Texas', 0.15, '2024-01-01'),
  ('Utah', 0.294, '2024-01-01'),
  ('Vermont', 0.26, '2024-01-01'),
  ('Virginia', 0.162, '2024-01-01'),
  ('Washington', 0.375, '2024-01-01'),
  ('West Virginia', 0.205, '2024-01-01'),
  ('Wisconsin', 0.249, '2024-01-01'),
  ('Wyoming', 0.14, '2024-01-01'),
  -- Canadian provinces
  ('Alberta', 0.13, '2024-01-01'),
  ('British Columbia', 0.15, '2024-01-01'),
  ('Manitoba', 0.14, '2024-01-01'),
  ('New Brunswick', 0.155, '2024-01-01'),
  ('Newfoundland and Labrador', 0.165, '2024-01-01'),
  ('Northwest Territories', 0.107, '2024-01-01'),
  ('Nova Scotia', 0.154, '2024-01-01'),
  ('Nunavut', 0.107, '2024-01-01'),
  ('Ontario', 0.143, '2024-01-01'),
  ('Prince Edward Island', 0.155, '2024-01-01'),
  ('Quebec', 0.192, '2024-01-01'),
  ('Saskatchewan', 0.15, '2024-01-01'),
  ('Yukon', 0.132, '2024-01-01')
ON CONFLICT (state, effective_date) DO NOTHING;