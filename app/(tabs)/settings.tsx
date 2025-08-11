import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { Settings as SettingsIcon, Database, Download, Upload, Trash2, Info, MapPin, Smartphone } from 'lucide-react-native';
import { daysLeft, isTrialActive, isSubscribed, ensureTrialStart } from '@/utils/trial';
import { requestLocationPermissions } from '@/utils/location';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { getUnit, setUnit, getTheme, setTheme, getGpsHighAccuracy, setGpsHighAccuracy } from '@/utils/prefs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [theme, setThemeState] = useState<'system' | 'light' | 'dark'>('system');
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');

  // Load settings when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      await ensureTrialStart();
      const savedUnitSystem = await getUnit();
      const savedTheme = await getTheme();
      const savedHighAccuracy = await getGpsHighAccuracy();
      const remainingDays = await daysLeft();
      const isActive = await isTrialActive();
      const isSub = await isSubscribed();
      
      setUnitSystem(savedUnitSystem);
      setThemeState(savedTheme);
      setHighAccuracy(savedHighAccuracy);
      setTrialDaysLeft(remainingDays);
      setTrialActive(isActive);
      setSubscribed(isSub);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleUnitSystemChange = async (newUnitSystem: 'us' | 'metric') => {
    setUnitSystem(newUnitSystem);
    await setUnit(newUnitSystem);
  };

  const handleThemeChange = async () => {
    const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setThemeState(nextTheme);
    await setTheme(nextTheme);
  };

  const handleHighAccuracyChange = async (value: boolean) => {
    setHighAccuracy(value);
    await setGpsHighAccuracy(value);
  };

  const requestLocationPermission = async () => {
    try {
      const granted = await requestLocationPermissions();
      if (granted) {
        Alert.alert('Success', 'Location permissions granted');
      } else {
        Alert.alert('Permission Denied', 'Location permission was not granted');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  const openOSSettings = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
      } else {
        Alert.alert('Info', 'Settings not available on web platform');
      }
    } catch (error) {
      console.error('Error opening OS settings:', error);
      Alert.alert('Error', 'Could not open system settings');
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear app preferences and trial data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear settings and trial data
              await AsyncStorage.multiRemove([
                'settings.unitSystem',
                'trial.startedAt'
              ]);
              
              // Reset to defaults
              setUnitSystem('us');
              setTrialDaysLeft(14);
              setTrialActive(true);
              
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const showAbout = () => {
    Alert.alert(
      'About Trucker Fuel Tax Calculator',
      `Version ${appVersion}\n\nA comprehensive app for owner-operators to track trips, log fuel purchases, and calculate IFTA tax obligations.\n\nFeatures:\n• GPS trip tracking\n• Fuel purchase logging\n• Automatic tax calculations\n• Quarterly reporting\n• Data export capabilities`,
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
            <Text style={styles.settingLabel}>Unit System</Text>
            <Text style={styles.settingDescription}>Choose between US and Metric units</Text>
          </View>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitButton, unitSystem === 'us' && styles.unitButtonActive]}
              onPress={() => handleUnitSystemChange('us')}
            >
              <Text style={[styles.unitButtonText, unitSystem === 'us' && styles.unitButtonTextActive]}>
                US
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, unitSystem === 'metric' && styles.unitButtonActive]}
              onPress={() => handleUnitSystemChange('metric')}
            >
              <Text style={[styles.unitButtonText, unitSystem === 'metric' && styles.unitButtonTextActive]}>
                Metric
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Theme</Text>
            <Text style={styles.settingDescription}>Choose app theme preference</Text>
          </View>
          <TouchableOpacity
            style={styles.themeButton}
            onPress={handleThemeChange}
          >
            <Text style={styles.themeButtonText}>
              {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>High Accuracy GPS</Text>
            <Text style={styles.settingDescription}>Use high precision GPS (may drain battery faster)</Text>
          </View>
          <Switch
            value={highAccuracy}
            onValueChange={handleHighAccuracyChange}
            trackColor={{ false: '#374151', true: '#3B82F6' }}
            thumbColor={highAccuracy ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trial & Subscription</Text>
        
        <View style={styles.trialStatus}>
          <Text style={styles.trialStatusTitle}>
            {subscribed ? 'Subscribed' : trialActive ? `Trial Active: ${trialDaysLeft} days left` : 'Trial Expired'}
          </Text>
          <Text style={styles.trialStatusDescription}>
            {subscribed 
              ? 'Full access to all features' 
              : trialActive 
                ? 'Export features available during trial'
                : 'Subscribe to continue exporting reports'
            }
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={requestLocationPermission}>
          <MapPin size={20} color="#3B82F6" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Request Location Permission</Text>
            <Text style={styles.actionDescription}>Allow location access for trip tracking</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={openOSSettings}>
          <Smartphone size={20} color="#6366F1" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Open System Settings</Text>
            <Text style={styles.actionDescription}>Manage app permissions in system settings</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
          <Database size={20} color="#F59E0B" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionLabel}>Clear Cache</Text>
            <Text style={styles.actionDescription}>Clear app preferences and trial data</Text>
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
      </View>

      {__DEV__ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Development Tools</Text>
          <DevDataGenerator />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Trucker Fuel Tax Calculator</Text>
        <Text style={styles.footerSubtext}>Version {appVersion}</Text>
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
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 2,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: '#3B82F6',
  },
  unitButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  unitButtonTextActive: {
    color: '#FFFFFF',
  },
  themeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  trialStatus: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  trialStatusTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trialStatusDescription: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});