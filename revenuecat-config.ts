// RevenueCat Configuration
// This file contains all RevenueCat-related configuration

export const REVENUECAT_CONFIG = {
  ios: {
    apiKey: 'appl_jdGcqdPCjFHqUcJKOJOzdWrYreI',
    offeringId: 'ofrngb819af58c8',
    monthlyProductId: 'trucker_monthly_ios',
    entitlementId: 'entlbe60acd0e1' // The entitlement that grants pro access
  },
  android: {
    apiKey: 'goog_rHRrdgkkUKXhGJSDmarzCZYwXoD', // TODO: Replace with your Android public SDK key from RevenueCat
    offeringId: 'ofrngb819af58c8',
    monthlyProductId: 'trucker_monthly_android',
    entitlementId: 'entlbe60acd0e1'
  }
} as const;

// Helper function to get platform-specific config
export function getRevenueCatConfig(platform: 'ios' | 'android') {
  return REVENUECAT_CONFIG[platform];
}

// Helper function to get the offering ID
export function getOfferingId(platform: 'ios' | 'android' = 'ios') {
  return REVENUECAT_CONFIG[platform].offeringId;
}

// Helper function to get the monthly product ID
export function getMonthlyProductId(platform: 'ios' | 'android' = 'ios') {
  return REVENUECAT_CONFIG[platform].monthlyProductId;
}

// Helper function to get the entitlement ID
export function getEntitlementId(platform: 'ios' | 'android' = 'ios') {
  return REVENUECAT_CONFIG[platform].entitlementId;
}
