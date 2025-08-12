// utils/iap.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo } from 'react-native-purchases';

const IS_EXPO_GO = Constants?.appOwnership === 'expo';
const NATIVE_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let inited = false;
let cachedPro = false;

export function isPro(info?: CustomerInfo | null) {
  return !!info?.entitlements?.active?.pro;
}

export async function initIAP() {
  if (inited) return;
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) { inited = true; return; } // skip in web/Expo Go

  if (Platform.OS === 'ios') {
    await Purchases.configure({ apiKey: 'appl_jdGcqdPCjFHqUcJKOJOzdWrYreI' });
  } else {
    // TODO: add Android public SDK key when ready (goog_...)
    inited = true; 
    return;
  }

  Purchases.addCustomerInfoUpdateListener((info) => { cachedPro = isPro(info); });
  try {
    const info = await Purchases.getCustomerInfo();
    cachedPro = isPro(info);
  } catch {}
  inited = true;
}

export async function getProStatus(): Promise<boolean> {
  await initIAP();
  return cachedPro; // false on web/Expo Go
}

export async function getPackages() {
  await initIAP();
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) return [];
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchaseFirstAvailable(): Promise<boolean> {
  await initIAP();
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) return false;
  const pkgs = await getPackages();
  if (!pkgs.length) return false;
  const { customerInfo } = await Purchases.purchasePackage(pkgs[0]);
  cachedPro = isPro(customerInfo);
  return cachedPro;
}

export async function restore(): Promise<boolean> {
  await initIAP();
  if (!NATIVE_SUPPORTED || IS_EXPO_GO) return false;
  const { customerInfo } = await Purchases.restorePurchases();
  cachedPro = isPro(customerInfo);
  return cachedPro;
}

// ✅ alias to fix callers expecting this name
export const getSubscriptionState = getProStatus;
