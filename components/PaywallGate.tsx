import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Crown, RefreshCw } from 'lucide-react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureTrialStart, isTrialActiveWithoutAutoStart, daysLeftWithoutAutoStart } from '~/utils/trial';
import { initIAP, getProStatus, getPackages, purchaseFirstAvailable, purchaseProduct, restore } from '~/utils/iap';
import { getMonthlyProductId } from '~/revenuecat-config';
import OnboardingCarousel from './OnboardingCarousel';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';
const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

interface PaywallGateProps {
  children: React.ReactNode;
}

export default function PaywallGate({ children }: PaywallGateProps) {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [trialDays, setTrialDays] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [pro, setPro] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    checkOnboardingAndAccess();
  }, []);

  const checkOnboardingAndAccess = async () => {
    setLoading(true);
    try {
      // Check onboarding first
      const onboardingSeen = await AsyncStorage.getItem('onboarding.seen');
      if (onboardingSeen !== '1') {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }

      await checkAccess();
    } catch (error) {
      console.error('Error checking onboarding and access:', error);
      setCanAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    try {
      await initIAP();
      
      // Check if user already has pro access
      let proStatus = false;
      try {
        proStatus = await getProStatus();
      } catch (error) {
        console.warn('Failed to get pro status:', error);
      }
      
      if (proStatus) {
        setPro(true);
        setTrialActive(false);
        setTrialDays(0);
        setCanAccess(true);
        return;
      }
      
      // Check if user already has an active trial (don't auto-start one)
      let trial = false;
      let days = 0;
      try {
        trial = await isTrialActiveWithoutAutoStart();
        days = await daysLeftWithoutAutoStart();
      } catch (error) {
        console.warn('Failed to get trial status:', error);
      }
      
      setPro(false);
      setTrialActive(trial);
      setTrialDays(days);
      setCanAccess(trial); // Only grant access if trial is already active
      
      console.log('PaywallGate: Access check results:', {
        pro: proStatus,
        trial,
        days,
        canAccess: trial
      });
      
      // Get packages for the paywall
      try {
        const packages = await getPackages();
        if (packages && packages.length > 0 && packages[0]?.product?.priceString) {
          setPrice(packages[0].product.priceString);
        }
      } catch (packageError) {
        console.warn('Failed to get packages:', packageError);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setCanAccess(false);
    }
  };

  const handleOnboardingFinish = async () => {
    setShowOnboarding(false);
    await checkAccess();
  };

  const handleStartTrial = async () => {
    setPurchasing(true);
    try {
      if (IS_NATIVE && !IS_EXPO_GO) {
        // Native app: use RevenueCat purchase
        let success = await purchaseFirstAvailable();
        
        // If package purchase fails, try direct product purchase
        if (!success) {
          console.log('Package purchase failed, trying direct product purchase...');
          const monthlyProductId = getMonthlyProductId();
          console.log('Attempting to purchase product:', monthlyProductId);
          success = await purchaseProduct(monthlyProductId);
          console.log('Direct product purchase result:', success);
        }
        
        if (success) {
          await checkAccess();
        }
      } else {
        // Expo Go/Web: use device trial
        await ensureTrialStart();
        await checkAccess();
      }
    } catch (error) {
      console.error('Start trial error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (IS_EXPO_GO || Platform.OS === 'web') return;
    
    setRestoring(true);
    try {
      const success = await restore();
      if (success) {
        await checkAccess();
      }
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setRestoring(false);
    }
  };

  const openTerms = () => {
    Linking.openURL('https://example.com/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://example.com/privacy');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingCarousel onFinish={handleOnboardingFinish} />;
  }

  if (canAccess) {
    return <>{children}</>;
  }

  return (
    <View style={styles.paywallContainer}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Crown size={48} color="#3B82F6" />
        </View>
        
        <Text style={styles.title}>Start your 3-day free trial</Text>
        
        {price && (
          <Text style={styles.subtitle}>
            then {price}/month, auto-renews, cancel anytime
          </Text>
        )}

        {trialActive && trialDays > 0 && (
          <View style={styles.trialInfo}>
            <Text style={styles.trialText}>
              Trial: {trialDays} day{trialDays !== 1 ? 's' : ''} left
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.startTrialButton, purchasing && styles.buttonDisabled]}
            onPress={handleStartTrial}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Crown size={20} color="#FFFFFF" />
                <Text style={styles.startTrialButtonText}>Start free trial</Text>
              </>
            )}
          </TouchableOpacity>

          {IS_NATIVE && !IS_EXPO_GO && (
            <TouchableOpacity
              style={[styles.restoreButton, restoring && styles.buttonDisabled]}
              onPress={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <>
                  <RefreshCw size={20} color="#3B82F6" />
                  <Text style={styles.restoreButtonText}>Restore purchases</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.legalContainer}>
          <Text style={styles.legalText}>
            By continuing you agree to our{' '}
            <Text style={styles.legalLink} onPress={openTerms}>
              Terms
            </Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={openPrivacy}>
              Privacy Policy
            </Text>
          </Text>
        </View>

        {IS_EXPO_GO && (
          <View style={styles.expoGoNotice}>
            <Text style={styles.expoGoText}>
              Running in Expo Go - using device trial instead of subscription
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  paywallContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  trialInfo: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
  },
  trialText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  startTrialButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startTrialButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  restoreButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  legalContainer: {
    marginBottom: 16,
  },
  legalText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  expoGoNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  expoGoText: {
    color: '#92400E',
    fontSize: 12,
    textAlign: 'center',
  },
});