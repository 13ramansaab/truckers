import { supabase } from './supabase';
import { Trip, FuelPurchase, LocationPoint } from '@/types';

// Initialize database - check connection
export const initializeDatabase = async () => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('id')
      .limit(1);
    
    if (error) {
      console.warn('Database connection issue:', error.message);
    } else {
      console.log('Database connected successfully');
    }
  } catch (error) {
    console.warn('Database initialization error:', error);
  }
};

// Trip operations
export const insertTrip = async (trip: Trip) => {
  try {
  const payload: any = {
     name: trip.notes || null,
     start_date: trip.startDate.split('T')[0],
     end_date: trip.endDate ? trip.endDate.split('T')[0] : null,
     is_active: trip.isActive,
     total_miles: trip.totalMiles ?? 0,
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
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active trip:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      startDate: data.start_date + 'T00:00:00.000Z',
      endDate: data.end_date ? data.end_date + 'T00:00:00.000Z' : undefined,
      startLocation: {
        latitude: data.start_lat ? Number(data.start_lat) : 0,
        longitude: data.start_lng ? Number(data.start_lng) : 0,
        address: data.start_address || 'Unknown',
      },
      endLocation: undefined,
      points: [],
      milesByState: {},
      totalMiles: data.total_miles || 0,
      isActive: data.is_active,
      notes: data.name,
    };
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
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      return [];
    }

    if (!data) return [];

    return data.map(trip => ({
      id: trip.id,
      startDate: trip.start_date + 'T00:00:00.000Z',
      endDate: trip.end_date ? trip.end_date + 'T00:00:00.000Z' : undefined,
      startLocation: {
        latitude: trip.start_lat ? Number(trip.start_lat) : 0,
        longitude: trip.start_lng ? Number(trip.start_lng) : 0,
        address: trip.start_address || 'Unknown',
      },
      endLocation: undefined,
      points: [],
      milesByState: {},
      totalMiles: trip.total_miles || 0,
      isActive: trip.is_active,
      notes: trip.name,
    }));
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
    }
    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive;
    }
    if (updates.notes !== undefined) {
      updateData.name = updates.notes;
    }
    if (updates.totalMiles !== undefined) {
      updateData.total_miles = updates.totalMiles;
    }

    const { error } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

export const deleteTripFromDb = async (tripId: string) => {
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

// Fuel purchase operations
export const insertFuelPurchase = async (fuel: FuelPurchase) => {
  try {
    const { error } = await supabase
      .from('fuel_purchases')
      .insert({
        id: fuel.id,
        date: fuel.date.split('T')[0],
        gallons: fuel.gallons,
        price_per_gallon: fuel.pricePerGallon,
        total_cost: fuel.totalCost,
        state: fuel.state,
        location: fuel.location,
        tax_included: fuel.taxIncludedAtPump,
      });

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

    return data.map(purchase => ({
      id: purchase.id,
      date: purchase.date + 'T00:00:00.000Z',
      state: purchase.state || 'Unknown',
      gallons: purchase.gallons,
      pricePerGallon: purchase.price_per_gallon,
      totalCost: purchase.total_cost,
      taxIncludedAtPump: purchase.tax_included,
      location: purchase.location || 'Unknown',
      notes: null,
    }));
  } catch (error) {
    console.error('Error fetching fuel purchases:', error);
    return [];
  }
};

export const deleteFuelEntryFromDb = async (fuelId: string) => {
  try {
    const { error } = await supabase
      .from('fuel_purchases')
      .delete()
      .eq('id', fuelId);

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

// Location point operations (simplified for now)
export const insertLocationPoint = async (point: LocationPoint, tripId: string) => {
  // For now, just log - we'll implement this when location_points table is added
  console.log('Location point logged:', point, tripId);
};

export const getTripLocationPoints = async (tripId: string): Promise<LocationPoint[]> => {
  // Return empty array for now - implement when location_points table is added
  return [];
};