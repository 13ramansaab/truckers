// utils/trial.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRIAL_START_KEY = 'trialStartedAt';
const TRIAL_DURATION_DAYS = 14;

// Initialize trial on first run
export const initializeTrial = async (): Promise<void> => {
  try {
    const existingTrial = await AsyncStorage.getItem(TRIAL_START_KEY);
    if (!existingTrial) {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(TRIAL_START_KEY, now);
    }
  } catch (error) {
    console.error('Error initializing trial:', error);
  }
};

// Check if trial is still active
export const isTrialActive = async (): Promise<boolean> => {
  try {
    const trialStartStr = await AsyncStorage.getItem(TRIAL_START_KEY);
    if (!trialStartStr) {
      // No trial started yet, initialize it
      await initializeTrial();
      return true;
    }
    
    const trialStart = new Date(trialStartStr);
    const now = new Date();
    const daysDiff = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff <= TRIAL_DURATION_DAYS;
  } catch (error) {
    console.error('Error checking trial status:', error);
    return false;
  }
};

// Stub for subscription check (TODO: integrate real billing)
export const isSubscribed = async (): Promise<boolean> => {
  // TODO: Implement real subscription check
  return false;
};

// Check if user can export
export const canExport = async (): Promise<boolean> => {
  const trialActive = await isTrialActive();
  const subscribed = await isSubscribed();
  return trialActive || subscribed;
};

// Get remaining trial days
export const getRemainingTrialDays = async (): Promise<number> => {
  try {
    const trialStartStr = await AsyncStorage.getItem(TRIAL_START_KEY);
    if (!trialStartStr) {
      return TRIAL_DURATION_DAYS;
    }
    
    const trialStart = new Date(trialStartStr);
    const now = new Date();
    const daysDiff = (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.max(0, TRIAL_DURATION_DAYS - Math.floor(daysDiff));
  } catch (error) {
    console.error('Error getting remaining trial days:', error);
    return 0;
  }
};