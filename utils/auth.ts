import { supabase } from './supabase';

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
}

/**
 * Listen to auth state changes
 * @param cb Callback function that receives the session
 * @returns Unsubscribe function
 */
export function onAuthChange(cb: (session: any) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      cb(session);
    }
  );
  
  return () => subscription.unsubscribe();
}

/**
 * Send OTP to email
 * @param email Email address to send OTP to
 */
export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
  
  if (error) {
    throw error;
  }
}

/**
 * Verify email OTP
 * @param email Email address
 * @param token OTP token
 * @returns True if verification successful
 */
export async function verifyOtp(email: string, token: string): Promise<boolean> {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  
  if (error) {
    throw error;
  }
  
  return !!data?.session;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw error;
  }
}