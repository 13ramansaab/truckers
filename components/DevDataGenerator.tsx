import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Database, Zap, Trash2 } from 'lucide-react-native';
import { insertTrip, insertFuelPurchase } from '@/utils/database';
import type { Trip, FuelPurchase } from '@/types';

// Only render in development mode
export default function DevDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!__DEV__) {
    return null;
  }

  const generateSampleTrips = async () => {
    setIsGenerating(true);
    try {
      const states = ['California', 'Nevada', 'Arizona', 'Texas', 'Oklahoma'];
      const now = new Date();
      
      for (let i = 0; i < 5; i++) {
        const startDate = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000)); // Weekly intervals
        const endDate = new Date(startDate.getTime() + (2 * 24 * 60 * 60 * 1000)); // 2-day trips
        const state = states[i % states.length];
        const miles = 500 + Math.random() * 1000; // 500-1500 miles
        
        const trip: Trip = {
          // @ts-ignore - Let DB generate ID
          id: undefined,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          isActive: false,
          totalMiles: miles,
          startLocation: {
            latitude: 34.0522 + (Math.random() - 0.5) * 10,
            longitude: -118.2437 + (Math.random() - 0.5) * 20,
            address: `${state} Starting Point`,
            // @ts-ignore
            state,
          },
          endLocation: {
            latitude: 34.0522 + (Math.random() - 0.5) * 10,
            longitude: -118.2437 + (Math.random() - 0.5) * 20,
            address: `${state} Ending Point`,
          },
          points: [],
          milesByState: { [state]: miles },
          notes: `Sample trip ${i + 1}`,
        };
        
        await insertTrip(trip);
      }
      
      Alert.alert('Success', 'Generated 5 sample trips');
    } catch (error) {
      console.error('Error generating trips:', error);
      Alert.alert('Error', 'Failed to generate sample trips');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSampleFuel = async () => {
    setIsGenerating(true);
    try {
      const states = ['California', 'Nevada', 'Arizona', 'Texas', 'Oklahoma'];
      const now = new Date();
      
      for (let i = 0; i < 10; i++) {
        const date = new Date(now.getTime() - (i * 3 * 24 * 60 * 60 * 1000)); // Every 3 days
        const state = states[i % states.length];
        const gallons = 50 + Math.random() * 100; // 50-150 gallons
        const pricePerGallon = 3.5 + Math.random() * 1.5; // $3.50-$5.00
        
        const fuel: FuelPurchase = {
          // @ts-ignore - Let DB generate ID
          id: undefined,
          date: date.toISOString(),
          state,
          gallons,
          pricePerGallon,
          totalCost: gallons * pricePerGallon,
          taxIncludedAtPump: Math.random() > 0.3, // 70% have tax included
          location: `${state} Truck Stop`,
          odometer: 100000 + Math.random() * 50000,
          notes: `Sample fuel purchase ${i + 1}`,
        };
        
        await insertFuelPurchase(fuel);
      }
      
      Alert.alert('Success', 'Generated 10 sample fuel purchases');
    } catch (error) {
      console.error('Error generating fuel purchases:', error);
      Alert.alert('Error', 'Failed to generate sample fuel purchases');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Development Data Generator</Text>
      <Text style={styles.subtitle}>Generate sample data for testing</Text>
      
      <TouchableOpacity
        style={[styles.button, styles.tripButton]}
        onPress={generateSampleTrips}
        disabled={isGenerating}
      >
        <Database size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>
          {isGenerating ? 'Generating...' : 'Generate Sample Trips'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.fuelButton]}
        onPress={generateSampleFuel}
        disabled={isGenerating}
      >
        <Zap size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>
          {isGenerating ? 'Generating...' : 'Generate Sample Fuel'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    margin: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  tripButton: {
    backgroundColor: '#3B82F6',
  },
  fuelButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});