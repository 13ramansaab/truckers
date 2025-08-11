import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Play, Square, MapPin, Navigation } from 'lucide-react-native';
import { Trip } from '@/types';
import { getCurrentLocation, reverseGeocode } from '@/utils/location';
import { insertTrip, getActiveTrip } from '@/utils/database';
import { tripTracker } from '@/utils/tripTracking';

interface TripTrackerProps {
  onTripUpdate?: (trip: Trip | null) => void;
}

export default function TripTracker({ onTripUpdate }: TripTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [totalMiles, setTotalMiles] = useState(0);
  const [currentState, setCurrentState] = useState<string>('');
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    checkActiveTrip();
    updateCurrentLocation();
    
    // Check if trip tracker is already running
    setIsTracking(tripTracker.isCurrentlyTracking());
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkActiveTrip = async () => {
    try {
      const activeTrip = await getActiveTrip();
      if (activeTrip && mounted.current) {
        setCurrentTrip(activeTrip);
        setTotalMiles(activeTrip.totalMiles);
        setIsTracking(tripTracker.isCurrentlyTracking());
        onTripUpdate?.(activeTrip);
      }
    } catch (error) {
      console.error('Error checking active trip:', error);
    }
  };

  const updateCurrentLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      if (coords && mounted.current) {
        const address = await reverseGeocode(coords);
        setCurrentLocation(address);
        
        // Get current state
        const { getStateFromCoords } = await import('@/utils/location');
        const state = await getStateFromCoords(coords);
        setCurrentState(state);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const startTrip = async () => {
    try {
      const coords = await getCurrentLocation();
      if (!coords) {
        Alert.alert('Error', 'Unable to get current location. Please check your GPS settings.');
        return;
      }

      const address = await reverseGeocode(coords);
      const tripId = `trip_${Date.now()}`;
      
      const newTrip: Trip = {
        id: tripId,
        startDate: new Date().toISOString(),
        startLocation: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          address,
        },
        points: [],
        milesByState: {},
        totalMiles: 0,
        isActive: true,
      };

      // Insert trip into database
      await insertTrip(newTrip);
      
      // Start GPS tracking
      await tripTracker.startTrip(newTrip);
      
      if (mounted.current) {
        setCurrentTrip(newTrip);
        setIsTracking(true);
        setTotalMiles(0);
        onTripUpdate?.(newTrip);
      }

      Alert.alert(
        'Trip Started', 
        `GPS tracking started from ${address}. The app will automatically log your route and calculate miles by state.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Failed to start trip tracking. Please try again.');
    }
  };

  const stopTrip = async () => {
    try {
      if (!currentTrip) return;

      Alert.alert(
        'Stop Trip',
        'Are you sure you want to stop tracking this trip?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop Trip',
            style: 'default',
            onPress: async () => {
              try {
                // Stop GPS tracking
                const completedTrip = await tripTracker.stopTrip();
                
                if (mounted.current) {
                  setCurrentTrip(null);
                  setIsTracking(false);
                  setTotalMiles(0);
                  onTripUpdate?.(null);
                }

                // Get final trip data for display
                const finalTrip = getActiveTrip();
                const miles = finalTrip?.totalMiles || 0;
                const stateCount = Object.keys(finalTrip?.milesByState || {}).length;

                Alert.alert(
                  'Trip Completed', 
                  `Trip completed successfully`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                console.error('Error stopping trip:', error);
                Alert.alert('Error', 'Failed to stop trip tracking properly.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error stopping trip:', error);
      Alert.alert('Error', 'Failed to stop trip tracking');
    }
  };

  // Update miles display periodically when tracking
  useEffect(() => {
    if (!isTracking || !currentTrip) return;

    let inFlight = false;
    
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const activeTrip = await getActiveTrip();
        if (activeTrip && mounted.current) {
          setTotalMiles(activeTrip.totalMiles ?? 0);
        }
      } catch (error) {
        console.error('Error polling active trip:', error);
      } finally {
        inFlight = false;
      }
    };

    // Initial poll, then set interval
    poll();
    const interval = setInterval(poll, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isTracking, currentTrip]);

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Navigation size={24} color={isTracking ? '#10B981' : '#6B7280'} />
          <Text style={styles.statusText}>
            {isTracking ? 'GPS Tracking Active' : 'No Active Trip'}
          </Text>
        </View>
        
        {currentLocation && (
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#9CA3AF" />
            <Text style={styles.locationText}>{currentLocation}</Text>
          </View>
        )}
        
        {currentState ? (
          <Text style={styles.stateText}>Current State: {currentState}</Text>
        ) : null}
        
        {isTracking && (
          <View style={styles.milesContainer}>
            <Text style={styles.milesLabel}>Total Miles</Text>
            <Text style={styles.milesValue}>{totalMiles.toFixed(2)}</Text>
            
            {currentTrip && Object.keys(currentTrip.milesByState).length > 0 && (
              <View style={styles.stateBreakdown}>
                <Text style={styles.breakdownTitle}>Miles by State:</Text>
                {Object.entries(currentTrip.milesByState)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([state, miles]) => (
                    <Text key={state} style={styles.breakdownItem}>
                      {state}: {miles.toFixed(1)} mi
                    </Text>
                  ))}
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.trackingButton, isTracking ? styles.stopButton : styles.startButton]}
        onPress={isTracking ? stopTrip : startTrip}
      >
        {isTracking ? (
          <Square size={24} color="#FFFFFF" fill="#FFFFFF" />
        ) : (
          <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
        )}
        <Text style={styles.buttonText}>
          {isTracking ? 'Stop Trip' : 'Start Trip'}
        </Text>
      </TouchableOpacity>
      
      {isTracking && (
        <Text style={styles.trackingNote}>
          GPS tracking is active. Miles and states are being logged automatically.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    marginBottom: 4,
  },
  locationText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
  stateText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 32,
  },
  milesContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  milesLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  milesValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  stateBreakdown: {
    marginTop: 12,
    alignItems: 'center',
  },
  breakdownTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  breakdownItem: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 2,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  trackingNote: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});