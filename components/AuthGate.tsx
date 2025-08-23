import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getSession, onAuthChange, signUpWithPassword, signInWithPassword, signOut } from '~/utils/auth';
import { logInToPurchases, logOutFromPurchases } from '~/utils/iap';
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

  useEffect(() => {
    // Check initial session
    getSession().then(session => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const unsubscribe = onAuthChange((session) => {
      setSession(session);
      if (session) {
        setEmail('');
        setPassword('');
        // Ensure user has a profile row
        ensureUserProfile();
        // Link RevenueCat to user
        try {
          logInToPurchases(session.user.id);
        } catch (error) {
          console.warn('Failed to link RevenueCat user:', error);
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
        await upsertProfile({});
      }
    } catch (error) {
      console.warn('Failed to ensure user profile:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsCreating(true);
    try {
      await signUpWithPassword(email, password);
      
      // Reset onboarding state for new users so they see the onboarding flow
      try {
        await AsyncStorage.removeItem('onboarding.seen');
        console.log('Reset onboarding state for new user');
      } catch (storageError) {
        console.warn('Could not reset onboarding state:', storageError);
      }
      
      Alert.alert('Success', 'Account created successfully');
    } catch (error: any) {
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
      await signInWithPassword(email, password);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOutFromPurchases();
      
      // Reset onboarding state when signing out so it can be shown again
      try {
        await AsyncStorage.removeItem('onboarding.seen');
        console.log('Reset onboarding state on sign out');
      } catch (storageError) {
        console.warn('Could not reset onboarding state:', storageError);
      }
      
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