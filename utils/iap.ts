import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Product IDs - these need to match your App Store Connect/Google Play Console configuration
export const SUBSCRIPTION_PRODUCT_ID = 'com.yourapp.monthly_subscription'; // You need to provide this
export const SUBSCRIPTION_PRICE = '$9.99';

// IAP state management
const IAP_STATE_KEY = 'iap.subscriptionState';
const IAP_RECEIPT_KEY = 'iap.lastReceipt';

export interface SubscriptionState {
  isSubscribed: boolean;
  productId: string | null;
  purchaseDate: string | null;
  expirationDate: string | null;
  isInTrial: boolean;
  trialEndDate: string | null;
}

// Get current subscription state
export async function getSubscriptionState(): Promise<SubscriptionState> {
  try {
    const stateJson = await AsyncStorage.getItem(IAP_STATE_KEY);
    if (!stateJson) {
      return {
        isSubscribed: false,
        productId: null,
        purchaseDate: null,
        expirationDate: null,
        isInTrial: false,
        trialEndDate: null,
      };
    }
    return JSON.parse(stateJson);
  } catch (error) {
    console.error('Error getting subscription state:', error);
    return {
      isSubscribed: false,
      productId: null,
      purchaseDate: null,
      expirationDate: null,
      isInTrial: false,
      trialEndDate: null,
    };
  }
}

// Save subscription state
export async function saveSubscriptionState(state: SubscriptionState): Promise<void> {
  try {
    await AsyncStorage.setItem(IAP_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving subscription state:', error);
  }
}

// Check if user has active subscription (including trial)
export async function hasActiveSubscription(): Promise<boolean> {
  const state = await getSubscriptionState();
  
  if (state.isSubscribed) {
    // Check if subscription is still valid
    if (state.expirationDate) {
      const expirationDate = new Date(state.expirationDate);
      return expirationDate > new Date();
    }
    return true;
  }
  
  // Check if in trial period
  if (state.isInTrial && state.trialEndDate) {
    const trialEndDate = new Date(state.trialEndDate);
    return trialEndDate > new Date();
  }
  
  return false;
}

// Initialize IAP (placeholder - needs RevenueCat implementation)
export async function initializeIAP(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.warn('IAP not supported on web platform');
    return false;
  }
  
  try {
    // TODO: Initialize RevenueCat SDK
    // This requires native implementation
    console.log('IAP initialization - requires RevenueCat setup');
    return true;
  } catch (error) {
    console.error('Error initializing IAP:', error);
    return false;
  }
}

// Get available products (placeholder)
export async function getAvailableProducts(): Promise<any[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  
  try {
    // TODO: Fetch products from RevenueCat
    // Return mock product for now
    return [{
      identifier: SUBSCRIPTION_PRODUCT_ID,
      price: SUBSCRIPTION_PRICE,
      title: 'Monthly Subscription',
      description: 'Unlimited exports and premium features',
      introductoryPrice: {
        price: '$0.00',
        period: 'P3D', // 3 days
        cycles: 1,
      }
    }];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// Purchase subscription (placeholder)
export async function purchaseSubscription(productId: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.warn('IAP not supported on web platform');
    return false;
  }
  
  try {
    // TODO: Implement RevenueCat purchase
    console.log('Purchase subscription:', productId);
    
    // Mock successful purchase with trial
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
    const subscriptionEndDate = new Date(trialEndDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after trial
    
    const newState: SubscriptionState = {
      isSubscribed: true,
      productId,
      purchaseDate: now.toISOString(),
      expirationDate: subscriptionEndDate.toISOString(),
      isInTrial: true,
      trialEndDate: trialEndDate.toISOString(),
    };
    
    await saveSubscriptionState(newState);
    return true;
  } catch (error) {
    console.error('Error purchasing subscription:', error);
    return false;
  }
}

// Restore purchases (placeholder)
export async function restorePurchases(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.warn('IAP not supported on web platform');
    return false;
  }
  
  try {
    // TODO: Implement RevenueCat restore
    console.log('Restoring purchases...');
    
    // For now, just check if we have any stored state
    const state = await getSubscriptionState();
    return state.isSubscribed;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return false;
  }
}

// Check subscription status (placeholder)
export async function checkSubscriptionStatus(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    // TODO: Implement RevenueCat status check
    console.log('Checking subscription status...');
    
    const state = await getSubscriptionState();
    if (state.isInTrial && state.trialEndDate) {
      const trialEndDate = new Date(state.trialEndDate);
      if (trialEndDate <= new Date()) {
        // Trial ended, update state
        const updatedState = {
          ...state,
          isInTrial: false,
        };
        await saveSubscriptionState(updatedState);
      }
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
  }
}