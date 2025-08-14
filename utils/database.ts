// utils/database.ts
import { supabase } from './supabase';
import { Trip, FuelPurchase, LocationPoint } from '@/types';
import { getCurrentLocation, reverseGeocode, getStateFromCoords } from '@/utils/location';

// Initialize database - check connection
export const initializeDatabase = async () => {
  try {
    const { error } = await supabase.from('trips').select('id').limit(1);
    if (error) {
      console.warn('Database connection issue:', error.message);
    } else {
      console.log('Database connected successfully');
    }
  } catch (error) {
    console.warn('Database initialization error:', error);
  }
};

/** Map DB row -> Trip domain object */
const mapDbTripToDomain = (row: any): Trip => {
  const startedAtIso =
    row.started_at ?? (row.start_date ? `${row.start_date}T00:00:00.000Z` : null);
  const endedAtIso =
    row.ended_at ?? (row.end_date ? `${row.end_date}T00:00:00.000Z` : undefined);

  return {
    id: row.id,
    startDate: startedAtIso || new Date().toISOString(),
    endDate: endedAtIso || undefined,
    startLocation: {
      latitude: row.start_lat ? Number(row.start_lat) : 0,
      longitude: row.start_lng ? Number(row.start_lng) : 0,
      address: row.start_address || 'Unknown',
      // @ts-ignore
      state: row.start_state || undefined,
    },
    endLocation: undefined,
    points: [],
    milesByState: {},
    totalMiles: row.total_miles ?? 0,
    isActive: !!row.is_active,
    notes: row.name || null,
  };
};

// Trip operations
export const insertTrip = async (trip: Trip) => {
  try {
    // Capture start location if missing
    let start_lat = trip.startLocation?.latitude ?? null;
    let start_lng = trip.startLocation?.longitude ?? null;
    let start_address = trip.startLocation?.address ?? null;
    // @ts-ignore
    let start_state: string | null = trip.startLocation?.state ?? null;

    if (start_lat == null || start_lng == null || !start_address) {
      const coords = await getCurrentLocation();
      if (coords) {
        start_lat = coords.latitude;
        start_lng = coords.longitude;
        start_address = await reverseGeocode(coords);
        start_state = await getStateFromCoords(coords);
      }
    }

    const started_at = trip.startDate ?? new Date().toISOString();
    const ended_at = trip.endDate ?? null;

    // Let Postgres generate UUID by NOT sending id, and let user_id default to auth.uid()
    const payload: any = {
      name: trip.notes || null,
      start_date: (trip.startDate ?? new Date().toISOString()).split('T')[0],
      end_date: trip.endDate ? trip.endDate.split('T')[0] : null,
      started_at,
      ended_at,
      is_active: trip.isActive,
      total_miles: trip.totalMiles ?? 0,
      start_lat,
      start_lng,
      start_address,
      start_state,
      // user_id will be set by database default (auth.uid())
    };

    const { data, error } = await supabase
      .from('trips')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return data?.id as string | undefined;
  } catch (error) {
    console.error('Error inserting trip:', error);
    throw error;
  }
};

export const getActiveTrip = async (): Promise<Trip | null> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active trip:', error);
      return null;
    }
    if (!data) return null;
    return mapDbTripToDomain(data);
  } catch (error) {
    console.error('Error fetching active trip:', error);
    return null;
  }
};

export const getAllTrips = async (): Promise<Trip[]> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('started_at', { ascending: false })
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      return [];
    }
    if (!data) return [];
    return data.map(mapDbTripToDomain);
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
};

