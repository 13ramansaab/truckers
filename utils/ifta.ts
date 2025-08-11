// utils/ifta.ts
import { LocationPoint } from '@/types';

export interface IFTAPoint {
  lat: number;
  lng: number;
  state: string;
  timestamp: number;
}

export interface IFTAQuarterData {
  milesByState: Record<string, number>;
  fuelByState: Record<string, number>;
  ratesByState: Record<string, number>;
}

export interface IFTAResult {
  fleetMPG: number;
  stateResults: Record<string, {
    miles: number;
    taxableGallons: number;
    taxPaidAtPump: number;
    liability: number;
  }>;
  totalMiles: number;
  totalGallons: number;
  totalLiability: number;
  netLiability: number;
}

// Haversine distance calculation in miles
export const haversineMi = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  
  const lat1Rad = a.lat * (Math.PI / 180);
  const lat2Rad = b.lat * (Math.PI / 180);
  
  const haversineA = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));
  return R * c;
};

// Sampling policy: take point if ≥30s OR ≥0.8km (≈0.497mi)
export const shouldSample = (
  prevPoint: IFTAPoint | null,
  newPoint: IFTAPoint,
  lastTs: number,
  now: number
): boolean => {
  if (!prevPoint || lastTs === 0) return true;
  
  const dtSeconds = (now - lastTs) / 1000;
  const distanceMi = haversineMi(prevPoint, newPoint);
  
  return dtSeconds >= 30 || distanceMi >= 0.497;
};

// Detect noisy GPS jumps
export const isNoisyJump = (
  prevPoint: IFTAPoint,
  nowPoint: IFTAPoint,
  dtSeconds: number
): boolean => {
  if (dtSeconds <= 0) return true;
  
  const distanceMi = haversineMi(prevPoint, nowPoint);
  const speedMph = (distanceMi / dtSeconds) * 3600; // convert to mph
  
  // Reject if > 1 mile in < 10s OR speed > 100 mph
  return (distanceMi > 1 && dtSeconds < 10) || speedMph > 100;
};

// Bucket miles by state from GPS points
export const bucketMilesByState = (points: IFTAPoint[]): Record<string, number> => {
  if (points.length < 2) return {};
  
  const milesByState: Record<string, number> = {};
  
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];
    
    const segmentDistance = haversineMi(prevPoint, currentPoint);
    
    if (prevPoint.state === currentPoint.state) {
      // Same state - attribute all distance to current state
      const state = currentPoint.state;
      if (state && state !== 'Unknown') {
        milesByState[state] = (milesByState[state] || 0) + segmentDistance;
      }
    } else {
      // State change - split 50/50
      const prevState = prevPoint.state;
      const currentState = currentPoint.state;
      const halfDistance = segmentDistance / 2;
      
      if (prevState && prevState !== 'Unknown') {
        milesByState[prevState] = (milesByState[prevState] || 0) + halfDistance;
      }
      if (currentState && currentState !== 'Unknown') {
        milesByState[currentState] = (milesByState[currentState] || 0) + halfDistance;
      }
    }
  }
  
  // Round to 2 decimal places
  Object.keys(milesByState).forEach(state => {
    milesByState[state] = Math.round(milesByState[state] * 100) / 100;
  });
  
  return milesByState;
};

// Compute IFTA calculations
export const computeQuarterIFTA = (data: IFTAQuarterData): IFTAResult => {
  const { milesByState, fuelByState, ratesByState } = data;
  
  // Calculate totals
  const totalMiles = Object.values(milesByState).reduce((sum, miles) => sum + miles, 0);
  const totalGallons = Object.values(fuelByState).reduce((sum, gallons) => sum + gallons, 0);
  
  // Fleet MPG (guard against divide by zero)
  const fleetMPG = totalGallons > 0 ? totalMiles / totalGallons : 0;
  
  // Get all states involved
  const allStates = new Set([
    ...Object.keys(milesByState),
    ...Object.keys(fuelByState)
  ]);
  
  const stateResults: Record<string, {
    miles: number;
    taxableGallons: number;
    taxPaidAtPump: number;
    liability: number;
  }> = {};
  
  let totalLiability = 0;
  
  for (const state of allStates) {
    const miles = milesByState[state] || 0;
    const fuelPurchased = fuelByState[state] || 0;
    const taxRate = ratesByState[state] || 0;
    
    // Taxable gallons = miles driven / fleet MPG
    const taxableGallons = fleetMPG > 0 ? miles / fleetMPG : 0;
    
    // Tax paid at pump (assuming all fuel had tax included for now)
    const taxPaidAtPump = fuelPurchased * taxRate;
    
    // Liability = (tax rate * taxable gallons) - tax paid at pump
    const liability = (taxRate * taxableGallons) - taxPaidAtPump;
    
    stateResults[state] = {
      miles: Math.round(miles * 100) / 100,
      taxableGallons: Math.round(taxableGallons * 100) / 100,
      taxPaidAtPump: Math.round(taxPaidAtPump * 100) / 100,
      liability: Math.round(liability * 100) / 100,
    };
    
    totalLiability += liability;
  }
  
  return {
    fleetMPG: Math.round(fleetMPG * 100) / 100,
    stateResults,
    totalMiles: Math.round(totalMiles * 100) / 100,
    totalGallons: Math.round(totalGallons * 100) / 100,
    totalLiability: Math.round(totalLiability * 100) / 100,
    netLiability: Math.round(totalLiability * 100) / 100,
  };
};