import { supabase } from './supabase';

export interface Profile {
  user_id: string;
  country: 'USA' | 'Canada' | null;
  unit_system: 'us' | 'metric' | null;
  currency: 'USD' | 'CAD' | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  country?: 'USA' | 'Canada';
  unit_system?: 'us' | 'metric';
  currency?: 'USD' | 'CAD';
}

/**
 * Get the current user's profile
 * @returns Profile data or null if not found
 */
export async function getProfile(): Promise<Profile | null> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
}

/**
 * Insert or update the current user's profile
 * @param data Profile data to update
 */
export async function upsertProfile(data: ProfileUpdateData): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        { ...data, user_id: user.id },
        { onConflict: 'user_id' }
      );

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error upserting profile:', error);
    throw error;
  }
}