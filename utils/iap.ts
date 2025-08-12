// utils/iap.ts
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PACKAGE_TYPE } from 'react-native-purchases';

let inited = false;
let cachedPro: boolean | null = null;

export async function initIAP() {
  if (inited) return;
  await Purchases.configure({
    apiKey: Platform.select({
      ios: 'appl_jdGcqdPCjFHqUcJKOJOzdWrYreI',
      android: 'todo_android_public_key', // leave as is
    })!,
  });
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
  await initIAP();
  if (cachedPro != null) return cachedPro;
  try {
    const info = await Purchases.getCustomerInfo();
    cachedPro = isPro(info);
    return cachedPro;
  } catch {
    return false;
  }
}

export async function getPackages() {
  await initIAP();
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchaseFirstAvailable(): Promise<boolean> {
  await initIAP();
  const pkgs = await getPackages();
  if (!pkgs.length) return false;
  const { customerInfo } = await Purchases.purchasePackage(pkgs[0]);
  cachedPro = isPro(customerInfo);
  return !!cachedPro;
}

export async function restore(): Promise<boolean> {
  await initIAP();
  const { customerInfo } = await Purchases.restorePurchases();
  cachedPro = isPro(customerInfo);
  return !!cachedPro;
}