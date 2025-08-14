import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from './profile';

// AsyncStorage-backed preference utilities
export const getUnit = async (): Promise<'us' | 'metric'> => {
  try {
    const value = await AsyncStorage.getItem('settings.unitSystem');
    return (value as 'us' | 'metric') || 'us';
  } catch (error) {
    console.error('Error getting unit preference:', error);
    return 'us';
  }
};

export const setUnit = async (value: 'us' | 'metric'): Promise<void> => {
  try {
    await AsyncStorage.setItem('settings.unitSystem', value);
  } catch (error) {
    console.error('Error setting unit preference:', error);
    throw error;
  }
};

export const getPreferredUnit = async (): Promise<'us' | 'metric'> => {
  try {
    const profile = await getProfile();
    if (profile?.unit_system) {
      return profile.unit_system;
    }
    // Fallback to stored preference
    return await getUnit();
  } catch (error) {
    console.error('Error getting preferred unit:', error);
    return 'us';
  }
};

export const getPreferredCurrency = async (): Promise<'USD' | 'CAD'> => {
  try {
    const profile = await getProfile();
    if (profile?.currency) {
      return profile.currency;
    }
    return 'USD';
  } catch (error) {
    console.error('Error getting preferred currency:', error);
    return 'USD';
  }
};

export const getTheme = async (): Promise<'system' | 'light' | 'dark'> => {
  try {
    const value = await AsyncStorage.getItem('settings.theme');
    return (value as 'system' | 'light' | 'dark') || 'dark';
  } catch (error) {
    console.error('Error getting theme preference:', error);
    return 'dark';
  }
};

export const setTheme = async (value: 'system' | 'light' | 'dark'): Promise<void> => {
  try {
    await AsyncStorage.setItem('settings.theme', value);
  } catch (error) {
    console.error('Error setting theme preference:', error);
    throw error;
  }
};

export const getGpsHighAccuracy = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem('settings.gpsHighAccuracy');
    return value === 'true';
  } catch (error) {
    console.error('Error getting GPS accuracy preference:', error);
    return true; // Default to high accuracy
  }
};

export const setGpsHighAccuracy = async (value: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem('settings.gpsHighAccuracy', value.toString());
  } catch (error) {
    console.error('Error setting GPS accuracy preference:', error);
  }
};