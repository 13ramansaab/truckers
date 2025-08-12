// utils/iap.ts
import { Platform } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';

let inited = false;
let cachedPro: boolean | null = null;

export async function initIAP() {
  if (inited) return;

  if (Platform.OS === 'ios') {
    await Purchases.configure({ apiKey: 'appl_jdGcqdPCjFHqUcJKOJOzdWrYreI' });
  } else if (Platform.OS === 'android') {
    // add your Android public key when ready (goog_...)
    // await Purchases.configure({ apiKey: 'goog_XXXXXXXX' });
    return (inited = true);
  } else {
    // web / unsupported: do nothing
    return (inited = true);
  }
  
  Purchases.addCustomerInfoUpdateListener((info) => {
    cachedPro = isPro(info);
  });
  // prime cached status
  try {
    const info = await Purchases.getCustomerInfo();
    cachedPro = isPro(info);
  } catch {}
  inited = true;
}

export function isPro(info: CustomerInfo | null | undefined) {
  return !!info?.entitlements?.active?.pro;
}

export async function getProStatus(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    await initIAP();
  }
  if (cachedPro != null) return cachedPro;
  try {
    if (Platform.OS !== 'web') {
      const info = await Purchases.getCustomerInfo();
      cachedPro = isPro(info);
      return cachedPro;
    }
  } catch {
  }
  return false;
}

export async function getPackages() {
  if (Platform.OS !== 'web') {
    await initIAP();
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  }
  return [];
}

export async function purchaseFirstAvailable(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    await initIAP();
    const pkgs = await getPackages();
    if (!pkgs.length) return false;
    const { customerInfo } = await Purchases.purchasePackage(pkgs[0]);
    cachedPro = isPro(customerInfo);
    return !!cachedPro;
  }
  return false;
}

export async function restore(): Promise<boolean> {
  if (Platform.OS !== 'web') {
    await initIAP();
    const { customerInfo } = await Purchases.restorePurchases();
    cachedPro = isPro(customerInfo);
    return !!cachedPro;
  }
  return false;
}