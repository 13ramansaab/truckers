import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Settings as SettingsIcon, Database, Download, Upload, Trash2, Info } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/utils/supabase';

export default function SettingsScreen() {
  const [autoStartTrips, setAutoStartTrips] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [highAccuracy, setHighAccuracy] = useState(true);

  const exportAllData = async () => {
    try {
      Alert.alert('Export Data', 'Exporting all data to CSV...', [{ text: 'OK' }]);
      
      // For now, just show a placeholder
      Alert.alert('Success', 'Data export feature will be implemented in a future update');
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all trips, fuel entries, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all tables in Supabase
              // This will be implemented when Supabase tables are set up
              console.log('Clear data functionality will be available when database is configured');
              
              Alert.alert('Info', 'Data clearing will be available when database is configured');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      'About Trucker Fuel Tax Calculator',
      'Version 1.0\n\nA comprehensive app for owner-operators to track trips, log fuel purchases, and calculate IFTA tax obligations.\n\nFeatures:\n• GPS trip tracking\n• Fuel purchase logging\n• Automatic tax calculations\n• Quarterly reporting\n• Data export capabilities',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your experience</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Use dark theme throughout the app</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor={darkMode ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-Start Trips</Text>
            <Text style={styles.settingDescription}>Automatically start trip tracking when moving</Text>
          </View>
          <Switch
            value={autoStartTrips}
            onValueChange={setAutoStartTrips}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor={autoStartTrips ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>High Accuracy GPS</Text>
            <Text style={styles.settingDescription}>Use high precision GPS (may drain battery faster)</Text>
          </View>
          <Switch
            value={highAccuracy}
            onValueChange={setHighAccuracy}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor={highAccuracy ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={exportAllData}>
          <Download size={20} color="#3B82F6" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Export All Data</Text>
            <Text style={styles.actionDescription}>Download trips and fuel data as CSV</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Upload size={20} color="#10B981" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Import Data</Text>
            <Text style={styles.actionDescription}>Import data from backup file</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={clearAllData}>
          <Trash2 size={20} color="#DC2626" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Clear All Data</Text>
            <Text style={styles.actionDescription}>Permanently delete all app data</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={showAbout}>
          <Info size={20} color="#6366F1" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>About</Text>
            <Text style={styles.actionDescription}>App version and information</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <SettingsIcon size={20} color="#F59E0B" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Help & Support</Text>
            <Text style={styles.actionDescription}>Get help and contact support</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Trucker Fuel Tax Calculator</Text>
        <Text style={styles.footerSubtext}>Version 1.0.0</Text>
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  actionDescription: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
});