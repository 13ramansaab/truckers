-- Create subscriptions table for server-side subscription management
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  product_id TEXT NOT NULL,
  entitlement_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  will_renew BOOLEAN DEFAULT true,
  latest_purchase_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rc_app_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active subscription per user per platform
  UNIQUE(user_id, platform, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_rc_app_user_id ON subscriptions(rc_app_user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to get active subscription for a user
CREATE OR REPLACE FUNCTION get_active_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  platform TEXT,
  product_id TEXT,
  entitlement_id TEXT,
  status TEXT,
  will_renew BOOLEAN,
  latest_purchase_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rc_app_user_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.platform,
    s.product_id,
    s.entitlement_id,
    s.status,
    s.will_renew,
    s.latest_purchase_at,
    s.expires_at,
    s.rc_app_user_id
  FROM subscriptions s
  WHERE s.user_id = user_uuid
    AND s.status = 'active'
    AND s.expires_at > NOW()
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_active_subscription(UUID) TO authenticated;
