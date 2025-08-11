import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'trial.startedAt';

export async function ensureTrialStart() {
  const v = await AsyncStorage.getItem(KEY);
  if (!v) {
    await AsyncStorage.setItem(KEY, new Date().toISOString());
  }
}

export async function daysLeft() {
  const v = await AsyncStorage.getItem(KEY);
  if (!v) return 14;
  const d = (Date.now() - Date.parse(v)) / (1000 * 60 * 60 * 24);
  return Math.max(0, 14 - Math.floor(d));
}

export async function isTrialActive() {
  return (await daysLeft()) > 0;
}

export async function isSubscribed() {
  return false; // stub
}

export async function canExport() {
  return (await isTrialActive()) || (await isSubscribed());
}