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

/**
 * Normalize jurisdiction input to IFTA codes
 * US: AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY
 * CA: AB, BC, MB, NB, NL, NT, NS, NU, ON, PE, QC, SK, YT
 */
export const normalizeJurisdiction = (input: string): string | 'UNK' => {
  if (!input || typeof input !== 'string') return 'UNK';
  
  const clean = input.trim().toUpperCase();
  
  // US state mappings
  const usStates: Record<string, string> = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY'
  };
  
  // Canadian province mappings
  const caProvinces: Record<string, string> = {
    'ALBERTA': 'AB', 'BRITISH COLUMBIA': 'BC', 'MANITOBA': 'MB', 'NEW BRUNSWICK': 'NB',
    'NEWFOUNDLAND AND LABRADOR': 'NL', 'NORTHWEST TERRITORIES': 'NT', 'NOVA SCOTIA': 'NS',
    'NUNAVUT': 'NU', 'ONTARIO': 'ON', 'PRINCE EDWARD ISLAND': 'PE', 'QUEBEC': 'QC',
    'SASKATCHEWAN': 'SK', 'YUKON': 'YT'
  };
  
  // Check if already a valid code
  const validCodes = [...Object.values(usStates), ...Object.values(caProvinces)];
  if (validCodes.includes(clean)) return clean;
  
  // Try full name lookup
  if (usStates[clean]) return usStates[clean];
  if (caProvinces[clean]) return caProvinces[clean];
  
  return 'UNK';
};

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

// Sampling policy: take point if ≥30s OR ≥0.497mi (≈0.8km)
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
export const computeIFTA = (data: IFTAQuarterData): IFTAResult => {
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