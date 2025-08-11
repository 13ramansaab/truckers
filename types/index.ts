export interface LocationPoint {
  timestamp: number; // Unix timestamp in milliseconds
  latitude: number;
  longitude: number;
  state: string;
}

export interface Trip {
  id: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string
  startLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  points: LocationPoint[]; // GPS tracking points
  milesByState: Record<string, number>; // State -> miles mapping
  totalMiles: number;
  isActive: boolean;
  notes?: string;
}

export interface FuelPurchase {
  id: string;
  date: string; // ISO string
  state: string;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  taxIncludedAtPump: boolean; // Whether fuel tax was included in pump price
  odometer?: number;
  receiptPhoto?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface TaxRate {
  state: string;
  rate: number; // Tax rate per gallon
  effectiveDate: string; // ISO string
  expirationDate?: string; // ISO string
}

export interface TripSegment {
  id: string;
  tripId: string;
  state: string;
  miles: number;
  startPoint: LocationPoint;
  endPoint: LocationPoint;
}

export interface QuarterSummary {
  quarter: number;
  year: number;
  totalMiles: number;
  totalFuelPurchased: number;
  totalFuelCost: number;
  milesByState: Record<string, number>;
  fuelByState: Record<string, number>;
  stateBreakdown: StateBreakdown[];
  taxLiability: number;
  taxCredits: number;
  netTax: number;
}

export interface StateBreakdown {
  state: string;
  miles: number;
  fuelPurchased: number;
  fuelCost: number;
  taxRate: number;
  taxLiability: number;
  taxCredits: number;
  netTax: number;
}

export interface AppSettings {
  units: 'imperial' | 'metric';
  autoStartTrips: boolean;
  gpsAccuracy: 'high' | 'medium' | 'low';
  samplingInterval: number; // seconds
  samplingDistance: number; // km or miles based on units
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  darkMode: boolean;
  batteryOptimization: boolean;
}

export interface SamplingPolicy {
  timeInterval: number; // 30 seconds
  distanceInterval: number; // 0.8 km
  lastSampleTime: number;
  lastSampleLocation: LocationPoint | null;
}