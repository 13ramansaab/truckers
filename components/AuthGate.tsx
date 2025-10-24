import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getSession, onAuthChange, signUpWithPassword, signInWithPassword, signOut } from '~/utils/auth';
import { getProfile, upsertProfile } from '~/utils/profile';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Debug: Log when AuthGate mounts
  console.log('AuthGate: Component mounted - this should only happen for unauthenticated users');

  useEffect(() => {
    // FORCE CLEAR: Ensure we start completely fresh
    const forceClearAndCheck = async () => {
      try {
        // Force clear any cached sessions
        const { signOut } = await import('~/utils/auth');
        await signOut();
        console.log('AuthGate: FORCE CLEARED sessions on mount');
        
        // Wait a moment for clearing to take effect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now check session (should be null)
        const session = await getSession();
        console.log('AuthGate: session resolved after clear (authed?', !!session, ')');
        setSession(session);
        
        // If no session, ensure RevenueCat is logged out
        if (!session) {
          try {
            const { logOutFromPurchases } = await import('~/utils/iap');
            await logOutFromPurchases();
            console.log('AuthGate: No session found, logged out from RevenueCat');
          } catch (error) {
            console.warn('AuthGate: Failed to logout from RevenueCat:', error);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.warn('AuthGate: Error in force clear and check:', error);
        setSession(null);
        setLoading(false);
      }
    };
    
    forceClearAndCheck();

    // Listen for auth changes
    const unsubscribe = onAuthChange(async (session) => {
      try {
        console.log('AuthGate: Auth state changed:', !!session);
        setSession(session);
        
        if (session && session.user && session.user.id) {
          setEmail('');
          setPassword('');
          
          // Ensure user has a profile row
          ensureUserProfile();
        } else {
          // If no session, ensure RevenueCat is logged out
          try {
            const { logOutFromPurchases } = await import('~/utils/iap');
            await logOutFromPurchases();
            console.log('AuthGate: Session cleared, logged out from RevenueCat');
          } catch (error) {
            console.warn('AuthGate: Failed to logout from RevenueCat on session clear:', error);
          }
        }
      } catch (error) {
        console.warn('AuthGate: Error handling auth change:', error);
        setSession(null);
        
        // On error, also ensure RevenueCat is logged out
        try {
          const { logOutFromPurchases } = await import('~/utils/iap');
          await logOutFromPurchases();
          console.log('AuthGate: Auth change error, logged out from RevenueCat');
        } catch (rcError) {
          console.warn('AuthGate: Failed to logout from RevenueCat on auth change error:', rcError);
        }
      }
    });

    return unsubscribe;
  }, []);

  const ensureUserProfile = async () => {
    try {
      const profile = await getProfile();
      if (!profile) {
        // Create empty profile row for new user
        try {
          await upsertProfile({});
        } catch (upsertError) {
          console.warn('Failed to upsert user profile:', upsertError);
        }
      }
    } catch (error) {
      console.warn('Failed to get user profile:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsCreating(true);
    try {
      console.log('Attempting to create account for:', email);
      await signUpWithPassword(email, password);
      console.log('Account creation successful');
      
      // Reset onboarding state for new users so they see the onboarding flow
      try {
        await AsyncStorage.removeItem('onboarding.seen');
        console.log('Reset onboarding state for new user');
      } catch (storageError) {
        console.warn('Could not reset onboarding state:', storageError);
      }
      
      Alert.alert('Success', 'Account created successfully');
    } catch (error: any) {
      console.error('Account creation failed:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsSigningIn(true);
    try {
      console.log('Attempting to sign in:', email);
      await signInWithPassword(email, password);
      console.log('Sign in successful');
    } catch (error: any) {
      console.error('Sign in failed:', error);
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Reset onboarding state when signing out so it can be shown again
      try {
        await AsyncStorage.removeItem('onboarding.seen');
        console.log('Reset onboarding state on sign out');
      } catch (storageError) {
        console.warn('Could not reset onboarding state:', storageError);
      }
      
      // Logout from RevenueCat first
      try {
        const { logOutFromPurchases } = await import('~/utils/iap');
        await logOutFromPurchases();
        console.log('AuthGate: Logged out from RevenueCat on sign out');
      } catch (rcError) {
        console.warn('AuthGate: Failed to logout from RevenueCat on sign out:', rcError);
      }
      
      // Then logout from Supabase
      await signOut();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity
            style={[styles.button, isCreating && styles.buttonDisabled]}
            onPress={handleCreateAccount}
            disabled={isCreating || isSigningIn}
          >
            <Text style={styles.buttonText}>
              {isCreating ? 'Creating...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.signInButton, isSigningIn && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isCreating || isSigningIn}
          >
            <Text style={styles.buttonText}>
              {isSigningIn ? 'Signing in...' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.authenticatedContainer}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authenticatedContainer: {
    flex: 1,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  signInButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});