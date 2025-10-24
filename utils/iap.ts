import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, PURCHASE_TYPE } from 'react-native-purchases';
import { getRevenueCatConfig, getOfferingId, getMonthlyProductId, getEntitlementId } from '~/revenuecat-config';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';
const NATIVE_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let inited = false;
let cachedPro = false;

export function isPro(info?: CustomerInfo | null) {
  const entitlementId = getEntitlementId(Platform.OS as 'ios' | 'android');
  return !!info?.entitlements?.active?.[entitlementId];
}

export async function initIAP() {
  if (inited) {
    console.log('RevenueCat: Already initialized, skipping');
    return;
  }
  
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) { 
    console.log('RevenueCat: Skipping initialization (Expo Go or unsupported platform)');
    inited = true; 
    return; 
  }

  try {
    if (Platform.OS === 'ios') {
      const config = getRevenueCatConfig('ios');
      console.log('RevenueCat: Initializing with iOS config');
      await Purchases.configure({ apiKey: config.apiKey });
    } else if (Platform.OS === 'android') {
      const config = getRevenueCatConfig('android');
      if (config.apiKey && config.apiKey.startsWith('goog_')) {
        console.log('RevenueCat: Initializing with Android config');
        await Purchases.configure({ apiKey: config.apiKey });
      } else {
        console.log('RevenueCat: Android API key not configured, skipping initialization');
        inited = true;
        return;
      }
    }

    Purchases.addCustomerInfoUpdateListener((info) => { 
      cachedPro = isPro(info); 
      console.log('RevenueCat: Customer info updated, pro status:', cachedPro);
    });
    
    try {
      const info = await Purchases.getCustomerInfo();
      cachedPro = isPro(info);
      console.log('RevenueCat: Initialized successfully, pro status:', cachedPro);
    } catch (customerError) {
      console.warn('RevenueCat: Could not get customer info:', customerError);
    }
    
    inited = true;
  } catch (error) {
    console.error('RevenueCat: Initialization failed:', error);
    inited = true; // Prevent retry loops
    throw error;
  }
}

export async function getProStatus(): Promise<boolean> {
  try {
    console.log('RevenueCat: Getting pro status...');
    
    // Check if user is authenticated before making RC calls
    const { getSession } = await import('~/utils/auth');
    const { data: sessionData } = await getSession();
    if (!sessionData?.session) {
      console.log('RevenueCat: No authenticated session, returning false for pro status');
      return false;
    }
    
    await initIAP();
    
    // Force refresh customer info to get latest subscription status
    if (NATIVE_SUPPORTED && !IS_EXPO_GO) {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        cachedPro = isPro(customerInfo);
        console.log('RevenueCat: Fresh customer info:', {
          hasActiveEntitlements: !!customerInfo?.entitlements?.active,
          activeEntitlements: Object.keys(customerInfo?.entitlements?.active || {}),
          proStatus: cachedPro
        });
      } catch (customerError) {
        console.warn('RevenueCat: Could not get fresh customer info:', customerError);
      }
    }
    
    console.log('RevenueCat: Pro status:', cachedPro);
    return cachedPro; // false on web/Expo Go
  } catch (error) {
    console.warn('RevenueCat: Could not get pro status:', error);
    return false;
  }
}

export async function logInToPurchases(userId: string) {
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) {
    console.log('RevenueCat: Skipping login (Expo Go or unsupported platform)');
    return;
  }

  try {
    await initIAP();
    console.log('RevenueCat: Logging in user:', userId);
    await Purchases.logIn(userId);
    console.log('RevenueCat: Successfully logged in user:', userId);
  } catch (error) {
    console.error('RevenueCat: Failed to log in user:', error);
    throw error;
  }
}

export async function logOutFromPurchases() {
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) {
    console.log('RevenueCat: Skipping logout (Expo Go or unsupported platform)');
    return;
  }

  try {
    await initIAP();
    console.log('RevenueCat: Logging out user');
    await Purchases.logOut();
    console.log('RevenueCat: Successfully logged out user');
  } catch (error) {
    console.error('RevenueCat: Failed to log out user:', error);
    throw error;
  }
}

export function getRevenueCatStatus() {
  return {
    inited,
    nativeSupported: NATIVE_SUPPORTED,
    isExpoGo: IS_EXPO_GO,
    platform: Platform.OS
  };
}

export async function getMonthlySubscriptionPackage() {
  try {
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) return null;
  } catch (error) {
    console.warn('RevenueCat: Could not get monthly subscription package:', error);
    return null;
  }
  
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[getOfferingId(Platform.OS as 'ios' | 'android')] || offerings.current;
    if (!offering) return null;
    
    // Find the monthly subscription package
    const monthlyPackage = offering.availablePackages.find(
      pkg => pkg.product.identifier === getMonthlyProductId(Platform.OS as 'ios' | 'android')
    );
    
    return monthlyPackage || null;
  } catch (error) {
    console.warn('Failed to get monthly subscription package:', error);
    return null;
  }
}

