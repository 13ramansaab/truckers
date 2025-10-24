-- Create function to get active subscription for a user
CREATE OR REPLACE FUNCTION get_active_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  platform TEXT,
  product_id TEXT,
  entitlement_id TEXT,
  status TEXT,
  will_renew BOOLEAN,
  latest_purchase_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rc_app_user_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
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

-- Add comment
COMMENT ON FUNCTION get_active_subscription(UUID) IS 'Returns the active subscription for a given user, if any';
