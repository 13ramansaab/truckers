import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrendingUp, DollarSign, MapPin, Calendar } from 'lucide-react-native';
import TripTracker from '@/components/TripTracker';
import { getAllTrips, getAllFuelEntries, initializeDatabase } from '@/utils/database';
import { requestLocationPermissions } from '@/utils/location';
import { Trip } from '@/types';

export default function HomeScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    initializeApp();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const initializeApp = async () => {
    if (mounted.current) {
      setIsLoading(true);
    }
    try {
      // Initialize database
      await initializeDatabase();
      
      // Request location permissions
      await requestLocationPermissions();
      
      // Load data
      await loadData();
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const loadData = async () => {
    try {
      const tripsData = await getAllTrips();
      const fuelData = await getAllFuelEntries();
      
      if (mounted.current) {
        setTrips(tripsData || []);
        setFuelEntries(fuelData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (mounted.current) {
        setTrips([]);
        setFuelEntries([]);
      }
    }
  };

  const handleTripUpdate = (trip: Trip | null) => {
    if (mounted.current) {
      setCurrentTrip(trip);
    }
    loadData();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Calculate statistics with null safety
  const totalMiles = trips.reduce((sum, trip) => sum + (trip?.totalMiles || 0), 0);
  const totalFuelCost = fuelEntries.reduce((sum, fuel) => sum + (fuel?.totalCost || 0), 0);
  const totalGallons = fuelEntries.reduce((sum, fuel) => sum + (fuel?.gallons || 0), 0);
  const avgMPG = totalGallons > 0 ? totalMiles / totalGallons : 0;

  // Get current quarter info
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trucker Fuel Tax</Text>
        <Text style={styles.subtitle}>Q{currentQuarter} {currentYear} Dashboard</Text>
      </View>

      <TripTracker onTripUpdate={handleTripUpdate} />

      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{totalMiles.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Miles</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#10B981" />
            <Text style={styles.statValue}>${totalFuelCost.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Fuel Cost</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{avgMPG.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg MPG</Text>
          </View>
          <View style={styles.statCard}>
            <Calendar size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{trips.length}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {(!trips || trips.length === 0) && (!fuelEntries || fuelEntries.length === 0) ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No activity yet</Text>
            <Text style={styles.emptyStateSubtext}>Start tracking your trips and fuel purchases</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {trips && trips.slice(0, 3).map((trip: any) => (
              <View key={trip.id} style={styles.activityItem}>
                <MapPin size={16} color="#3B82F6" />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>
                    Trip: {trip.totalMiles?.toFixed(1) || '0.0'} miles
                  </Text>
                  <Text style={styles.activityDate}>
                    {new Date(trip.startDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
            {fuelEntries && fuelEntries.slice(0, 2).map((fuel: any) => (
              <View key={fuel.id} style={styles.activityItem}>
                <DollarSign size={16} color="#10B981" />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>
                    Fuel: {fuel.gallons?.toFixed(1) || '0.0'} gal - ${fuel.totalCost?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.activityDate}>
                    {fuel.location || 'Unknown'} {'\u2022'} {new Date(fuel.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  recentActivity: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  activityDate: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
});