import { Trip, FuelPurchase, QuarterSummary, StateBreakdown } from '~/types';
import { getTaxRate } from './database';

/**
 * Calculate MPG from miles and gallons
 */
export const calculateMPG = (miles: number, gallons: number): number => {
  if (gallons === 0) return 0;
  return Math.round((miles / gallons) * 100) / 100;
};

/**
 * Calculate tax liability for miles driven in a state
 */
export const calculateTaxLiability = async (
  miles: number, 
  state: string, 
  mpg: number = 6.5,
  date: string = new Date().toISOString()
): Promise<number> => {
  const taxRate = await getTaxRate(state, date);
  const gallonsUsed = miles / mpg;
  return Math.round(gallonsUsed * taxRate * 100) / 100;
};

/**
 * Calculate tax credits for fuel purchased in a state
 */
export const calculateTaxCredits = async (
  gallonsPurchased: number, 
  state: string,
  taxIncludedAtPump: boolean = true,
  date: string = new Date().toISOString()
): Promise<number> => {
  if (!taxIncludedAtPump) {
    return 0; // No credits if tax wasn't paid at pump
  }
  
  const taxRate = await getTaxRate(state, date);
  return Math.round(gallonsPurchased * taxRate * 100) / 100;
};

/**
 * Generate comprehensive quarterly report
 */
export const generateQuarterlyReport = (
  trips: Trip[],
  fuelEntries: FuelPurchase[],
  quarter: number,
  year: number
): QuarterSummary => {
  const quarterStart = new Date(year, (quarter - 1) * 3, 1);
  const quarterEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
  
  // Filter data for the quarter
  const quarterTrips = trips.filter(trip => {
    const tripDate = new Date(trip.startDate);
    return tripDate >= quarterStart && tripDate <= quarterEnd;
  });
  
  const quarterFuel = fuelEntries.filter(fuel => {
    const fuelDate = new Date(fuel.date);
    return fuelDate >= quarterStart && fuelDate <= quarterEnd;
  });
  
  // Calculate totals
  const totalMiles = quarterTrips.reduce((sum, trip) => sum + trip.totalMiles, 0);
  const totalFuelPurchased = quarterFuel.reduce((sum, fuel) => sum + fuel.gallons, 0);
  const totalFuelCost = quarterFuel.reduce((sum, fuel) => sum + fuel.totalCost, 0);
  
  // Calculate average MPG
  const avgMPG = totalFuelPurchased > 0 ? calculateMPG(totalMiles, totalFuelPurchased) : 6.5;
  
  // Aggregate miles by state from all trips
  const milesByState: Record<string, number> = {};
  quarterTrips.forEach(trip => {
    Object.entries(trip.milesByState).forEach(([state, miles]) => {
      milesByState[state] = (milesByState[state] || 0) + miles;
    });
  });
  
  // Aggregate fuel purchases by state
  const fuelByState: Record<string, number> = {};
  const fuelCostByState: Record<string, number> = {};
  
  quarterFuel.forEach(fuel => {
    fuelByState[fuel.state] = (fuelByState[fuel.state] || 0) + fuel.gallons;
    fuelCostByState[fuel.state] = (fuelCostByState[fuel.state] || 0) + fuel.totalCost;
  });
  
  // Get all states involved (either miles driven or fuel purchased)
  const allStates = new Set([
    ...Object.keys(milesByState),
    ...Object.keys(fuelByState)
  ]);
  
  // Calculate state breakdown
  const stateBreakdown: StateBreakdown[] = Array.from(allStates).map(state => {
    const miles = milesByState[state] || 0;
    const fuelPurchased = fuelByState[state] || 0;
    const fuelCost = fuelCostByState[state] || 0;
    
    return {
      state,
      miles: Math.round(miles * 100) / 100,
      fuelPurchased: Math.round(fuelPurchased * 100) / 100,
      fuelCost: Math.round(fuelCost * 100) / 100,
      taxRate: 0,
      taxLiability: 0,
      taxCredits: 0,
      netTax: 0,
    };
  }).filter(state => state.miles > 0 || state.fuelPurchased > 0); // Only include states with activity
  
  // Calculate total tax liability and credits
  const totalTaxLiability = 0; // Will be calculated synchronously with default rates
  const totalTaxCredits = 0; // Will be calculated synchronously with default rates

  // Use default tax rates for now (will be improved when database is set up)
  const defaultTaxRates: Record<string, number> = {
    'Alabama': 0.19, 'Alaska': 0.08, 'Arizona': 0.18, 'Arkansas': 0.2225,
    'California': 0.40, 'Colorado': 0.2225, 'Connecticut': 0.25, 'Delaware': 0.22,
    'Florida': 0.336, 'Georgia': 0.184, 'Hawaii': 0.16, 'Idaho': 0.25,
    'Illinois': 0.385, 'Indiana': 0.16, 'Iowa': 0.215, 'Kansas': 0.24,
    'Kentucky': 0.184, 'Louisiana': 0.16, 'Maine': 0.244, 'Maryland': 0.243,
    'Massachusetts': 0.21, 'Michigan': 0.153, 'Minnesota': 0.2235, 'Mississippi': 0.184,
    'Missouri': 0.17, 'Montana': 0.2775, 'Nebraska': 0.248, 'Nevada': 0.27,
    'New Hampshire': 0.222, 'New Jersey': 0.325, 'New Mexico': 0.17, 'New York': 0.331,
    'North Carolina': 0.343, 'North Dakota': 0.21, 'Ohio': 0.28, 'Oklahoma': 0.16,
    'Oregon': 0.24, 'Pennsylvania': 0.535, 'Rhode Island': 0.30, 'South Carolina': 0.167,
    'South Dakota': 0.22, 'Tennessee': 0.214, 'Texas': 0.15, 'Utah': 0.294,
    'Vermont': 0.26, 'Virginia': 0.162, 'Washington': 0.375, 'West Virginia': 0.205,
    'Wisconsin': 0.249, 'Wyoming': 0.14
  };

  stateBreakdown.forEach(state => {
    const taxRate = defaultTaxRates[state.state] || 0.25;
    const gallonsUsed = state.miles / 6.5; // Default 6.5 MPG for trucks
    
    state.taxLiability = Math.round(gallonsUsed * taxRate * 100) / 100;
    state.taxCredits = Math.round(state.fuelPurchased * taxRate * 100) / 100;
    state.taxRate = taxRate;
  });

  const finalTotalTaxLiability = stateBreakdown.reduce((sum, state) => sum + state.taxLiability, 0);
  const finalTotalTaxCredits = stateBreakdown.reduce((sum, state) => sum + state.taxCredits, 0);
  
  return {
    quarter,
    year,
    totalMiles: Math.round(totalMiles * 100) / 100,
    totalFuelPurchased: Math.round(totalFuelPurchased * 100) / 100,
    totalFuelCost: Math.round(totalFuelCost * 100) / 100,
    milesByState,
    fuelByState,
    stateBreakdown: stateBreakdown.sort((a, b) => b.miles - a.miles), // Sort by miles descending
    taxLiability: finalTotalTaxLiability,
    taxCredits: finalTotalTaxCredits,
    netTax: finalTotalTaxLiability - finalTotalTaxCredits,
  };
};

