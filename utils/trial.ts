import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIAL_KEY = 'trial.startedAt';
const TRIAL_DAYS = 3;

export async function ensureTrialStart(): Promise<void> {
  const existing = await AsyncStorage.getItem(TRIAL_KEY);
  if (!existing) {
    await AsyncStorage.setItem(TRIAL_KEY, new Date().toISOString());
  }
}

export async function daysLeft(): Promise<number> {
  const startedAt = await AsyncStorage.getItem(TRIAL_KEY);
  if (!startedAt) {
    return 0; // No trial started, return 0 days left
  }
  
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const daysPassed = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, TRIAL_DAYS - daysPassed);
}

export async function isTrialActive(): Promise<boolean> {
  return (await daysLeft()) > 0;
}

// Non-auto-starting versions for checking existing state
export async function daysLeftWithoutAutoStart(): Promise<number> {
  const startedAt = await AsyncStorage.getItem(TRIAL_KEY);
  if (!startedAt) {
    return 0; // No trial started, return 0 days left
  }
  
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const daysPassed = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, TRIAL_DAYS - daysPassed);
}

export async function isTrialActiveWithoutAutoStart(): Promise<boolean> {
  return (await daysLeftWithoutAutoStart()) > 0;
}

export async function canUseApp(): Promise<boolean> {
  const { getProStatus } = await import('./iap');
  return (await isTrialActive()) || (await getProStatus());
}

// Alias for compatibility
export async function startDeviceTrial() { 
  return ensureTrialStart(); 
}

// Aliases for old callers
export { canUseApp as hasActiveSubscription };
export { canUseApp as canExport };

// Legacy exports
export async function isSubscribed(): Promise<boolean> {
  const { getProStatus } = await import('./iap');
  return await getProStatus();
}