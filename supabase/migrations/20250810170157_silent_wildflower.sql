/*
  # Initial Schema for Trucker Fuel Tax Calculator

  1. New Tables
    - `trips`
      - `id` (uuid, primary key)
      - `name` (text, nullable)
      - `start_date` (date, required)
      - `end_date` (date, nullable)
      - `is_active` (boolean, default true)
      - `total_miles` (numeric, nullable)
      - `created_at` (timestamptz, default now)

    - `fuel_purchases`
      - `id` (uuid, primary key)
      - `date` (date, required)
      - `gallons` (numeric, required)
      - `price_per_gallon` (numeric, required)
      - `total_cost` (numeric, required)
      - `state` (text, nullable)
      - `location` (text, nullable)
      - `tax_included` (boolean, default true)
      - `created_at` (timestamptz, default now)

    - `tax_rates`
      - `state` (text, primary key)
      - `rate` (numeric, required)
      - `effective_date` (date, required)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is a single-user app)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_miles NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fuel_purchases table
CREATE TABLE IF NOT EXISTS fuel_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  gallons NUMERIC NOT NULL,
  price_per_gallon NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  state TEXT,
  location TEXT,
  tax_included BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tax_rates table
CREATE TABLE IF NOT EXISTS tax_rates (
  state TEXT PRIMARY KEY,
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL
);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-user app)
CREATE POLICY "Allow all operations on trips" ON trips
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on fuel_purchases" ON fuel_purchases
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tax_rates" ON tax_rates
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default tax rates for US states
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
  ('Wyoming', 0.14, '2024-01-01')
ON CONFLICT (state) DO NOTHING;

-- Insert a sample trip for testing
INSERT INTO trips (name, start_date, is_active, total_miles) VALUES
  ('Sample Trip', CURRENT_DATE, false, 250.5)
ON CONFLICT DO NOTHING;

-- Insert a sample fuel purchase for testing
INSERT INTO fuel_purchases (date, gallons, price_per_gallon, total_cost, state, location, tax_included) VALUES
  (CURRENT_DATE, 50.0, 3.45, 172.50, 'California', 'Los Angeles', true)
ON CONFLICT DO NOTHING;