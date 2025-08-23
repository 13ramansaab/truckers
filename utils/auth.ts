import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
  try {
    if (!supabase?.auth?.getSession) {
      console.warn('Supabase auth not available');
      return null;
    }
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  } catch (error) {
    console.warn('Error getting session:', error);
    return null;
  }
}

/**
 * Listen to auth state changes
 * @param cb Callback function that receives the session
 * @returns Unsubscribe function
 */
export function onAuthChange(cb: (session: Session | null) => void) {
  try {
    if (!supabase?.auth?.onAuthStateChange) {
      console.warn('Supabase auth not available');
      return () => {};
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => cb(sess));
    return () => {
      try {
        sub?.subscription?.unsubscribe?.();
      } catch (error) {
        console.warn('Error unsubscribing from auth changes:', error);
      }
    };
  } catch (error) {
    console.warn('Error setting up auth change listener:', error);
    return () => {};
  }
}

/**
 * Sign up with email and password
 * @param email Email address
 * @param password Password
 */
export async function signUpWithPassword(email: string, password: string): Promise<void> {
  try {
    if (!supabase?.auth?.signUp) {
      throw new Error('Authentication not available');
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 * @param email Email address
 * @param password Password
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  try {
    if (!supabase?.auth?.signInWithPassword) {
      throw new Error('Authentication not available');
    }
    
    console.log('Attempting to sign in with password for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase signin error:', error);
      throw error;
    }
    console.log('Sign in successful for:', email);
  } catch (error) {
    console.error('Sign in error:', error);
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