export const updateTrip = async (id: string, updates: Partial<Trip>) => {
  try {
    const updateData: any = {};

    if (updates.endDate !== undefined) {
      updateData.end_date = updates.endDate ? updates.endDate.split('T')[0] : null;
      updateData.ended_at = updates.endDate ?? null;
    }
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.notes !== undefined) updateData.name = updates.notes;
    if (updates.totalMiles !== undefined) updateData.total_miles = updates.totalMiles;

    if (updates.startLocation) {
      if (updates.startLocation.latitude !== undefined) updateData.start_lat = updates.startLocation.latitude;
      if (updates.startLocation.longitude !== undefined) updateData.start_lng = updates.startLocation.longitude;
      if (updates.startLocation.address !== undefined) updateData.start_address = updates.startLocation.address;
      // @ts-ignore
      if (updates.startLocation.state !== undefined) updateData.start_state = updates.startLocation.state;
    }

    const { error } = await supabase.from('trips').update(updateData).eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteTripFromDb = async (tripId: string) => {
  try {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

// Fuel purchase operations
export const insertFuelPurchase = async (fuel: FuelPurchase) => {
  try {
    // Prepare receipt fields:
    // - If your UI sets receiptUrl/receiptPath, use those
    // - Else if it only sets receiptPhoto (a URL), store it as receipt_url
    const receipt_path = (fuel as any).receiptPath ?? null;
    const receipt_url = (fuel as any).receiptUrl ?? (fuel as any).receiptPhoto ?? null;

    // Do not send id or user_id - let DB generate UUID and set user_id to auth.uid()
    const payload: any = {
      date: fuel.date.split('T')[0],
      gallons: fuel.gallons,
      price_per_gallon: fuel.pricePerGallon,
      total_cost: fuel.totalCost,
      state: fuel.state,
      location: fuel.location,
      tax_included: fuel.taxIncludedAtPump,
      odometer: fuel.odometer ?? null,
      receipt_path,
      receipt_url,
      // user_id will be set by database default (auth.uid())
    };

    const { error } = await supabase.from('fuel_purchases').insert(payload);
    if (error) throw error;
  } catch (error) {
    console.error('Error inserting fuel purchase:', error);
    throw error;
  }
};

export const getAllFuelEntries = async (): Promise<FuelPurchase[]> => {
  try {
    const { data, error } = await supabase
      .from('fuel_purchases')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching fuel purchases:', error);
      return [];
    }
    if (!data) return [];

    return data.map((purchase: any) => ({
      id: purchase.id,
      date: purchase.date + 'T00:00:00.000Z',
      state: purchase.state || 'Unknown',
      gallons: purchase.gallons,
      pricePerGallon: purchase.price_per_gallon,
      totalCost: purchase.total_cost,
      taxIncludedAtPump: purchase.tax_included,
      location: purchase.location || 'Unknown',
      odometer: purchase.odometer ?? null,
      // Keep backward-compat property name the UI uses:
      receiptPhoto: purchase.receipt_url ?? purchase.receipt_path ?? null,
      // (optional) expose both snake_case fields if your type allows:
      // @ts-ignore
      receiptUrl: purchase.receipt_url ?? null,
      // @ts-ignore
      receiptPath: purchase.receipt_path ?? null,
      notes: null,
    }));
  } catch (error) {
    console.error('Error fetching fuel purchases:', error);
    return [];
  }
};

export const deleteFuelEntryFromDb = async (fuelId: string) => {
  try {
    const { error } = await supabase.from('fuel_purchases').delete().eq('id', fuelId);
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting fuel entry:', error);
    throw error;
  }
};

// Tax rate operations
export const getTaxRate = async (state: string, date: string = new Date().toISOString()): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('tax_rates')
      .select('rate')
      .eq('state', state)
      .lte('effective_date', date.split('T')[0])
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn(`No tax rate found for ${state}, using default`);
      return 0.25; // Default rate
    }
    return data.rate;
  } catch (error) {
    console.error('Error fetching tax rate:', error);
    return 0.25; // Default rate
  }
};

// Optional location points (safe no-op if table missing)
export const getTripLocationPoints = async (_tripId: string): Promise<LocationPoint[]> => {
  return [];
};

// Quarter helpers
export const getQuarterTrips = async (year: number, quarter: number): Promise<Trip[]> => {
  try {
    const quarterStart = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
    const quarterEnd = new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59, 999));

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .gte('started_at', quarterStart.toISOString())
      .lte('started_at', quarterEnd.toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching quarter trips:', error);
      return [];
    }
    if (!data) return [];
    return data.map(mapDbTripToDomain);
  } catch (error) {
    console.error('Error fetching quarter trips:', error);
    return [];
  }
};

