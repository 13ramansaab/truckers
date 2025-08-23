// RevenueCat Configuration
// This file contains all RevenueCat-related configuration

export const REVENUECAT_CONFIG = {
  ios: {
    apiKey: 'appl_jdGcqdPCjFHqUcJKOJOzdWrYreI',
    offeringId: 'ofrngb819af58c8',
    monthlyProductId: '$rc_monthly',
    entitlementId: 'pro' // The entitlement that grants pro access
  },
  android: {
    apiKey: 'goog_rHRrdgkkUKXhGJSDmarzCZYwXoD', // TODO: Replace with your Android public SDK key from RevenueCat
    offeringId: 'ofrngb819af58c8',
    monthlyProductId: '$rc_monthly',
    entitlementId: 'pro'
  }
} as const;

// Helper function to get platform-specific config
export function getRevenueCatConfig(platform: 'ios' | 'android') {
  return REVENUECAT_CONFIG[platform];
}

// Helper function to get the offering ID
export function getOfferingId() {
  return REVENUECAT_CONFIG.ios.offeringId;
}

// Helper function to get the monthly product ID
export function getMonthlyProductId() {
  return REVENUECAT_CONFIG.ios.monthlyProductId;
}

// Helper function to get the entitlement ID
export function getEntitlementId() {
  return REVENUECAT_CONFIG.ios.entitlementId;
}
