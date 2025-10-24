import { supabase } from './supabase';

export interface SubscriptionData {
  id: string;
  user_id: string;
  platform: string;
  product_id: string;
  entitlement_id: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  will_renew: boolean;
  latest_purchase_at: string;
  expires_at: string;
  rc_app_user_id: string;
}

export interface ActiveSubscription {
  id: string;
  platform: string;
  product_id: string;
  entitlement_id: string;
  status: string;
  will_renew: boolean;
  latest_purchase_at: string;
  expires_at: string;
  rc_app_user_id: string;
}

/**
 * Get active subscription for the current user
 */
export async function getActiveSubscription(): Promise<ActiveSubscription | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('Database: No authenticated user');
      return null;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Database: Error fetching active subscription:', error);
      return null;
    }

    if (!data) {
      console.log('Database: No active subscription found for user:', user.id);
      return null;
    }

    console.log('Database: Active subscription found:', {
      userId: user.id,
      status: data.status,
      expiresAt: data.expires_at,
      platform: data.platform
    });

    return data;
  } catch (error) {
    console.error('Database: Error in getActiveSubscription:', error);
    return null;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const subscription = await getActiveSubscription();
  return subscription !== null;
}

/**
 * Upsert subscription data (used by webhook)
 */
export async function upsertSubscription(subscriptionData: Partial<SubscriptionData>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id,platform,status',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Database: Error upserting subscription:', error);
      return false;
    }

    console.log('Database: Subscription upserted successfully:', {
      userId: subscriptionData.user_id,
      status: subscriptionData.status,
      platform: subscriptionData.platform
    });

    return true;
  } catch (error) {
    console.error('Database: Error in upsertSubscription:', error);
    return false;
  }
}

/**
 * Link RC app user ID to Supabase user
 */
export async function linkRCUserToSupabase(rcAppUserId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Database: No authenticated user for RC linking');
      return false;
    }

    // Update any existing subscriptions with this RC app user ID
    const { error } = await supabase
      .from('subscriptions')
      .update({ rc_app_user_id: rcAppUserId })
      .eq('rc_app_user_id', rcAppUserId)
      .is('user_id', null);

    if (error) {
      console.error('Database: Error linking RC user:', error);
      return false;
    }

    console.log('Database: RC user linked to Supabase user:', {
      rcAppUserId,
      supabaseUserId: user.id
    });

    return true;
  } catch (error) {
    console.error('Database: Error in linkRCUserToSupabase:', error);
    return false;
  }
}
