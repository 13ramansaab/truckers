// utils/units.ts
export type UnitSystem = 'us' | 'metric';

// Exact conversion constants
const LITERS_PER_GALLON = 3.78541;
const KM_PER_MILE = 1.609344;

// Distance conversions
export const miToKm = (miles: number): number => miles * KM_PER_MILE;
export const kmToMi = (km: number): number => km / KM_PER_MILE;

// Volume conversions
export const galToL = (gallons: number): number => gallons * LITERS_PER_GALLON;
export const lToGal = (liters: number): number => liters / LITERS_PER_GALLON;

// Normalize to base units (miles/gallons) for calculations
export const normalizeDistance = (value: number, unitSystem: UnitSystem): number => {
  return unitSystem === 'metric' ? kmToMi(value) : value;
};

export const normalizeVolume = (value: number, unitSystem: UnitSystem): number => {
  return unitSystem === 'metric' ? lToGal(value) : value;
};

// Format for display based on unit system
export const formatDistance = (miles: number, unitSystem: UnitSystem): string => {
  if (unitSystem === 'metric') {
    return `${miToKm(miles).toFixed(1)} km`;
  }
  return `${miles.toFixed(1)} mi`;
};

export const formatVolume = (gallons: number, unitSystem: UnitSystem): string => {
  if (unitSystem === 'metric') {
    return `${galToL(gallons).toFixed(2)} L`;
  }
  return `${gallons.toFixed(2)} gal`;
};

export const formatEfficiency = (mpg: number, unitSystem: UnitSystem): string => {
  if (unitSystem === 'metric') {
    // Convert MPG to km/L: (miles/gallon) * (km/mile) / (L/gallon)
    const kmPerL = (mpg * KM_PER_MILE) / LITERS_PER_GALLON;
    return `${kmPerL.toFixed(2)} km/L`;
  }
  return `${mpg.toFixed(2)} MPG`;
};

export const getDistanceUnit = (unitSystem: UnitSystem): string => {
  return unitSystem === 'metric' ? 'km' : 'mi';
};

export const getVolumeUnit = (unitSystem: UnitSystem): string => {
  return unitSystem === 'metric' ? 'L' : 'gal';
};

// Settings persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

const UNIT_SYSTEM_KEY = 'settings.unitSystem';

export const saveUnitSystem = async (unitSystem: UnitSystem): Promise<void> => {
  try {
    await AsyncStorage.setItem(UNIT_SYSTEM_KEY, unitSystem);
  } catch (error) {
    console.error('Error saving unit system:', error);
  }
};

export const loadUnitSystem = async (): Promise<UnitSystem> => {
  try {
    const saved = await AsyncStorage.getItem(UNIT_SYSTEM_KEY);
    return (saved as UnitSystem) || 'us';
  } catch (error) {
    console.error('Error loading unit system:', error);
    return 'us';
  }
};