export const getQuarterFuelPurchases = async (year: number, quarter: number): Promise<FuelPurchase[]> => {
  try {
    const quarterStart = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
    const quarterEnd = new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59, 999));

    const { data, error } = await supabase
      .from('fuel_purchases')
      .select('*')
      .gte('date', quarterStart.toISOString().split('T')[0])
      .lte('date', quarterEnd.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching quarter fuel purchases:', error);
      return [];
    }
    if (!data) return [];

    return data.map((purchase: any) => ({
      id: purchase.id,
      date: purchase.date + 'T00:00:00.000Z',
      state: purchase.state || 'Unknown',
      gallons: purchase.gallons,
      pricePerGallon: purchase.price_per_gallon,
      totalCost: purchase.total_cost,
      taxIncludedAtPump: purchase.tax_included,
      location: purchase.location || 'Unknown',
      odometer: purchase.odometer ?? null,
      receiptPhoto: purchase.receipt_url ?? purchase.receipt_path ?? null,
      // @ts-ignore
      receiptUrl: purchase.receipt_url ?? null,
      // @ts-ignore
      receiptPath: purchase.receipt_path ?? null,
      notes: null,
    }));
  } catch (error) {
    console.error('Error fetching quarter fuel purchases:', error);
    return [];
  }
};

export const getTaxRatesSnapshot = async (year: number, quarter: number): Promise<Record<string, number>> => {
  try {
    const quarterEnd = new Date(year, quarter * 3, 0);

    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .lte('effective_date', quarterEnd.toISOString().split('T')[0])
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching tax rates:', error);
      return getDefaultTaxRates();
    }
    if (!data || data.length === 0) {
      return getDefaultTaxRates();
    }

    // latest rate per state
    const ratesByState: Record<string, number> = {};
    data.forEach((rate: any) => {
      if (!ratesByState[rate.state]) ratesByState[rate.state] = rate.rate;
    });

    const defaults = getDefaultTaxRates();
    return { ...defaults, ...ratesByState };
  } catch (error) {
    console.error('Error fetching tax rates snapshot:', error);
    return getDefaultTaxRates();
  }
};

// Default tax rates fallback
const getDefaultTaxRates = (): Record<string, number> => ({
  Alabama: 0.19, Alaska: 0.08, Arizona: 0.18, Arkansas: 0.2225,
  California: 0.40, Colorado: 0.2225, Connecticut: 0.25, Delaware: 0.22,
  Florida: 0.336, Georgia: 0.184, Hawaii: 0.16, Idaho: 0.25,
  Illinois: 0.385, Indiana: 0.16, Iowa: 0.215, Kansas: 0.24,
  Kentucky: 0.184, Louisiana: 0.16, Maine: 0.244, Maryland: 0.243,
  Massachusetts: 0.21, Michigan: 0.153, Minnesota: 0.2235, Mississippi: 0.184,
  Missouri: 0.17, Montana: 0.2775, Nebraska: 0.248, Nevada: 0.27,
  'New Hampshire': 0.222, 'New Jersey': 0.325, 'New Mexico': 0.17, 'New York': 0.331,
  'North Carolina': 0.343, 'North Dakota': 0.21, Ohio: 0.28, Oklahoma: 0.16,
  Oregon: 0.24, Pennsylvania: 0.535, 'Rhode Island': 0.30, 'South Carolina': 0.167,
  'South Dakota': 0.22, Tennessee: 0.214, Texas: 0.15, Utah: 0.294,
  Vermont: 0.26, Virginia: 0.162, Washington: 0.375, 'West Virginia': 0.205,
  Wisconsin: 0.249, Wyoming: 0.14,
});

// Optional location point insertion (safe to ignore failure)
export const insertLocationPoint = async (
  tripId: string,
  point: { lat: number; lng: number; state: string; ts: Date; speed_mph?: number }
): Promise<void> => {
  try {
    const { error } = await supabase.from('location_points').insert({
      trip_id: tripId,
      ts: point.ts.toISOString(),
      lat: point.lat,
      lng: point.lng,
      state: point.state,
      speed_mph: point.speed_mph || null,
      // user_id will be set by database default (auth.uid())
    });
    if (error) {
      console.warn('Location points table not available:', error.message);
    }
  } catch (error) {
    console.warn('Error inserting location point:', error);
  }
};

/** ---- Aliases to avoid import name mismatches in UI code ---- */
export { deleteFuelEntryFromDb as deleteFuelEntry };
export { deleteTripFromDb as deleteTrip };
