import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { Crown, RefreshCw, ArrowRight } from 'lucide-react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ensureTrialStart, isTrialActiveWithoutAutoStart, daysLeftWithoutAutoStart } from '~/utils/trial';
import { initIAP, getProStatus, getPackages, purchaseFirstAvailable, purchaseProduct, restore, logInToPurchases, logOutFromPurchases } from '~/utils/iap';
import { getMonthlyProductId, getEntitlementId } from '~/revenuecat-config';
import OnboardingCarousel from './OnboardingCarousel';
import CustomSplashScreen from './CustomSplashScreen';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { getSession } from '~/utils/auth';
import { getActiveSubscription, hasActiveSubscription } from '~/utils/subscription';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';
const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

interface PaywallGateProps {
  children: React.ReactNode;
}

export default function PaywallGate({ children }: PaywallGateProps) {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [trialDays, setTrialDays] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [pro, setPro] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [price, setPrice] = useState<string | null>(null);
  const [hasPremiumEntitlement, setHasPremiumEntitlement] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [dbSubStatus, setDbSubStatus] = useState<'active' | 'none'>('none');
  
  // Debug: Log when PaywallGate mounts
  console.log('PaywallGate: Component mounted - this should only happen for authenticated users');
  
  // Debouncing refs
  const focusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFocusCheckRef = useRef<number>(0);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to handle splash screen completion
  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Helper function to check if Premium entitlement is active
  const hasActivePremiumEntitlement = useCallback((info: CustomerInfo) => {
    return !!(info.entitlements.active['Premium'] || 
              info.entitlements.active['pro'] || 
              info.entitlements.active[getEntitlementId(Platform.OS as 'ios' | 'android')] ||
              Object.keys(info.entitlements.active).length > 0);
  }, []);

  // Helper function to navigate to main app
  const navigateToMainApp = useCallback(() => {
    console.log('PaywallGate: Navigating to main app');
    
    // Prevent multiple navigation calls
    if (hasNavigated || navigationTimeoutRef.current) {
      console.log('PaywallGate: Navigation already completed or in progress, skipping');
      return;
    }
    
    setHasNavigated(true);
    navigationTimeoutRef.current = setTimeout(() => {
      try {
        router.replace('/(tabs)');
        // Clear the timeout after navigation
        navigationTimeoutRef.current = null;
      } catch (error) {
        console.warn('PaywallGate: Navigation error:', error);
        navigationTimeoutRef.current = null;
        setHasNavigated(false); // Reset on error
      }
    }, 100);
  }, [router, hasNavigated]);

  useEffect(() => {
    const initializeApp = async () => {
      // Check onboarding and access
      await checkOnboardingAndAccess();
    };
    
    initializeApp();
    
    return () => {
      if (focusCheckTimeoutRef.current) {
        clearTimeout(focusCheckTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
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

      // SIMPLE FLOW: Check database subscription status first - this is the source of truth
      const hasActiveSub = await hasActiveSubscription();
      if (hasActiveSub) {
        console.log('PaywallGate: User has active subscription, navigating to Home');
        setDbSubStatus('active');
        setPro(true);
        setTrialActive(false);
        setTrialDays(0);
        setCanAccess(true);
        setHasPremiumEntitlement(true);
        if (!hasNavigated) {
          navigateToMainApp();
        }
        return;
      }

      console.log('PaywallGate: No active subscription, showing Buy Subscription');

      // User is authenticated but no active subscription - show Buy Subscription
      setDbSubStatus('none');
      setPro(false);
      setTrialActive(false);
      setTrialDays(0);
      setCanAccess(false);
      setHasPremiumEntitlement(false);
      
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
      console.error('Error checking onboarding and access:', error);
      setCanAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    // SIMPLE FLOW: This function is no longer needed as we handle everything in checkOnboardingAndAccess
    // Keep it for compatibility but it should not be called
    console.log('PaywallGate: checkAccess called - this should not happen in simple flow');
  };

  const handleOnboardingFinish = async () => {
    setShowOnboarding(false);
    // SIMPLE FLOW: After onboarding, check subscription status directly
    await checkOnboardingAndAccess();
  };

  // Check entitlements whenever this screen is focused (cold start, returns, etc.)
  useFocusEffect(
    useCallback(() => {
      if (IS_NATIVE && !IS_EXPO_GO) {
        const now = Date.now();
        const timeSinceLastCheck = now - lastFocusCheckRef.current;
        
        // Debounce focus checks - only run if it's been more than 1 second since last check
        if (timeSinceLastCheck < 1000) {
          console.log('PaywallGate: Skipping focus check - too soon since last check');
          return;
        }
        
        lastFocusCheckRef.current = now;
        
        // Clear any existing timeout
        if (focusCheckTimeoutRef.current) {
          clearTimeout(focusCheckTimeoutRef.current);
        }
        
        // Debounce the actual check
        focusCheckTimeoutRef.current = setTimeout(async () => {
                 try {
                   console.log('PaywallGate: Screen focused, checking entitlements...');
                   
                   // Check database first
                   const hasActiveSub = await hasActiveSubscription();
                   if (hasActiveSub) {
                     console.log('PaywallGate: dbSubStatus=active, decision=navigate:Home');
                     setDbSubStatus('active');
                     setPro(true);
                     setTrialActive(false);
                     setTrialDays(0);
                     setCanAccess(true);
                     setHasPremiumEntitlement(true);
                     if (!hasNavigated) {
                       navigateToMainApp();
                     }
                     return;
                   }

                   // Only check RevenueCat if user is authenticated
                   const { data: sessionData } = await getSession();
                   if (!sessionData?.session) {
                     console.log('PaywallGate: Focus check - no authenticated session, skipping RC check');
                     return;
                   }

                   const info = await Purchases.getCustomerInfo();
                   
                   console.log('PaywallGate: Focus check - entitlements:', {
                     hasActiveEntitlements: !!info?.entitlements?.active,
                     activeEntitlements: Object.keys(info?.entitlements?.active || {}),
                     hasPremium: hasActivePremiumEntitlement(info)
                   });
                   
                   if (hasActivePremiumEntitlement(info)) {
                     console.log('PaywallGate: Active entitlement found on focus, running restore');
                     await handleRestore();
                   }
                 } catch (e) {
                   console.log('PaywallGate: Focus check error:', e);
                 }
        }, 300); // 300ms debounce
      }
    }, [hasActivePremiumEntitlement, navigateToMainApp])
  );

  const handleStartTrial = async () => {
    console.log('PaywallGate: Buy Subscription button clicked');
    
    setPurchasing(true);
    try {
      if (IS_NATIVE && !IS_EXPO_GO) {
        console.log('PaywallGate: Using RevenueCat for native app');
        
        try {
          // Try to purchase first available package
          const packages = await getPackages();
          if (packages && packages.length > 0) {
            console.log('PaywallGate: Attempting to purchase package:', packages[0].identifier);
            const { customerInfo } = await Purchases.purchasePackage(packages[0]);
            
            // Check entitlements immediately after purchase
            if (hasActivePremiumEntitlement(customerInfo)) {
              console.log('PaywallGate: Purchase successful, entitlement active');
              setPro(true);
              setTrialActive(false);
              setTrialDays(0);
              setCanAccess(true);
              setHasPremiumEntitlement(true);
              if (!hasNavigated) {
                navigateToMainApp();
              }
              return;
            } else {
              // Give RevenueCat a moment to update, then check again
              console.log('PaywallGate: Entitlement not immediately active, refreshing...');
              const refreshed = await Purchases.getCustomerInfo();
              if (hasActivePremiumEntitlement(refreshed)) {
                console.log('PaywallGate: Entitlement active after refresh');
                setPro(true);
                setTrialActive(false);
                setTrialDays(0);
                setCanAccess(true);
                setHasPremiumEntitlement(true);
                if (!hasNavigated) {
                  navigateToMainApp();
                }
                return;
              }
            }
          }
        } catch (purchaseError: any) {
          console.log('PaywallGate: Purchase error:', purchaseError);
          
          // Handle "already subscribed" case - treat as success
          if (purchaseError.userCancelled) {
            console.log('PaywallGate: User cancelled purchase');
            return;
          }
          
          if (String(purchaseError?.code || purchaseError?.message).includes('already') || 
              String(purchaseError?.code || purchaseError?.message).includes('owned') ||
              purchaseError?.code === 'ProductAlreadyPurchasedError') {
            console.log('PaywallGate: User already owns subscription, treating as success');
            await handleRestore();
            return;
          }
        }
      } else {
        console.log('PaywallGate: Using device trial for Expo Go/Web');
        // Expo Go/Web: use device trial
        await ensureTrialStart();
        await checkOnboardingAndAccess();
      }
    } catch (error) {
      console.error('PaywallGate: Purchase error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log('PaywallGate: Restore button clicked');
    
    if (IS_EXPO_GO || Platform.OS === 'web') {
      console.log('PaywallGate: Restore not available on Expo Go/Web');
      return;
    }
    
    setRestoring(true);
    try {
      console.log('PaywallGate: Calling restore()...');
      const info = await Purchases.restorePurchases();
      
      console.log('PaywallGate: Restore result:', {
        hasActiveEntitlements: !!info?.entitlements?.active,
        activeEntitlements: Object.keys(info?.entitlements?.active || {}),
        hasPremium: hasActivePremiumEntitlement(info)
      });
      
      if (hasActivePremiumEntitlement(info)) {
        console.log('PaywallGate: Restore successful, entitlement active');
        setPro(true);
        setTrialActive(false);
        setTrialDays(0);
        setCanAccess(true);
        setHasPremiumEntitlement(true);
        if (!hasNavigated) {
          navigateToMainApp();
        }
      } else {
        console.log('PaywallGate: No active subscription found on this account');
      }
    } catch (error) {
      console.error('PaywallGate: Restore error:', error);
    } finally {
      setRestoring(false);
    }
  };

  const openTerms = () => {
    Linking.openURL('https://easypalmreadings.com/privacy_truckers.html');
  };

  const openPrivacy = () => {
    Linking.openURL('https://easypalmreadings.com/privacy_truckers.html');
  };

  if (showSplash) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }

  console.log('PaywallGate: Rendering with state:', {
    loading,
    showOnboarding,
    canAccess,
    hasPremiumEntitlement,
    pro,
    trialActive,
    trialDays,
    dbSubStatus
  });

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
        
               <Text style={styles.title}>Buy Subscription</Text>
        
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

        {pro && (
          <View style={styles.proInfo}>
            <Text style={styles.proText}>
              ✅ You have active subscription
            </Text>
          </View>
        )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.startTrialButton, 
                  (purchasing || hasPremiumEntitlement) && styles.buttonDisabled,
                  hasPremiumEntitlement && styles.continueButton
                ]}
                onPress={hasPremiumEntitlement ? navigateToMainApp : handleStartTrial}
                disabled={purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {hasPremiumEntitlement ? (
                      <ArrowRight size={20} color="#FFFFFF" />
                    ) : (
                      <Crown size={20} color="#FFFFFF" />
                    )}
                           <Text style={styles.startTrialButtonText}>
                             {hasPremiumEntitlement ? 'Continue' : 'Buy Subscription'}
                           </Text>
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
  proInfo: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
  },
  proText: {
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
      continueButton: {
        backgroundColor: '#10B981',
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