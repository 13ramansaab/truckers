import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/**
 * Listen to auth state changes
 * @param cb Callback function that receives the session
 * @returns Unsubscribe function
 */
export function onAuthChange(cb: (session: Session | null) => void) {
  const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => cb(sess));
  return () => sub.subscription.unsubscribe();
}

/**
 * Sign up with email and password
 * @param email Email address
 * @param password Password
 */
export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
}

/**
 * Sign in with email and password
 * @param email Email address
 * @param password Password
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
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