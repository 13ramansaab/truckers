import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Fuel, Calendar, MapPin, Trash2, DollarSign } from 'lucide-react-native';
import FuelEntryForm from '@/components/FuelEntryForm';
import { getAllFuelEntries, deleteFuelEntry as deleteFuelEntryFromDb } from '@/utils/database';
import { loadThemeColors } from '@/utils/theme';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function FuelScreen() {
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [colors, setColors] = useState<any>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    
    return () => {
      mounted.current = false;
    };
  }, []);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadFuelEntries();
    }, [])
  );

  const loadFuelEntries = async () => {
    if (mounted.current) {
      setIsLoading(true);
    }
    try {
      // Load theme colors
      const themeColors = await loadThemeColors();
      if (mounted.current) setColors(themeColors);
      
      const fuelData = await getAllFuelEntries();
      if (mounted.current) {
        setFuelEntries(fuelData);
      }
    } catch (error) {
      console.error('Error loading fuel entries:', error);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteFuelEntry = async (fuelId: string) => {
    Alert.alert(
      'Delete Fuel Entry',
      'Are you sure you want to delete this fuel entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFuelEntryFromDb(fuelId);
              loadFuelEntries();
            } catch (error) {
              console.error('Error deleting fuel entry:', error);
              Alert.alert('Error', 'Failed to delete fuel entry');
            }
          },
        },
      ]
    );
  };

  const totalGallons = fuelEntries.reduce((sum, entry) => sum + entry.gallons, 0);
  const totalCost = fuelEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const avgPricePerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;

  if (isLoading || !colors) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#111827' }]}>
        <Text style={styles.loadingText}>Loading fuel entries...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Fuel Tracking</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Log and manage fuel purchases</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Fuel size={20} color={colors.primary} />
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalGallons.toFixed(1)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Gallons</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <DollarSign size={20} color="#10B981" />
              <Text style={[styles.summaryValue, { color: colors.text }]}>${totalCost.toFixed(2)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Cost</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Calendar size={20} color="#F59E0B" />
              <Text style={[styles.summaryValue, { color: colors.text }]}>${avgPricePerGallon.toFixed(3)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Avg $/Gal</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>
            {showForm ? 'Hide Form' : 'Add Fuel Entry'}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <FuelEntryForm 
          onEntryAdded={(entry) => {
            loadFuelEntries();
            setShowForm(false);
          }}
        />
      )}

      <View style={styles.entriesContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Fuel History</Text>
        
        {fuelEntries.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Fuel size={48} color="#6B7280" />
            <Text style={[styles.emptyStateText, { color: colors.text }]}>No fuel entries</Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.muted }]}>
              Add your first fuel purchase to get started
            </Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {fuelEntries.map((entry: any) => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.surface }]}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryDate, { color: colors.text }]}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.entryState, { color: colors.primary }]}>{entry.state}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteFuelEntry(entry.id)}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                <View style={styles.entryDetails}>
                  <View style={styles.entryRow}>
                    <Text style={[styles.entryLabel, { color: colors.muted }]}>Gallons:</Text>
                    <Text style={[styles.entryValue, { color: colors.text }]}>{entry.gallons.toFixed(2)}</Text>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={[styles.entryLabel, { color: colors.muted }]}>Price/Gal:</Text>
                    <Text style={[styles.entryValue, { color: colors.text }]}>${entry.pricePerGallon.toFixed(3)}</Text>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={[styles.entryLabel, { color: colors.muted }]}>Total:</Text>
                    <Text style={[styles.entryValue, styles.totalValue]}>
                      ${entry.totalCost.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationInfo}>
                  <MapPin size={14} color={colors.muted} />
                  <Text style={[styles.locationText, { color: colors.muted }]}>{entry.location || 'Unknown'}</Text>
                </View>

                {entry.odometer && (
                  <View style={styles.odometerInfo}>
                    <Text style={[styles.odometerText, { color: colors.muted }]}>Odometer: {entry.odometer.toLocaleString()} mi</Text>
                  </View>
                )}

                {entry.receiptPhoto && (
                  <View style={styles.receiptInfo}>
                    <Text style={[styles.receiptText, { color: '#10B981' }]}>📄 Receipt attached</Text>
                  </View>
                )}

                {entry.notes && entry.notes.trim() ? (
                  <View style={styles.notesSection}>
                    <Text style={[styles.notesText, { color: colors.text }]}>{entry.notes}</Text>
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
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  entriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    borderRadius: 12,
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryState: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  entryDetails: {
    marginBottom: 12,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryLabel: {
    fontSize: 14,
  },
  entryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
  },
  notesSection: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  odometerInfo: {
    marginBottom: 8,
  },
  odometerText: {
    fontSize: 12,
  },
  receiptInfo: {
    marginBottom: 8,
  },
  receiptText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});