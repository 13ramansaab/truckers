import * as Location from 'expo-location';
import { LocationPoint, Trip, SamplingPolicy } from '@/types';
import { calculateHaversineDistance, shouldSampleLocation, calculateMilesByState, calculateTotalDistance } from './geoCalculations';
import { insertLocationPoint, updateTrip, getTripLocationPoints } from './database';
import { getStateFromCoords } from './location';

export class TripTracker {
  private tripId: string | null = null;
  private isTracking = false;
  private locationSubscription: Location.LocationSubscription | null = null;
  private samplingPolicy: SamplingPolicy = {
    timeInterval: 30, // 30 seconds
    distanceInterval: 0.8, // 0.8 km
    lastSampleTime: 0,
    lastSampleLocation: null,
  };

  constructor() {
    this.setupLocationTracking();
  }

  private async setupLocationTracking() {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus.status !== 'granted') {
      console.warn('Background location permission not granted');
    }
  }

  async startTrip(trip: Trip): Promise<void> {
    if (this.isTracking) {
      throw new Error('Trip already in progress');
    }

    this.tripId = trip.id;
    this.isTracking = true;
    this.samplingPolicy.lastSampleTime = 0;
    this.samplingPolicy.lastSampleLocation = null;

    // Start location tracking
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Check every 5 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      this.handleLocationUpdate.bind(this)
    );
  }

  async stopTrip(): Promise<Trip | null> {
    if (!this.isTracking || !this.tripId) {
      return null;
    }

    // Stop location tracking
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    // Get all location points for this trip
    const points = getTripLocationPoints(this.tripId);
    
    if (points.length > 0) {
      // Calculate final statistics
      const totalMiles = calculateTotalDistance(points, 'miles');
      const milesByState = calculateMilesByState(points, 'miles');
      
      // Get end location
      const lastPoint = points[points.length - 1];
      const endAddress = await this.reverseGeocode({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
      });

      // Update trip in database
      await updateTrip(this.tripId, {
        endDate: new Date().toISOString(),
        endLocation: {
          latitude: lastPoint.latitude,
          longitude: lastPoint.longitude,
          address: endAddress,
        },
        totalMiles,
        milesByState,
        isActive: false,
      });
    }

    const tripId = this.tripId;
    this.tripId = null;
    this.isTracking = false;

    return null; // Return updated trip if needed
  }

  private async handleLocationUpdate(location: Location.LocationObject) {
    if (!this.isTracking || !this.tripId) {
      return;
    }

    const currentLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
    };

    // Apply battery-aware sampling policy
    const shouldSample = shouldSampleLocation(
      currentLocation,
      this.samplingPolicy.lastSampleTime,
      this.samplingPolicy.lastSampleLocation,
      this.samplingPolicy.timeInterval,
      this.samplingPolicy.distanceInterval
    );

    if (!shouldSample) {
      return;
    }

    try {
      // Get state for this location
      const state = await getStateFromCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const locationPoint: LocationPoint = {
        timestamp: location.timestamp,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        state,
      };

      // Save location point to database
      await insertLocationPoint(locationPoint, this.tripId);

      // Update sampling policy
      this.samplingPolicy.lastSampleTime = location.timestamp;
      this.samplingPolicy.lastSampleLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Periodically update trip statistics (every 10 points)
      const points = getTripLocationPoints(this.tripId);
      if (points.length % 10 === 0) {
        await this.updateTripStatistics();
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  private async updateTripStatistics() {
    if (!this.tripId) return;

    const points = getTripLocationPoints(this.tripId);
    if (points.length < 2) return;

    const totalMiles = calculateTotalDistance(points, 'miles');
    const milesByState = calculateMilesByState(points, 'miles');

    await updateTrip(this.tripId, {
      totalMiles,
      milesByState,
    });
  }

  private async reverseGeocode(coords: { latitude: number; longitude: number }): Promise<string> {
    try {
      const result = await Location.reverseGeocodeAsync(coords);
      if (result.length > 0) {
        const address = result[0];
        return `${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
      }
      return 'Unknown Location';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Unknown Location';
    }
  }

  // Public methods for external control
  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  public getCurrentTripId(): string | null {
    return this.tripId;
  }

  public updateSamplingPolicy(policy: Partial<SamplingPolicy>) {
    this.samplingPolicy = { ...this.samplingPolicy, ...policy };
  }
}

// Singleton instance
export const tripTracker = new TripTracker();