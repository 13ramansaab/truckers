import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MapPin, Clock, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import TripTracker from '~/components/TripTracker';
import { getAllTrips, deleteTripFromDb } from '~/utils/database';
import { loadThemeColors } from '~/utils/theme';

export default function TripScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true); // spinner only for first load
  const [colors, setColors] = useState<any>(null);

  const mounted = useRef(false);
  const inFlight = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Shallow compare to avoid unnecessary re-renders
  const applyTripsIfChanged = useCallback((next: any[]) => {
    setTrips(prev => {
      if (prev.length !== next.length) return next;
      for (let i = 0; i < prev.length; i++) {
        if (
          prev[i]?.id !== next[i]?.id ||
          prev[i]?.totalMiles !== next[i]?.totalMiles ||
          prev[i]?.isActive !== next[i]?.isActive
        ) {
          return next;
        }
      }
      return prev; // unchanged
    });
  }, []);

  // Load trips; `silent` avoids flipping the full-screen spinner after first load
  const loadTrips = useCallback(async (silent = false) => {
    if (inFlight.current) return;
    inFlight.current = true;

    if (!hasLoadedOnce.current && !silent) {
      setIsBootstrapping(true);
    }

    try {
      // Load theme colors
      const themeColors = await loadThemeColors();
      if (mounted.current) setColors(themeColors);
      
      const tripsData = await getAllTrips();
      if (mounted.current && Array.isArray(tripsData)) {
        applyTripsIfChanged(tripsData);
      }
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('Error loading trips:', error);
      if (mounted.current) applyTripsIfChanged([]);
    } finally {
      inFlight.current = false;
      if (!silent && mounted.current) {
        setIsBootstrapping(false);
      }
    }
  }, [applyTripsIfChanged]);

  // Debounced trigger (coalesces multiple TripTracker updates)
  const triggerLoadTripsDebounced = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (mounted.current) loadTrips(true /* silent refresh */);
    }, 500);
  }, [loadTrips]);

  // First mount: do a normal (non-silent) load
  useEffect(() => {
    loadTrips(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When tab gains focus, refresh silently (no spinner)
  useFocusEffect(
    useCallback(() => {
      loadTrips(true);
      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
      };
    }, [loadTrips])
  );

  const deleteTrip = useCallback((tripId: string) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTripFromDb(tripId);
              // silent refresh after delete
              loadTrips(true);
            } catch (error) {
              console.error('Error deleting trip:', error);
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ]
    );
  }, [loadTrips]);

  if (isBootstrapping || !colors) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#111827' }]}>
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Trip Tracking</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Manage your trips and routes</Text>
      </View>

      {/* IMPORTANT: Only this screen controls the tracker */}
      <TripTracker onTripUpdate={triggerLoadTripsDebounced} />

      <View style={styles.tripsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trip History</Text>

        {trips.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <MapPin size={48} color="#6B7280" />
            <Text style={[styles.emptyStateText, { color: colors.text }]}>No trips recorded</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.muted }]}>
              Start your first trip to begin tracking
            </Text>
          </View>
        ) : (
          <View style={styles.tripsList}>
            {trips.map((trip: any) => (
              <View key={trip.id} style={[styles.tripCard, { backgroundColor: colors.surface }]}>
                <View style={styles.tripHeader}>
                  <View style={styles.tripStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: trip.isActive ? '#10B981' : '#6B7280' },
                      ]}
                    />
                    <Text style={[styles.tripDate, { color: colors.text }]}>
                      {new Date(trip.startDate).toLocaleDateString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteTrip(trip.id)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.tripDetails}>
                  <View style={styles.tripStat}>
                    <MapPin size={16} color={colors.primary} />
                    <Text style={[styles.tripStatText, { color: colors.muted }]}>
                      {trip.totalMiles.toFixed(1)} miles
                    </Text>
                  </View>

                  <View style={styles.tripStat}>
                    <Clock size={16} color="#F59E0B" />
                    <Text style={[styles.tripStatText, { color: colors.muted }]}>
                      {formatDuration(trip.startDate, trip.endDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationInfo}>
                  <Text style={[styles.locationLabel, { color: colors.muted }]}>From:</Text>
                  <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                    {trip.startLocation?.address || 'Unknown'}
                  </Text>

                  {trip.endLocation?.address ? (
                    <>
                      <Text style={[styles.locationLabel, { color: colors.muted }]}>To:</Text>
                      <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                        {trip.endLocation.address}
                      </Text>
                    </>
                  ) : null}
                </View>

                {trip.notes && trip.notes.trim() ? (
                  <View style={styles.notesSection}>
                    <Text style={[styles.notesLabel, { color: colors.muted }]}>Notes:</Text>
                    <Text style={[styles.notesText, { color: colors.text }]}>{trip.notes}</Text>
                  </View>
                ) : null}
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
  tripsContainer: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  emptyState: { borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 18, fontWeight: '500', marginTop: 16, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, textAlign: 'center' },
  tripsList: { gap: 12 },
  tripCard: { borderRadius: 12, padding: 16 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tripStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tripDate: { fontSize: 16, fontWeight: '600' },
  deleteButton: { padding: 4 },
  tripDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  tripStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripStatText: { fontSize: 14 },
  locationInfo: { marginBottom: 8 },
  locationLabel: { fontSize: 12, marginTop: 4 },
  locationText: { fontSize: 14 },
  notesSection: { marginTop: 8 },
  notesLabel: { fontSize: 12 },
  notesText: { fontSize: 14, fontStyle: 'italic' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 18 },
});
