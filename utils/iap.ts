import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo, PURCHASE_TYPE } from 'react-native-purchases';
import { getRevenueCatConfig, getOfferingId, getMonthlyProductId, getEntitlementId } from '~/revenuecat-config';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';
const NATIVE_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let inited = false;
let cachedPro = false;

export function isPro(info?: CustomerInfo | null) {
  const entitlementId = getEntitlementId();
  return !!info?.entitlements?.active?.[entitlementId];
}

export async function initIAP() {
  if (inited) return;
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
    });
    
    try {
      const info = await Purchases.getCustomerInfo();
      cachedPro = isPro(info);
      console.log('RevenueCat: Initialized successfully');
    } catch (customerError) {
      console.warn('RevenueCat: Could not get customer info:', customerError);
    }
    
    inited = true;
  } catch (error) {
    console.error('RevenueCat: Initialization failed:', error);
    // Don't set inited = true on error, so we can retry
    throw error;
  }
}

export async function getProStatus(): Promise<boolean> {
  try {
    await initIAP();
    return cachedPro; // false on web/Expo Go
  } catch (error) {
    console.warn('RevenueCat: Could not get pro status:', error);
    return false;
  }
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
    const offering = offerings.all[getOfferingId()] || offerings.current;
    if (!offering) return null;
    
    // Find the monthly subscription package
    const monthlyPackage = offering.availablePackages.find(
      pkg => pkg.product.identifier === getMonthlyProductId()
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
  } catch (error) {
    console.warn('RevenueCat: Could not get packages:', error);
    return [];
  }
  
  try {
    const offerings = await Purchases.getOfferings();
    // Use the specific offering ID from RevenueCat
    const offering = offerings.all[getOfferingId()] || offerings.current;
    return offering?.availablePackages ?? [];
  } catch (error) {
    console.warn('Failed to get packages:', error);
    return [];
  }
}

export async function purchaseFirstAvailable(): Promise<boolean> {
  try {
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) return false;
  } catch (error) {
    console.warn('RevenueCat: Could not purchase package:', error);
    return false;
  }
  
  try {
    // Try to get the specific monthly subscription package
    const monthlyPackage = await getMonthlySubscriptionPackage();
    if (monthlyPackage) {
      try {
        // First try with purchasePackage
        const result = await Purchases.purchasePackage(monthlyPackage);
        cachedPro = isPro(result.customerInfo);
        return cachedPro;
      } catch (packageError) {
        console.log('Package purchase failed, trying product purchase:', packageError);
        // Fallback to purchaseProduct with PURCHASE_TYPE.SUBS
        console.log('Attempting product purchase with PURCHASE_TYPE.SUBS:', monthlyPackage.product.identifier);
        const result = await Purchases.purchaseProduct(
          monthlyPackage.product.identifier,
          null,
          PURCHASE_TYPE.SUBS
        );
        console.log('Product purchase successful:', result);
        cachedPro = isPro(result.customerInfo);
        return cachedPro;
      }
    }
    
    // Fallback to first available package
    const pkgs = await getPackages();
    if (!pkgs.length) return false;
    
    try {
      const result = await Purchases.purchasePackage(pkgs[0]);
      cachedPro = isPro(result.customerInfo);
      return cachedPro;
    } catch (packageError) {
      console.log('Package purchase failed, trying product purchase:', packageError);
              // Fallback to purchaseProduct with PURCHASE_TYPE.SUBS
        console.log('Attempting product purchase with PURCHASE_TYPE.SUBS (fallback):', pkgs[0].product.identifier);
        const result = await Purchases.purchaseProduct(
          pkgs[0].product.identifier,
          null,
          PURCHASE_TYPE.SUBS
        );
        console.log('Product purchase successful (fallback):', result);
        cachedPro = isPro(result.customerInfo);
        return cachedPro;
    }
  } catch (error) {
    console.error('Purchase failed:', error);
    return false;
  }
}

export async function restore(): Promise<boolean> {
  try {
    await initIAP();
    if (!NATIVE_SUPPORTED || IS_EXPO_GO) return false;
    const customerInfo = await Purchases.restorePurchases();
    cachedPro = isPro(customerInfo);
    return cachedPro;
  } catch (error) {
    console.warn('RevenueCat: Could not restore purchases:', error);
    return false;
  }
}

export async function logInToPurchases(userId: string): Promise<void> {
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) return;
  await initIAP();
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.warn('Failed to log in to RevenueCat:', error);
  }
}

export async function logOutFromPurchases(): Promise<void> {
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('Failed to log out from RevenueCat:', error);
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
    return false;
  }
}

// Alias for existing calls
export const getSubscriptionState = getProStatus;