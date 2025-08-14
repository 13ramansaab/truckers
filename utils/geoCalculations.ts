import { LocationPoint } from '@/types';

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First location point
 * @param point2 Second location point
 * @param unit 'km' for kilometers, 'miles' for miles
 * @returns Distance in specified unit
 */
export const calculateHaversineDistance = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
  unit: 'km' | 'miles' = 'miles'
): number => {
  const R = unit === 'km' ? 6371 : 3959; // Earth's radius in km or miles
  
  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a = 
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10000) / 10000; // Round to 4 decimal places
};

/**
 * Calculate total distance from an array of location points
 * @param points Array of location points
 * @param unit 'km' for kilometers, 'miles' for miles
 * @returns Total distance in specified unit
 */
export const calculateTotalDistance = (
  points: LocationPoint[],
  unit: 'km' | 'miles' = 'miles'
): number => {
  if (points.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateHaversineDistance(points[i - 1], points[i], unit);
  }
  
  return Math.round(totalDistance * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate miles by state from location points
 * @param points Array of location points with state information
 * @param unit 'km' for kilometers, 'miles' for miles
 * @returns Object mapping state to distance
 */
export const calculateMilesByState = (
  points: LocationPoint[],
  unit: 'km' | 'miles' = 'miles'
): Record<string, number> => {
  if (points.length < 2) return {};
  
  const milesByState: Record<string, number> = {};
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];
    
    // Calculate distance between consecutive points
    const segmentDistance = calculateHaversineDistance(prevPoint, currentPoint, unit);
    
    // Attribute distance to the state of the current point
    const state = currentPoint.state;
    if (state && state !== 'Unknown') {
      milesByState[state] = (milesByState[state] || 0) + segmentDistance;
    }
  }
  
  // Round all values to 2 decimal places
  Object.keys(milesByState).forEach(state => {
    milesByState[state] = Math.round(milesByState[state] * 100) / 100;
  });
  
  return milesByState;
};

/**
 * Check if a new location point should be sampled based on battery-aware policy
 * @param currentLocation Current GPS location
 * @param lastSampleTime Timestamp of last sample
 * @param lastSampleLocation Last sampled location
 * @param timeInterval Minimum time interval in seconds (default: 30)
 * @param distanceInterval Minimum distance interval in km (default: 0.8)
 * @returns Whether to sample this location
 */
export const shouldSampleLocation = (
  currentLocation: { latitude: number; longitude: number; timestamp: number },
  lastSampleTime: number,
  lastSampleLocation: { latitude: number; longitude: number } | null,
  timeInterval: number = 30, // 30 seconds
  distanceInterval: number = 0.8 // 0.8 km
): boolean => {
  const currentTime = currentLocation.timestamp;
  
  // Always sample if this is the first point
  if (!lastSampleLocation || lastSampleTime === 0) {
    return true;
  }
  
  // Check time interval (30 seconds minimum)
  const timeDiff = (currentTime - lastSampleTime) / 1000; // Convert to seconds
  if (timeDiff >= timeInterval) {
    return true;
  }
  
  // Check distance interval (0.8 km minimum)
  const distance = calculateHaversineDistance(
    lastSampleLocation,
    currentLocation,
    'km'
  );
  
  if (distance >= distanceInterval) {
    return true;
  }
  
  return false;
};

/**
 * Smooth GPS coordinates to reduce noise
 * @param points Array of location points
 * @param windowSize Number of points to average (default: 3)
 * @returns Smoothed location points
 */
export const smoothGPSPoints = (
  points: LocationPoint[],
  windowSize: number = 3
): LocationPoint[] => {
  if (points.length <= windowSize) return points;
  
  const smoothedPoints: LocationPoint[] = [];
  
  for (let i = 0; i < points.length; i++) {
    if (i < Math.floor(windowSize / 2) || i >= points.length - Math.floor(windowSize / 2)) {
      // Keep original points at the edges
      smoothedPoints.push(points[i]);
    } else {
      // Average the coordinates within the window
      let latSum = 0;
      let lonSum = 0;
      
      for (let j = i - Math.floor(windowSize / 2); j <= i + Math.floor(windowSize / 2); j++) {
        latSum += points[j].latitude;
        lonSum += points[j].longitude;
      }
      
      smoothedPoints.push({
        ...points[i],
        latitude: latSum / windowSize,
        longitude: lonSum / windowSize,
      });
    }
  }
  
  return smoothedPoints;
};

/**
 * Detect significant stops in a trip (for rest areas, fuel stops, etc.)
 * @param points Array of location points
 * @param minStopDuration Minimum stop duration in minutes (default: 15)
 * @param maxStopRadius Maximum radius for a stop in meters (default: 100)
 * @returns Array of stop locations with duration
 */
export const detectStops = (
  points: LocationPoint[],
  minStopDuration: number = 15, // 15 minutes
  maxStopRadius: number = 100 // 100 meters
): Array<{
  location: LocationPoint;
  startTime: number;
  endTime: number;
  duration: number; // in minutes
}> => {
  if (points.length < 2) return [];
  
  const stops: Array<{
    location: LocationPoint;
    startTime: number;
    endTime: number;
    duration: number;
  }> = [];
  
  let potentialStopStart = 0;
  
  for (let i = 1; i < points.length; i++) {
    const distance = calculateHaversineDistance(
      points[potentialStopStart],
      points[i],
      'km'
    ) * 1000; // Convert to meters
    
    if (distance > maxStopRadius) {
      // Check if we had a potential stop
      const stopDuration = (points[i - 1].timestamp - points[potentialStopStart].timestamp) / (1000 * 60); // minutes
      
      if (stopDuration >= minStopDuration) {
        stops.push({
          location: points[potentialStopStart],
          startTime: points[potentialStopStart].timestamp,
          endTime: points[i - 1].timestamp,
          duration: Math.round(stopDuration * 100) / 100,
        });
      }
      
      potentialStopStart = i;
    }
  }
  
  return stops;
};