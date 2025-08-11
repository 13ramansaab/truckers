import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingUp, DollarSign, MapPin, Calendar } from 'lucide-react-native';
import { Link, useFocusEffect } from 'expo-router';
import { getAllTrips, getAllFuelEntries, getActiveTrip, initializeDatabase } from '@/utils/database';
import { requestLocationPermissions } from '@/utils/location';
import { Trip } from '@/types';

export default function HomeScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mounted = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadData = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (mounted.current) setIsLoading(true);
    try {
      await initializeDatabase();               // ok to call; it’s lightweight
      await requestLocationPermissions();       // guarded in utils/location.ts
      const [tripsData, fuelData, active] = await Promise.all([
        getAllTrips(),
        getAllFuelEntries(),
        getActiveTrip(),
      ]);
      if (!mounted.current) return;
      setTrips(tripsData || []);
      setFuelEntries(fuelData || []);
      setCurrentTrip(active);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (mounted.current) {
        setTrips([]);
        setFuelEntries([]);
        setCurrentTrip(null);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  // Refresh when Home tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Stats
  const totalMiles = trips.reduce((sum, t) => sum + (t?.totalMiles || 0), 0);
  const totalFuelCost = fuelEntries.reduce((sum, f) => sum + (f?.totalCost || 0), 0);
  const totalGallons = fuelEntries.reduce((sum, f) => sum + (f?.gallons || 0), 0);
  const avgMPG = totalGallons > 0 ? totalMiles / totalGallons : 0;

  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trucker Fuel Tax</Text>
        <Text style={styles.subtitle}>Q{currentQuarter} {currentYear} Dashboard</Text>
      </View>

      {/* Status card instead of embedding TripTracker here */}
      <View style={styles.trackerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.trackerTitle}>Trip Tracker</Text>
          <Text style={styles.trackerStatus}>
            {currentTrip?.isActive
              ? `Running since ${new Date(currentTrip.startDate).toLocaleString()}`
              : 'Not running'}
          </Text>
        </View>
        <Link href="/trip" asChild>
          <TouchableOpacity style={styles.trackerButton}>
            <Text style={styles.trackerButtonText}>
              {currentTrip?.isActive ? 'Manage Trip' : 'Start Trip'}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

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
  container: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 20, paddingTop: 60 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#9CA3AF', fontSize: 16, marginTop: 4 },

  trackerCard: {
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  trackerStatus: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  trackerButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  trackerButtonText: { color: '#fff', fontWeight: '600' },

  statsContainer: { paddingHorizontal: 16, marginBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statValue: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 4, textAlign: 'center' },

  recentActivity: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginBottom: 16 },
  emptyState: { backgroundColor: '#1F2937', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyStateText: { color: '#FFFFFF', fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptyStateSubtext: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },

  activityList: { gap: 8 },
  activityItem: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityContent: { flex: 1 },
  activityTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  activityDate: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },

  loadingContainer: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 18 },
});
