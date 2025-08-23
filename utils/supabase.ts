import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key_123456789';

// Create Supabase client with error handling
let supabase: any = null;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
} catch (error) {
  console.warn('Failed to create Supabase client:', error);
  // Create a mock client to prevent crashes
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: async () => ({ error: null }),
      signInWithPassword: async () => ({ error: null }),
      signInWithOtp: async () => ({ error: null }),
      verifyOtp: async () => ({ data: null, error: null }),
      signOut: async () => {},
    },
  };
}

export { supabase };

// Database types matching our schema
export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string;
          name: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          total_miles: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          total_miles?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          total_miles?: number | null;
          created_at?: string;
        };
      };
      fuel_purchases: {
        Row: {
          id: string;
          date: string;
          gallons: number;
          price_per_gallon: number;
          total_cost: number;
          state: string | null;
          location: string | null;
          tax_included: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          gallons: number;
          price_per_gallon: number;
          total_cost: number;
          state?: string | null;
          location?: string | null;
          tax_included?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          gallons?: number;
          price_per_gallon?: number;
          total_cost?: number;
          state?: string | null;
          location?: string | null;
          tax_included?: boolean;
          created_at?: string;
        };
      };
      tax_rates: {
        Row: {
          state: string;
          rate: number;
          effective_date: string;
        };
        Insert: {
          state: string;
          rate: number;
          effective_date: string;
        };
        Update: {
          state?: string;
          rate?: number;
          effective_date?: string;
        };
      };
    };
  };
}