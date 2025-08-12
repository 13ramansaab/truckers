import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getSession, onAuthChange, signInWithEmailOtp, verifyEmailOtp, signOut } from '@/utils/auth';
import { logInToPurchases, logOutFromPurchases } from '@/utils/iap';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
        setStep('email');
        setEmail('');
        setCode('');
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

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setSending(true);
    try {
      await signInWithEmailOtp(email);
      setStep('code');
      Alert.alert('Success', 'Check your email for the verification code');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setVerifying(true);
    try {
      const success = await verifyEmailOtp(email, code);
      if (!success) {
        Alert.alert('Error', 'Invalid verification code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOutFromPurchases();
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
          
          {step === 'email' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.button, sending && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={sending}
              >
                <Text style={styles.buttonText}>
                  {sending ? 'Sending...' : 'Send Code'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Enter the code sent to {email}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                placeholderTextColor="#9CA3AF"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.button, verifying && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={verifying}
              >
                <Text style={styles.buttonText}>
                  {verifying ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('email')}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.authenticatedContainer}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});