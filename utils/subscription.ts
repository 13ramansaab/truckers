import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'premium';

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

export interface SubscriptionFeatures {
  canUseGPSTracking: boolean;
  canUseBackgroundTracking: boolean;
  maxFuelEntriesPerQuarter: number | null;
  canGenerateReports: boolean;
  canExportReports: boolean;
  canAccessHistory: boolean;
  canCaptureReceipts: boolean;
  canUseAdvancedAnalytics: boolean;
  canUseCloudBackup: boolean;
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

/**
 * Get subscription tier for current user
 */
export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 'free';
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription tier:', error);
      return 'free';
    }

    return (data?.subscription_tier as SubscriptionTier) || 'free';
  } catch (error) {
    console.error('Error in getSubscriptionTier:', error);
    return 'free';
  }
}

/**
 * Update subscription tier in profile
 */
export async function updateSubscriptionTier(tier: SubscriptionTier): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating subscription tier:', error);
      return false;
    }

    console.log('Subscription tier updated:', { userId: user.id, tier });
    return true;
  } catch (error) {
    console.error('Error in updateSubscriptionTier:', error);
    return false;
  }
}

/**
 * Get subscription features based on tier
 */
export function getSubscriptionFeatures(tier: SubscriptionTier): SubscriptionFeatures {
  if (tier === 'premium') {
    return {
      canUseGPSTracking: true,
      canUseBackgroundTracking: true,
      maxFuelEntriesPerQuarter: null,
      canGenerateReports: true,
      canExportReports: true,
      canAccessHistory: true,
      canCaptureReceipts: true,
      canUseAdvancedAnalytics: true,
      canUseCloudBackup: true,
    };
  }

  return {
    canUseGPSTracking: false,
    canUseBackgroundTracking: false,
    maxFuelEntriesPerQuarter: 10,
    canGenerateReports: false,
    canExportReports: false,
    canAccessHistory: false,
    canCaptureReceipts: false,
    canUseAdvancedAnalytics: false,
    canUseCloudBackup: false,
  };
}

/**
 * Check if user can add fuel entry (respects free tier limits)
 */
export async function canAddFuelEntry(): Promise<{ allowed: boolean; currentCount?: number; limit?: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { allowed: false };
    }

    const tier = await getSubscriptionTier();

    if (tier === 'premium') {
      return { allowed: true };
    }

    const { data, error } = await supabase.rpc('can_add_fuel_entry', {
      p_user_id: user.id
    });

    if (error) {
      console.error('Error checking fuel entry limit:', error);
      return { allowed: false };
    }

    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    const { data: countData } = await supabase.rpc('get_quarterly_fuel_count', {
      p_user_id: user.id,
      p_year: currentYear,
      p_quarter: currentQuarter
    });

    return {
      allowed: data as boolean,
      currentCount: countData || 0,
      limit: 10
    };
  } catch (error) {
    console.error('Error in canAddFuelEntry:', error);
    return { allowed: false };
  }
}

/**
 * Increment fuel entry count for free tier users
 */
export async function incrementFuelCount(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const tier = await getSubscriptionTier();

    if (tier === 'premium') {
      return true;
    }

    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    const { error } = await supabase.rpc('increment_fuel_count', {
      p_user_id: user.id,
      p_year: currentYear,
      p_quarter: currentQuarter
    });

    if (error) {
      console.error('Error incrementing fuel count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementFuelCount:', error);
    return false;
  }
}
