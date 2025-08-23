// utils/location.ts
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

// ---- Simple geocode cache to avoid rate limits ----
interface GeocodeCache {
  [key: string]: {
    state: string;
    address: string;
    timestamp: number;
  };
}

const geocodeCache: GeocodeCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_DISTANCE_M = 500; // 500 meters
const isExpoGo = Constants.appOwnership === 'expo';

// Round to ~100m precision to create cache zones
const getCacheKey = (coords: LocationCoords): string => {
  const lat = Math.round(coords.latitude * 1000) / 1000;
  const lon = Math.round(coords.longitude * 1000) / 1000;
  return `${lat},${lon}`;
};

export const calculateDistance = (start: LocationCoords, end: LocationCoords): number => {
  try {
    if (!start || !end || 
        typeof start.latitude !== 'number' || typeof start.longitude !== 'number' ||
        typeof end.latitude !== 'number' || typeof end.longitude !== 'number') {
      console.warn('Invalid coordinates for distance calculation');
      return 0;
    }
    
    const R = 3959; // miles
    const dLat = (end.latitude - start.latitude) * (Math.PI / 180);
    const dLon = (end.longitude - start.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(start.latitude * (Math.PI / 180)) *
        Math.cos(end.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100; // 2 dp
  } catch (error) {
    console.warn('Error calculating distance:', error);
    return 0;
  }
};

const isWithinCacheDistance = (a: LocationCoords, b: LocationCoords): boolean => {
  const meters = calculateDistance(a, b) * 1609.34;
  return meters <= CACHE_DISTANCE_M;
};

// --------------------------------------------------
// PERMISSIONS
// --------------------------------------------------
/**
 * Requests location permissions safely across platforms.
 * - Web: no native permission dialog (uses browser geolocation).
 * - iOS/Android in Expo Go: ONLY foreground (avoids Info.plist crash).
 * - iOS/Android in dev/standalone: foreground, then background (optional).
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    // Web: no native dialog
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'geolocation' in navigator;
    }

    // Check if location services are enabled
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        console.warn('Location services are disabled on this device');
        return false;
      }
    } catch (serviceError) {
      console.warn('Could not check if location services are enabled:', serviceError);
    }

    // Check if permission is already granted
    try {
      const currentStatus = await Location.getForegroundPermissionsAsync();
      if (currentStatus.status === 'granted') {
        console.log('Location permission already granted');
        return true;
      }
    } catch (statusError) {
      console.warn('Could not check current permission status:', statusError);
    }

    // Always ask foreground first
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== 'granted') {
        console.warn('Foreground location permission not granted');
        return false;
      }
    } catch (fgError) {
      console.error('Foreground permission request failed:', fgError);
      return false;
    }

    // Background permission ONLY if not Expo Go (requires Info.plist keys + dev/standalone build)
    if (!isExpoGo) {
      try {
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== 'granted') {
          console.warn('Background location permission not granted');
        }
      } catch (bgError) {
        console.warn('Background permission request failed:', bgError);
        // Don't fail the whole request for background permission
      }
    }

    return true;
  } catch (err) {
    console.error('Error requesting location permissions:', err);
    return false;
  }
};

// --------------------------------------------------
// CURRENT LOCATION
// --------------------------------------------------
export const getCurrentLocation = async (useHighAccuracy?: boolean): Promise<LocationCoords | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        console.warn('Geolocation not available on web');
        return null;
      }
      return await new Promise<LocationCoords | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          (err) => {
            console.warn('Web geolocation error:', err);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
    }

    // Native - use high accuracy if specified, otherwise balanced
    const accuracy = useHighAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced;
    const loc = await Location.getCurrentPositionAsync({ accuracy });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch (err) {
    console.error('Error getting current location:', err);
    return null;
  }
};

// --------------------------------------------------
// REVERSE GEOCODE (address)
// --------------------------------------------------
export const reverseGeocode = async (coords: LocationCoords): Promise<string> => {
  const cacheKey = getCacheKey(coords);
  const cached = geocodeCache[cacheKey];

  // fresh cache hit
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.address;
  }

  // near-by cache reuse
  for (const key in geocodeCache) {
    const entry = geocodeCache[key];
    if (Date.now() - entry.timestamp < CACHE_DURATION) {
      const [lat, lon] = key.split(',').map(Number);
      if (isWithinCacheDistance(coords, { latitude: lat, longitude: lon })) {
        return entry.address;
      }
    }
  }

  try {
    if (Platform.OS === 'web') {
      // Keep it simple on web to avoid extra APIs
      return 'Web Location';
    }

    const result = await Location.reverseGeocodeAsync(coords);
    if (result.length > 0) {
      const a = result[0];
      const formatted = `${a.city || ''}, ${a.region || ''} ${a.postalCode || ''}`.trim();

      geocodeCache[cacheKey] = {
        address: formatted,
        state: a.region || 'Unknown',
        timestamp: Date.now(),
      };

      return formatted;
    }
    return 'Unknown Location';
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.includes('rate limit')) {
      console.warn('Geocoding rate limit reached, using fallback');
      return 'Location Unavailable';
    }
    console.error('Error reverse geocoding:', err);
    return 'Unknown Location';
  }
};

// --------------------------------------------------
// REVERSE GEOCODE (state only)
// --------------------------------------------------
export const getStateFromCoords = async (coords: LocationCoords): Promise<string> => {
  const cacheKey = getCacheKey(coords);
  const cached = geocodeCache[cacheKey];

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.state;
  }

  for (const key in geocodeCache) {
    const entry = geocodeCache[key];
    if (Date.now() - entry.timestamp < CACHE_DURATION) {
      const [lat, lon] = key.split(',').map(Number);
      if (isWithinCacheDistance(coords, { latitude: lat, longitude: lon })) {
        return entry.state;
      }
    }
  }

  try {
    if (Platform.OS === 'web') {
      return 'Unknown';
    }

    const result = await Location.reverseGeocodeAsync(coords);
    if (result.length > 0) {
      const a = result[0];
      const state = a.region || 'Unknown';
      const formatted = `${a.city || ''}, ${state} ${a.postalCode || ''}`.trim();

      geocodeCache[cacheKey] = {
        address: formatted,
        state,
        timestamp: Date.now(),
      };

      return state;
    }
    return 'Unknown';
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.includes('rate limit')) {
      console.warn('Geocoding rate limit reached for state lookup, using fallback');
      return 'Unknown';
    }
    console.error('Error getting state from coordinates:', err);
    return 'Unknown';
  }
};
