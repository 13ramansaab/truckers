// components/TripTracker.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Play, Square } from 'lucide-react-native';
import { requestLocationPermissions, getCurrentLocation, reverseGeocode, getStateFromCoords } from '@/utils/location';
import { getActiveTrip, insertTrip, updateTrip } from '@/utils/database';
import type { Trip } from '@/types';

type Props = {
  onTripUpdate?: () => void;
};

export default function TripTracker({ onTripUpdate }: Props) {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const mounted = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const t = await getActiveTrip();
      if (mounted.current) setActiveTrip(t);
    })();
    return () => {
      mounted.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const notifyParent = useCallback(() => {
    if (!onTripUpdate) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onTripUpdate?.();
    }, 300);
  }, [onTripUpdate]);

  const handleStart = useCallback(async () => {
    try {
      const ok = await requestLocationPermissions();
      if (!ok) {
        Alert.alert('Permission', 'Location permission is required to start a trip.');
        return;
      }

      // Capture start location (best effort)
      const coords = await getCurrentLocation();
      let address = 'Unknown';
      let state = 'Unknown';
      if (coords) {
        address = await reverseGeocode(coords);
        state = await getStateFromCoords(coords);
      }

      const nowIso = new Date().toISOString();
      const newTrip: Trip = {
        // id intentionally omitted (DB will generate)
        // @ts-ignore
        id: undefined as any,
        startDate: nowIso,
        endDate: undefined,
        isActive: true,
        totalMiles: 0,
        startLocation: {
          latitude: coords?.latitude ?? 0,
          longitude: coords?.longitude ?? 0,
          address,
          // @ts-ignore
          state,
        },
        endLocation: undefined,
        points: [],
        milesByState: {},
        notes: null,
      };

      const newId = await insertTrip(newTrip);
      const fresh = await getActiveTrip();
      if (mounted.current) setActiveTrip(fresh);

      notifyParent();
    } catch (e: any) {
      console.error('Error starting trip:', e);
      Alert.alert('Error', e?.message ?? 'Failed to start trip');
    }
  }, [notifyParent]);

  const handleStop = useCallback(async () => {
    try {
      const current = await getActiveTrip();
      if (!current) {
        Alert.alert('Info', 'No active trip to stop.');
        return;
      }

      const endIso = new Date().toISOString();
      await updateTrip(current.id, {
        isActive: false,
        endDate: endIso,
        // If you also want to write final total miles here, pass totalMiles too
      });

      const fresh = await getActiveTrip(); // should be null after stop
      if (mounted.current) setActiveTrip(fresh);

      notifyParent();
    } catch (e: any) {
      console.error('Error stopping trip:', e);
      Alert.alert('Error', e?.message ?? 'Failed to stop trip');
    }
  }, [notifyParent]);

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Trip Tracker</Text>
        <Text style={styles.status}>
          {activeTrip?.isActive
            ? `Running since ${new Date(activeTrip.startDate).toLocaleString()}`
            : 'Not running'}
        </Text>
      </View>
      {activeTrip?.isActive ? (
        <TouchableOpacity style={[styles.btn, styles.stop]} onPress={handleStop}>
          <Square size={16} color="#fff" />
          <Text style={styles.btnText}>Stop</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.btn, styles.start]} onPress={handleStart}>
          <Play size={16} color="#fff" />
          <Text style={styles.btnText}>Start</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  status: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  start: { backgroundColor: '#10B981' },
  stop: { backgroundColor: '#DC2626' },
  btnText: { color: '#fff', fontWeight: '600' },
});