export async function getPackages() {
  try {
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) return [];

    // Check if user is authenticated before making RC calls
    const { getSession } = await import('~/utils/auth');
    const { data: sessionData } = await getSession();
    if (!sessionData?.session) {
      console.log('RevenueCat: No authenticated session, returning empty packages');
      return [];
    }

    const offerings = await Purchases.getOfferings();
    // Use the specific offering ID from RevenueCat
    const offering = offerings.all[getOfferingId(Platform.OS as 'ios' | 'android')] || offerings.current;
    return offering?.availablePackages ?? [];
  } catch (error) {
    console.warn('RevenueCat: Could not get packages:', error);
    return [];
  }
}

export async function purchaseFirstAvailable(): Promise<boolean> {
  try {
    console.log('RevenueCat: Starting purchase process...');
    
    // Check if user is authenticated before making RC calls
    const { getSession } = await import('~/utils/auth');
    const { data: sessionData } = await getSession();
    if (!sessionData?.session) {
      console.log('RevenueCat: No authenticated session, cannot purchase');
      return false;
    }
    
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) {
      console.log('RevenueCat: Not supported on this platform');
      return false;
    }
  } catch (error) {
    console.warn('RevenueCat: Could not purchase package:', error);
    // For development, simulate a successful purchase
    if (__DEV__) {
      console.log('RevenueCat: Development mode - simulating successful purchase');
      cachedPro = true;
      return true;
    }
    return false;
  }
  
  try {
    // Try to get the specific monthly subscription package
    console.log('RevenueCat: Getting monthly subscription package...');
    const monthlyPackage = await getMonthlySubscriptionPackage();
    if (monthlyPackage) {
      console.log('RevenueCat: Found monthly package:', monthlyPackage.product.identifier);
      try {
        // First try with purchasePackage
        console.log('RevenueCat: Attempting package purchase...');
        const result = await Purchases.purchasePackage(monthlyPackage);
        console.log('RevenueCat: Package purchase successful:', result);
        cachedPro = isPro(result.customerInfo);
        return cachedPro;
      } catch (packageError) {
        console.log('RevenueCat: Package purchase failed, trying product purchase:', packageError);
        // Fallback to purchaseProduct with PURCHASE_TYPE.SUBS
        console.log('RevenueCat: Attempting product purchase with PURCHASE_TYPE.SUBS:', monthlyPackage.product.identifier);
        const result = await Purchases.purchaseProduct(
          monthlyPackage.product.identifier,
          null,
          PURCHASE_TYPE.SUBS
        );
        console.log('RevenueCat: Product purchase successful:', result);
        cachedPro = isPro(result.customerInfo);
        return cachedPro;
      }
    }
    
    // Fallback to first available package
    console.log('RevenueCat: No monthly package found, trying first available...');
    const pkgs = await getPackages();
    if (!pkgs.length) {
      console.log('RevenueCat: No packages available');
      return false;
    }
    
    console.log('RevenueCat: Found packages:', pkgs.map(p => p.product.identifier));
    try {
      const result = await Purchases.purchasePackage(pkgs[0]);
      console.log('RevenueCat: Fallback package purchase successful:', result);
      cachedPro = isPro(result.customerInfo);
      return cachedPro;
    } catch (packageError) {
      console.log('RevenueCat: Fallback package purchase failed, trying product purchase:', packageError);
      // Fallback to purchaseProduct with PURCHASE_TYPE.SUBS
      console.log('RevenueCat: Attempting product purchase with PURCHASE_TYPE.SUBS (fallback):', pkgs[0].product.identifier);
      const result = await Purchases.purchaseProduct(
        pkgs[0].product.identifier,
        null,
        PURCHASE_TYPE.SUBS
      );
      console.log('RevenueCat: Fallback product purchase successful:', result);
      cachedPro = isPro(result.customerInfo);
      return cachedPro;
    }
  } catch (error) {
    console.error('RevenueCat: Purchase failed:', error);
    return false;
  }
}

export async function restore(): Promise<boolean> {
  try {
    console.log('RevenueCat: Starting restore process...');
    
    // Check if user is authenticated before making RC calls
    const { getSession } = await import('~/utils/auth');
    const { data: sessionData } = await getSession();
    if (!sessionData?.session) {
      console.log('RevenueCat: No authenticated session, cannot restore');
      return false;
    }
    
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) {
      console.log('RevenueCat: Not supported on this platform');
      return false;
    }
    console.log('RevenueCat: Calling Purchases.restorePurchases()...');
    const customerInfo = await Purchases.restorePurchases();
    console.log('RevenueCat: Restore successful, customer info:', customerInfo);
    cachedPro = isPro(customerInfo);
    console.log('RevenueCat: Pro status after restore:', cachedPro);
    return cachedPro;
  } catch (error) {
    console.error('RevenueCat: Could not restore purchases:', error);
    return false;
  }
}

// Purchase a specific product with correct PURCHASE_TYPE.SUBS
export async function purchaseProduct(productId: string): Promise<boolean> {
  try {
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) return false;
    
    const result = await Purchases.purchaseProduct(
      productId,
      null,
      PURCHASE_TYPE.SUBS
    );
    
    cachedPro = isPro(result.customerInfo);
    return cachedPro;
  } catch (error) {
    console.error('Product purchase failed:', error);
    // For development, simulate a successful purchase
    if (__DEV__) {
      console.log('RevenueCat: Development mode - simulating successful product purchase');
      cachedPro = true;
      return true;
    }
    return false;
  }
}

// Alias for existing calls
export const getSubscriptionState = getProStatus;