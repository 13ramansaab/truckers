import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Crown, RefreshCw } from 'lucide-react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ensureTrialStart, isTrialActive, daysLeft } from '@/utils/trial';
import { getProStatus, purchaseFirstAvailable, restore, getPackages } from '@/utils/iap';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';

interface PaywallGateProps {
  children: React.ReactNode;
}

export default function PaywallGate({ children }: PaywallGateProps) {
  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [trialDays, setTrialDays] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoading(true);
    try {
      await ensureTrialStart();
      const [pro, trial, days, packages] = await Promise.all([
        getProStatus(),
        isTrialActive(),
        daysLeft(),
        getPackages(),
      ]);
      
      setCanAccess(pro || trial);
      setTrialDays(days);
      
      // Get price if available
      if (packages.length > 0 && packages[0].product?.priceString) {
        setPrice(packages[0].product.priceString);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setCanAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (IS_EXPO_GO) return;
    
    setPurchasing(true);
    try {
      const success = await purchaseFirstAvailable();
      if (success) {
        await checkAccess();
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (IS_EXPO_GO) return;
    
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
        
        <Text style={styles.title}>Trucker Fuel Tax</Text>
        <Text style={styles.subtitle}>
          Professional IFTA tracking and reporting for owner-operators
        </Text>

        {trialDays > 0 && (
          <View style={styles.trialInfo}>
            <Text style={styles.trialText}>
              Trial: {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!IS_EXPO_GO && (
            <TouchableOpacity
              style={[styles.subscribeButton, purchasing && styles.buttonDisabled]}
              onPress={handleSubscribe}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Crown size={20} color="#FFFFFF" />
                  <Text style={styles.subscribeButtonText}>
                    {price ? `Subscribe ${price}/mo` : 'Subscribe'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!IS_EXPO_GO && (
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
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.trialNote}>
          3-day free trial available on first purchase
        </Text>

        {IS_EXPO_GO && (
          <View style={styles.expoGoNotice}>
            <Text style={styles.expoGoText}>
              Purchases disabled in Expo Go. Install a dev build/TestFlight to subscribe.
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
  subscribeButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  subscribeButtonText: {
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
  trialNote: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
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