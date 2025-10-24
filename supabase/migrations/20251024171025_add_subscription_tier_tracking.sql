/*
  # Add Subscription Tier Tracking

  1. Changes
    - Add `subscription_tier` column to profiles table to track free/premium status
    - Add `fuel_entry_count` tracking per quarter for free tier limits
    - Create view for current quarter fuel count
    - Add function to check free tier limits

  2. Security
    - Maintain existing RLS policies
    - Add policies for fuel count tracking
*/

-- Add subscription tier to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));
  END IF;
END $$;

-- Create table to track quarterly fuel entry counts for free users
CREATE TABLE IF NOT EXISTS fuel_entry_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  quarter integer NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  entry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, quarter)
);

ALTER TABLE fuel_entry_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fuel entry counts"
  ON fuel_entry_counts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fuel entry counts"
  ON fuel_entry_counts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fuel entry counts"
  ON fuel_entry_counts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get current quarter
CREATE OR REPLACE FUNCTION get_current_quarter()
RETURNS integer AS $$
BEGIN
  RETURN CEIL(EXTRACT(MONTH FROM CURRENT_DATE) / 3.0)::integer;
END;
$$ LANGUAGE plpgsql;

-- Function to get current quarter fuel count for a user
CREATE OR REPLACE FUNCTION get_quarterly_fuel_count(p_user_id uuid, p_year integer, p_quarter integer)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT entry_count INTO v_count
  FROM fuel_entry_counts
  WHERE user_id = p_user_id
    AND year = p_year
    AND quarter = p_quarter;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment fuel entry count
CREATE OR REPLACE FUNCTION increment_fuel_count(p_user_id uuid, p_year integer, p_quarter integer)
RETURNS void AS $$
BEGIN
  INSERT INTO fuel_entry_counts (user_id, year, quarter, entry_count, updated_at)
  VALUES (p_user_id, p_year, p_quarter, 1, now())
  ON CONFLICT (user_id, year, quarter)
  DO UPDATE SET
    entry_count = fuel_entry_counts.entry_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can add fuel entry (for free tier)
CREATE OR REPLACE FUNCTION can_add_fuel_entry(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tier text;
  v_count integer;
  v_year integer;
  v_quarter integer;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM profiles
  WHERE id = p_user_id;
  
  -- Premium users have unlimited entries
  IF v_tier = 'premium' THEN
    RETURN true;
  END IF;
  
  -- Get current year and quarter
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
  v_quarter := get_current_quarter();
  
  -- Get current count
  v_count := get_quarterly_fuel_count(p_user_id, v_year, v_quarter);
  
  -- Free tier limited to 10 entries per quarter
  RETURN v_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
