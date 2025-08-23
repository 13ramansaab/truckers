import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TrendingUp, DollarSign, MapPin, Calendar } from 'lucide-react-native';
import { Link, useFocusEffect } from 'expo-router';
import { getAllTrips, getAllFuelEntries, getActiveTrip, initializeDatabase } from '~/utils/database';
import { Trip } from '~/types';
import { loadThemeColors } from '~/utils/theme';
import LocationPermissionHandler from '~/components/LocationPermissionHandler';

export default function HomeScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [colors, setColors] = useState<any>(null);

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
      // Load theme colors
      const themeColors = await loadThemeColors();
      if (mounted.current) setColors(themeColors);
      
      await initializeDatabase();               // ok to call; it’s lightweight

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

  if (isLoading || !colors) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#111827' }]}>
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>IFTA Tracker</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Q{currentQuarter} {currentYear} Dashboard</Text>
      </View>

      {/* Location Permission Handler */}
      <LocationPermissionHandler />

      {/* Status card instead of embedding TripTracker here */}
      <View style={[styles.trackerCard, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.trackerTitle, { color: colors.text }]}>Trip Tracker</Text>
          <Text style={[styles.trackerStatus, { color: colors.muted }]}>
            {currentTrip?.isActive
              ? `Running since ${new Date(currentTrip.startDate).toLocaleString()}`
              : 'Not running'}
          </Text>
        </View>
        <Link href="/trip" asChild>
          <TouchableOpacity style={[styles.trackerButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.trackerButtonText, { color: colors.onPrimary }]}>
              {currentTrip?.isActive ? 'Manage Trip' : 'Start Trip'}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <TrendingUp size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalMiles.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Miles</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <DollarSign size={24} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.text }]}>${totalFuelCost.toFixed(2)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Fuel Cost</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <TrendingUp size={24} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.text }]}>{avgMPG.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Avg MPG</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Calendar size={24} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.text }]}>{trips.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total Trips</Text>
          </View>
        </View>
      </View>

      <View style={styles.recentActivity}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        {(!trips || trips.length === 0) && (!fuelEntries || fuelEntries.length === 0) ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyStateText, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.muted }]}>Start tracking your trips and fuel purchases</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {trips && trips.slice(0, 3).map((trip: any) => (
              <View key={trip.id} style={[styles.activityItem, { backgroundColor: colors.surface }]}>
                <MapPin size={16} color={colors.primary} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    Trip: {trip.totalMiles?.toFixed(1) || '0.0'} miles
                  </Text>
                  <Text style={[styles.activityDate, { color: colors.muted }]}>
                    {new Date(trip.startDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
            {fuelEntries && fuelEntries.slice(0, 2).map((fuel: any) => (
              <View key={fuel.id} style={[styles.activityItem, { backgroundColor: colors.surface }]}>
                <DollarSign size={16} color="#10B981" />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>
                    Fuel: {fuel.gallons?.toFixed(1) || '0.0'} gal - ${fuel.totalCost?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={[styles.activityDate, { color: colors.muted }]}>
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
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 4 },

  trackerCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackerTitle: { fontSize: 16, fontWeight: '600' },
  trackerStatus: { fontSize: 12, marginTop: 2 },
  trackerButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  trackerButtonText: { fontWeight: '600' },

  statsContainer: { paddingHorizontal: 16, marginBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  recentActivity: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  emptyState: { borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 18, fontWeight: '500', marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, textAlign: 'center' },

  activityList: { gap: 8 },
  activityItem: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '500' },
  activityDate: { fontSize: 12, marginTop: 2 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 18 },
});
