import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { Settings as SettingsIcon, Database, Download, Upload, Trash2, Info, MapPin, Smartphone } from 'lucide-react-native';
import { daysLeft, isTrialActive, isSubscribed, ensureTrialStart } from '@/utils/trial';
import { requestLocationPermissions } from '@/utils/location';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { getUnit, setUnit, getTheme, setTheme, getGpsHighAccuracy, setGpsHighAccuracy } from '@/utils/prefs';
import { loadThemeColors } from '@/utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [theme, setThemeState] = useState<'system' | 'light' | 'dark'>('system');
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialActive, setTrialActive] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [colors, setColors] = useState<any>(null);

  // Load settings when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      await ensureTrialStart();
      const themeColors = await loadThemeColors();
      setColors(themeColors);
      
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
    try {
      await setUnit(newUnitSystem);
      setUnitSystem(newUnitSystem);
    } catch (error) {
      console.error('Error saving unit system:', error);
      Alert.alert('Error', 'Failed to save unit system preference');
    }
  };

  const handleThemeChange = async () => {
    try {
      const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
      await setTheme(nextTheme);
      setThemeState(nextTheme);
      
      // Reload theme colors
      const themeColors = await loadThemeColors();
      setColors(themeColors);
    } catch (error) {
      console.error('Error saving theme:', error);
      Alert.alert('Error', 'Failed to save theme preference');
    }
  };

  const handleHighAccuracyChange = async (value: boolean) => {
    try {
      await setGpsHighAccuracy(value);
      setHighAccuracy(value);
    } catch (error) {
      console.error('Error saving GPS accuracy:', error);
    }
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={requestLocationPermission}>
          <MapPin size={20} color="#3B82F6" />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Request Location Permission</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Allow location access for trip tracking</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={openOSSettings}>
          <Smartphone size={20} color="#6366F1" />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Open System Settings</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Manage app permissions in system settings</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={clearCache}>
          <Database size={20} color="#F59E0B" />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Clear Cache</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Clear app preferences and trial data</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={showAbout}>
          <Info size={20} color="#6366F1" />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>About</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>App version and information</Text>
          </View>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Development Tools</Text>
          {(() => {
            try {
              const DevDataGenerator = require('@/components/DevDataGenerator').default;
              return <DevDataGenerator />;
            } catch (error) {
              return (
                <Text style={[styles.actionDescription, { color: colors.muted }]}>
                  DevDataGenerator not available
                </Text>
              );
            }
          })()}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text }]}>Trucker Fuel Tax Calculator</Text>
        <Text style={[styles.footerSubtext, { color: colors.muted }]}>Version {appVersion}</Text>
      </View>
    </ScrollView>
  );
}

const createDynamicStyles = (colors: any) => StyleSheet.create({
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
    backgroundColor: colors.border,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  trialStatus: {
    borderRadius: 12,
    padding: 16,
  },
  trialStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trialStatusDescription: {
    fontSize: 14,
  },
});