/**
 * Calculate estimated tax for current period
 */
export const calculateCurrentPeriodTax = async (
  trips: Trip[],
  fuelPurchases: FuelPurchase[]
): Promise<{
  estimatedTaxLiability: number;
  estimatedTaxCredits: number;
  estimatedNetTax: number;
}> => {
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();
  
  const report = await generateQuarterlyReport(trips, fuelPurchases, currentQuarter, currentYear);
  
  return {
    estimatedTaxLiability: report.taxLiability,
    estimatedTaxCredits: report.taxCredits,
    estimatedNetTax: report.netTax,
  };
};

/**
 * Get tax rate for a specific state and date
 */
export const getStateTaxRate = async (state: string, date?: string): Promise<number> => {
  return await getTaxRate(state, date);
};

/**
 * Calculate fuel efficiency metrics
 */
export const calculateFuelEfficiencyMetrics = (
  trips: Trip[],
  fuelPurchases: FuelPurchase[]
) => {
  const totalMiles = trips.reduce((sum, trip) => sum + trip.totalMiles, 0);
  const totalGallons = fuelPurchases.reduce((sum, fuel) => sum + fuel.gallons, 0);
  const totalFuelCost = fuelPurchases.reduce((sum, fuel) => sum + fuel.totalCost, 0);
  
  const avgMPG = calculateMPG(totalMiles, totalGallons);
  const avgCostPerMile = totalMiles > 0 ? totalFuelCost / totalMiles : 0;
  const avgCostPerGallon = totalGallons > 0 ? totalFuelCost / totalGallons : 0;
  
  return {
    totalMiles: Math.round(totalMiles * 100) / 100,
    totalGallons: Math.round(totalGallons * 100) / 100,
    totalFuelCost: Math.round(totalFuelCost * 100) / 100,
    avgMPG: Math.round(avgMPG * 100) / 100,
    avgCostPerMile: Math.round(avgCostPerMile * 1000) / 1000, // 3 decimal places
    avgCostPerGallon: Math.round(avgCostPerGallon * 1000) / 1000, // 3 decimal places
  };
};