import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key_123456789';

// Create Supabase client with error handling
let supabase: any = null;
let isMockMode = false;

try {
  // Check if we have real environment variables
  if (process.env.EXPO_PUBLIC_SUPABASE_URL && 
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder') &&
      !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')) {
    
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    });
    console.log('Using real Supabase client');
  } else {
    throw new Error('No real Supabase credentials available');
  }
} catch (error) {
  console.warn('Using mock Supabase client for development:', error);
  isMockMode = true;
  
  console.log(`Platform: ${Platform.OS}, Mock mode enabled`);
  
  // Create a mock client that simulates successful authentication
  supabase = {
    auth: {
      getSession: async () => ({ 
        data: { 
          session: {
            user: { id: 'mock-user-123', email: 'mock@example.com' },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token'
          } 
        } 
      }),
      onAuthStateChange: (callback: any) => {
        // Simulate immediate authentication
        setTimeout(() => {
          callback('SIGNED_IN', {
            user: { id: 'mock-user-123', email: 'mock@example.com' },
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token'
          });
        }, 100);
        
        return { 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        };
      },
      signUp: async (credentials: any) => {
        try {
          console.log('Mock signup called with:', credentials);
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const result = { 
            data: { 
              user: { id: 'mock-user-123', email: credentials.email },
              session: {
                user: { id: 'mock-user-123', email: credentials.email },
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token'
              }
            }, 
            error: null 
          };
          console.log('Mock signup returning:', result);
          return result;
        } catch (error) {
          console.error('Mock signup error:', error);
          return { data: null, error: { message: 'Mock account creation failed' } };
        }
      },
      signInWithPassword: async (credentials: any) => {
        try {
          console.log('Mock signin called with:', credentials);
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 500));
          const result = { 
            data: { 
              user: { id: 'mock-user-123', email: credentials.email },
              session: {
                user: { id: 'mock-user-123', email: credentials.email },
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token'
              }
            }, 
            error: null 
          };
          console.log('Mock signin returning:', result);
          return result;
        } catch (error) {
          console.error('Mock signin error:', error);
          return { data: null, error: { message: 'Mock authentication failed' } };
        }
      },
      signInWithOtp: async (credentials: any) => {
        console.log('Mock OTP signin successful:', credentials.email);
        return { 
          data: { 
            user: { id: 'mock-user-123', email: credentials.email },
            session: {
              user: { id: 'mock-user-123', email: credentials.email },
              access_token: 'mock-token',
              refresh_token: 'mock-refresh-token'
            }
          }, 
          error: null 
        };
      },
      verifyOtp: async (credentials: any) => {
        console.log('Mock OTP verification successful:', credentials.email);
        return { 
          data: { 
            user: { id: 'mock-user-123', email: credentials.email },
            session: {
              user: { id: 'mock-user-123', email: credentials.email },
              access_token: 'mock-token',
              refresh_token: 'mock-refresh-token'
            }
          }, 
          error: null 
        };
      },
      signOut: async () => {
        console.log('Mock signout successful');
        return { error: null };
      },
      startAutoRefresh: () => {
        console.log('Mock auth auto-refresh started');
      },
      stopAutoRefresh: () => {
        console.log('Mock auth auto-refresh stopped');
      }
    },
    from: (table: string) => ({
      select: (columns: string) => ({
        limit: (count: number) => Promise.resolve({ data: [], error: null }),
        eq: (column: string, value: any) => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null })
        })
      }),
      insert: (data: any) => ({
        select: (columns: string) => ({
          single: () => Promise.resolve({ data: { id: 'mock-id-123' }, error: null })
        })
      }),
      upsert: (data: any, options: any) => Promise.resolve({ data: null, error: null })
    })
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