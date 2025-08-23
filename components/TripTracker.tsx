// components/TripTracker.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Play, Square } from 'lucide-react-native';
import * as Location from 'expo-location';
import { requestLocationPermissions, getCurrentLocation, reverseGeocode, getStateFromCoords } from '~/utils/location';
import { getActiveTrip, insertTrip, updateTrip, insertLocationPoint } from '~/utils/database';
import { shouldSample, isNoisyJump, haversineMi, bucketMilesByState } from '~/utils/ifta';
import { getGpsHighAccuracy } from '~/utils/prefs';
import type { Trip } from '~/types';

type Props = {
  onTripUpdate?: () => void;
};

export default function TripTracker({ onTripUpdate }: Props) {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const lastSamplePoint = useRef<any>(null);
  const lastSampleTime = useRef<number>(0);
  const locationPoints = useRef<any[]>([]);
  const updateThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const t = await getActiveTrip();
      if (mounted.current) setActiveTrip(t);
    })();
    return () => {
      mounted.current = false;
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (updateThrottle.current) clearTimeout(updateThrottle.current);
    };
  }, []);

  // Verify active trip still exists when component updates
  useEffect(() => {
    if (activeTrip?.isActive) {
      const verifyActiveTrip = async () => {
        try {
          const tripExists = await getActiveTrip();
          if (!tripExists || tripExists.id !== activeTrip.id) {
            // Trip was deleted while component was active, clean up
            if (mounted.current) {
              console.log('Active trip was deleted, cleaning up tracking');
              setActiveTrip(null);
              stopLocationTracking();
            }
          }
        } catch (error) {
          console.warn('Could not verify active trip:', error);
        }
      };
      
      // Check every 5 seconds while trip is active
      const interval = setInterval(verifyActiveTrip, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTrip?.id]);

  // Spinner animation effect
  useEffect(() => {
    if (isStarting || isStopping) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [isStarting, isStopping, spinValue]);

  const notifyParent = useCallback(() => {
    if (!onTripUpdate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onTripUpdate?.();
    }, 300);
  }, [onTripUpdate]);

  const startLocationTracking = useCallback(async (tripId: string) => {
    try {
      // Get GPS accuracy preference
      const highAccuracy = await getGpsHighAccuracy();
      
      // Reset tracking state
      lastSamplePoint.current = null;
      lastSampleTime.current = 0;
      locationPoints.current = [];
      
      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: highAccuracy ? Location.Accuracy.BestForNavigation : Location.Accuracy.Balanced,
          timeInterval: 15000, // Expo minimum
          distanceInterval: 200, // Expo minimum
        },
        async (location) => {
          const now = Date.now();
          const newPoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: now,
            state: 'Unknown', // Will be updated below
          };
          
          // Apply sampling policy
          if (!shouldSample(lastSamplePoint.current, newPoint, lastSampleTime.current, now)) {
            return;
          }
          
          // Check for noisy jumps
          if (lastSamplePoint.current && isNoisyJump(lastSamplePoint.current, newPoint, (now - lastSampleTime.current) / 1000)) {
            console.warn('Ignoring noisy GPS jump');
            return;
          }
          
          // Get state for this location
          const state = await getStateFromCoords({ latitude: newPoint.lat, longitude: newPoint.lng });
          newPoint.state = state;
          
          // Accept the point
          lastSamplePoint.current = newPoint;
          lastSampleTime.current = now;
          locationPoints.current.push(newPoint);
          
          // Optional: persist to database
          await insertLocationPoint(tripId, {
            lat: newPoint.lat,
            lng: newPoint.lng,
            state: newPoint.state,
            ts: new Date(now),
          });
          
          // Throttled update notification
          if (!updateThrottle.current) {
            updateThrottle.current = setTimeout(() => {
              notifyParent();
              updateThrottle.current = null;
            }, 5000); // Max once per 5 seconds
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }, [notifyParent]);

  const stopLocationTracking = useCallback(() => {
    if (locationWatcher.current) {
      locationWatcher.current.remove();
      locationWatcher.current = null;
    }
    if (updateThrottle.current) {
      clearTimeout(updateThrottle.current);
      updateThrottle.current = null;
    }
  }, []);

  // Function to force cleanup when trip is deleted externally
  const forceCleanup = useCallback(() => {
    if (mounted.current) {
      setActiveTrip(null);
      stopLocationTracking();
    }
  }, [stopLocationTracking]);

  const handleStart = useCallback(async () => {
    if (isStarting) return; // Prevent multiple clicks
    
    setIsStarting(true);
    try {
      const ok = await requestLocationPermissions();
      if (!ok) {
        Alert.alert('Permission', 'Location permission is required to start a trip.');
        return;
      }

      // Get GPS accuracy preference for start location
      const highAccuracy = await getGpsHighAccuracy();
      
      // Capture start location (best effort) - use GPS accuracy preference
      const coords = await getCurrentLocation(highAccuracy);
      let address = 'Unknown';
      let state = 'Unknown';
      if (coords) {
        address = await reverseGeocode(coords);
        state = await getStateFromCoords(coords);
      }

      const nowIso = new Date().toISOString();
      const newTrip: Trip = {
        // id intentionally omitted (DB will generate)
        // @ts-ignore
        id: undefined as any,
        startDate: nowIso,
        endDate: undefined,
        isActive: true,
        totalMiles: 0,
        startLocation: {
          latitude: coords?.latitude ?? 0,
          longitude: coords?.longitude ?? 0,
          address,
          // @ts-ignore
          state,
        },
        endLocation: undefined,
        points: [],
        milesByState: {},
        notes: undefined,
      };

      const newId = await insertTrip(newTrip);
      const fresh = await getActiveTrip();
      if (mounted.current) setActiveTrip(fresh);

      // Start location tracking
      if (fresh?.id) {
        await startLocationTracking(fresh.id);
      }

      notifyParent();
    } catch (e: any) {
      console.error('Error starting trip:', e);
      Alert.alert('Error', e?.message ?? 'Failed to start trip');
    } finally {
      if (mounted.current) {
        setIsStarting(false);
      }
    }
  }, [notifyParent, startLocationTracking]);

  const handleStop = useCallback(async () => {
    if (isStopping) return; // Prevent multiple clicks
    
    setIsStopping(true);
    try {
      const current = await getActiveTrip();
      if (!current) {
        Alert.alert('Info', 'No active trip to stop.');
        return;
      }

      // Verify the trip still exists in the database
      try {
        const tripExists = await getActiveTrip();
        if (!tripExists || tripExists.id !== current.id) {
          // Trip was deleted while active, clean up the component state
          if (mounted.current) {
            setActiveTrip(null);
            stopLocationTracking();
          }
          Alert.alert('Info', 'The active trip was deleted. Trip tracking stopped.');
          return;
        }
      } catch (verifyError) {
        console.warn('Could not verify trip exists:', verifyError);
        // Continue with stopping the trip
      }

      // Stop location tracking
      stopLocationTracking();
      
      // Calculate final miles from collected points
      if (locationPoints.current.length > 1) {
        const milesByState = bucketMilesByState(locationPoints.current);
        const totalMiles = Object.values(milesByState).reduce((sum, miles) => sum + miles, 0);
        
        try {
          await updateTrip(current.id, {
            totalMiles,
            milesByState,
          });
        } catch (updateError) {
          console.warn('Could not update trip miles:', updateError);
          // Trip might have been deleted, continue with cleanup
        }
      }

      const endIso = new Date().toISOString();
      try {
        await updateTrip(current.id, {
          isActive: false,
          endDate: endIso,
        });
      } catch (updateError) {
        console.warn('Could not update trip end time:', updateError);
        // Trip might have been deleted, continue with cleanup
      }

      const fresh = await getActiveTrip(); // should be null after stop
      if (mounted.current) setActiveTrip(fresh);

      notifyParent();
    } catch (e: any) {
      console.error('Error stopping trip:', e);
      Alert.alert('Error', e?.message ?? 'Failed to stop trip');
    } finally {
      if (mounted.current) {
        setIsStopping(false);
      }
    }
  }, [notifyParent, stopLocationTracking]);

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Trip Tracker</Text>
        <Text style={styles.status}>
          {activeTrip?.isActive
            ? `Running since ${new Date(activeTrip.startDate).toLocaleString()}`
            : 'Not running'}
        </Text>
      </View>
      {activeTrip?.isActive ? (
        <TouchableOpacity 
          style={[styles.btn, styles.stop, isStopping && styles.btnDisabled]} 
          onPress={handleStop}
          disabled={isStopping}
        >
          {isStopping ? (
            <>
              <Animated.View 
                style={[
                  styles.spinner, 
                  { 
                    transform: [{ 
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }
                ]} 
              />
              <Text style={styles.btnText}>Stopping...</Text>
            </>
          ) : (
            <>
              <Square size={16} color="#fff" />
              <Text style={styles.btnText}>Stop</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.btn, styles.start, isStarting && styles.btnDisabled]} 
          onPress={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <Animated.View 
                style={[
                  styles.spinner, 
                  { 
                    transform: [{ 
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }
                ]} 
              />
              <Text style={styles.btnText}>Starting...</Text>
            </>
          ) : (
            <>
              <Play size={16} color="#fff" />
              <Text style={styles.btnText}>Start</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  status: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  start: { backgroundColor: '#10B981' },
  stop: { backgroundColor: '#DC2626' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600' },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
  },
});
