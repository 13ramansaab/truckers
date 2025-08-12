import { Platform } from 'react-native';
import { supabase } from './supabase';
import { makeRedirectUri } from 'expo-auth-session';

function oauthRedirect() {
  // Use Expo proxy in Expo Go/dev; custom scheme in builds
  return makeRedirectUri({
    scheme: 'myapp',
    useProxy: Platform.select({ web: false, default: true }),
  });
}

export async function signInWithOAuth(provider: 'google'|'facebook') {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthRedirect(),
      skipBrowserRedirect: false,
      queryParams: { prompt: 'consent' },
    },
  });
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/**
 * Listen to auth state changes
 * @param cb Callback function that receives the session
 * @returns Unsubscribe function
 */
export function onAuthChange(cb: (session: any) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => cb(sess));
  return () => sub.subscription.unsubscribe();
}

/**
 * Send OTP to email
 * @param email Email address to send OTP to
 */
export async function sendOtp(email: string): Promise<void> {
  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
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
  await supabase.auth.signOut();
}