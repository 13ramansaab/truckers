import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Fuel, Calendar, MapPin, Trash2, DollarSign } from 'lucide-react-native';
import FuelEntryForm from '@/components/FuelEntryForm';
import { getAllFuelEntries, deleteFuelEntry as deleteFuelEntryFromDb } from '@/utils/database';

export default function FuelScreen() {
  const [fuelEntries, setFuelEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    loadFuelEntries();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadFuelEntries = async () => {
    if (mounted.current) {
      setIsLoading(true);
    }
    try {
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading fuel entries...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fuel Tracking</Text>
        <Text style={styles.subtitle}>Log and manage fuel purchases</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Fuel size={20} color="#3B82F6" />
              <Text style={styles.summaryValue}>{totalGallons.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Total Gallons</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <DollarSign size={20} color="#10B981" />
              <Text style={styles.summaryValue}>${totalCost.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Total Cost</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Calendar size={20} color="#F59E0B" />
              <Text style={styles.summaryValue}>${avgPricePerGallon.toFixed(3)}</Text>
              <Text style={styles.summaryLabel}>Avg $/Gal</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>
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
        <Text style={styles.sectionTitle}>Fuel History</Text>
        
        {fuelEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Fuel size={48} color="#6B7280" />
            <Text style={styles.emptyStateText}>No fuel entries</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first fuel purchase to get started
            </Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {fuelEntries.map((entry: any) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryDate}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.entryState}>{entry.state}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteFuelEntry(entry.id)}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <View style={styles.entryDetails}>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Gallons:</Text>
                    <Text style={styles.entryValue}>{entry.gallons.toFixed(2)}</Text>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Price/Gal:</Text>
                    <Text style={styles.entryValue}>${entry.pricePerGallon.toFixed(3)}</Text>
                  </View>
                  
                  <View style={styles.entryRow}>
                    <Text style={styles.entryLabel}>Total:</Text>
                    <Text style={[styles.entryValue, styles.totalValue]}>
                      ${entry.totalCost.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationInfo}>
                  <MapPin size={14} color="#9CA3AF" />
                  <Text style={styles.locationText}>{entry.location || 'Unknown'}</Text>
                </View>

                {entry.odometer && (
                  <View style={styles.odometerInfo}>
                    <Text style={styles.odometerText}>Odometer: {entry.odometer.toLocaleString()} mi</Text>
                  </View>
                )}

                {entry.receiptPhoto && (
                  <View style={styles.receiptInfo}>
                    <Text style={styles.receiptText}>📄 Receipt attached</Text>
                  </View>
                )}

                {entry.notes && entry.notes.trim() ? (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesText}>{entry.notes}</Text>
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
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#1F2937',
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  actionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  entriesContainer: {
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#1F2937',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  entryState: {
    color: '#3B82F6',
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
    color: '#9CA3AF',
    fontSize: 14,
  },
  entryValue: {
    color: '#FFFFFF',
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
    color: '#9CA3AF',
    fontSize: 14,
  },
  notesSection: {
    marginTop: 8,
  },
  notesText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  odometerInfo: {
    marginBottom: 8,
  },
  odometerText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  receiptInfo: {
    marginBottom: 8,
  },
  receiptText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
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
});