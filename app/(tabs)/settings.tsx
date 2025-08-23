import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { Settings as SettingsIcon, Database, Download, Upload, Trash2, Info, MapPin, Smartphone, Crown, RefreshCw, User, LogOut } from 'lucide-react-native';
import { requestLocationPermissions } from '~/utils/location';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { getUnit, setUnit, getTheme, setTheme, getGpsHighAccuracy, setGpsHighAccuracy } from '~/utils/prefs';
import { loadThemeColors } from '~/utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '~/utils/supabase';
import { signOut } from '~/utils/auth';
import { getProfile, upsertProfile, type Profile } from '~/utils/profile';

export default function SettingsScreen() {
  const [theme, setThemeState] = useState<'system' | 'light' | 'dark'>('system');
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [colors, setColors] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Load settings when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const savedUnitSystem = await getUnit();
      const savedTheme = await getTheme();
      const savedHighAccuracy = await getGpsHighAccuracy();
      
      setUnitSystem(savedUnitSystem);
      setThemeState(savedTheme);
      setHighAccuracy(savedHighAccuracy);
      
      // Get current user email
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || null);
      } catch (error) {
        console.error('Error getting user:', error);
        setUserEmail(null);
      }
      
      // Get user profile
      try {
        const userProfile = await getProfile();
        setProfile(userProfile);
      } catch (error) {
        console.error('Error getting profile:', error);
        setProfile(null);
      }
      
      // Load theme colors after setting theme state
      const themeColors = await loadThemeColors();
      setColors(themeColors);
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
      
      // Reload theme colors immediately after theme change
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

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboarding.seen');
      Alert.alert('Success', 'Onboarding has been reset. Please restart the app to see the onboarding screens again.');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      Alert.alert('Error', 'Failed to reset onboarding state');
    }
  };

  const checkOnboardingState = async () => {
    try {
      const onboardingSeen = await AsyncStorage.getItem('onboarding.seen');
      Alert.alert('Onboarding State', `Current state: ${onboardingSeen || 'not set'}`);
    } catch (error) {
      console.error('Error checking onboarding state:', error);
      Alert.alert('Error', 'Failed to check onboarding state');
    }
  };

  const resetTrialState = async () => {
    try {
      await AsyncStorage.removeItem('trial.startedAt');
      Alert.alert('Success', 'Trial state has been reset. Please restart the app to see the paywall again.');
    } catch (error) {
      console.error('Error resetting trial state:', error);
      Alert.alert('Error', 'Failed to reset trial state');
    }
  };

  const checkTrialState = async () => {
    try {
      const trialStartedAt = await AsyncStorage.getItem('trial.startedAt');
      if (trialStartedAt) {
        const startTime = new Date(trialStartedAt);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 3 - daysPassed);
        Alert.alert('Trial State', `Trial started: ${startTime.toLocaleDateString()}\nDays left: ${daysLeft}`);
      } else {
        Alert.alert('Trial State', 'No trial has been started');
      }
    } catch (error) {
      console.error('Error checking trial state:', error);
      Alert.alert('Error', 'Failed to check trial state');
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
      'This will clear app preferences, trial data, and subscription state. Continue?',
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
                'trial.startedAt',
                'iap.subscriptionState'
              ]);
              
              // Reset to defaults
              setUnitSystem('us');
              
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
      `Version ${appVersion}\n\nA comprehensive app for owner-operators to track trips, log fuel purchases, and calculate IFTA tax obligations.\n\nFeatures:\n• GPS trip tracking\n• Fuel purchase logging\n• Automatic tax calculations\n• Quarterly reporting\n• Data export capabilities\n• Premium subscription with 3-day free trial`,
      [{ text: 'OK' }]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (!colors) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#111827' }]}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const dynamicStyles = createDynamicStyles(colors);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Customize your experience</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        
        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Email</Text>
            <Text style={[styles.settingDescription, { color: colors.muted }]}>
              {userEmail || 'Not signed in'}
            </Text>
          </View>
          <User size={20} color={colors.primary} />
        </View>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={handleSignOut}>
          <LogOut size={20} color={colors.danger} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Sign Out</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Sign out of your account</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
        
        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Unit System</Text>
            <Text style={[styles.settingDescription, { color: colors.muted }]}>Choose between US and Metric units</Text>
          </View>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[
                dynamicStyles.unitButton,
                unitSystem === 'us' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => handleUnitSystemChange('us')}
            >
              <Text style={[
                styles.unitButtonText,
                { color: unitSystem === 'us' ? colors.onPrimary : colors.muted }
              ]}>
                US
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dynamicStyles.unitButton,
                unitSystem === 'metric' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => handleUnitSystemChange('metric')}
            >
              <Text style={[
                styles.unitButtonText,
                { color: unitSystem === 'metric' ? colors.onPrimary : colors.muted }
              ]}>
                Metric
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.settingDescription, { color: colors.muted }]}>Choose app theme preference</Text>
          </View>
          <TouchableOpacity
            style={[dynamicStyles.themeButton]}
            onPress={handleThemeChange}
          >
            <Text style={[styles.themeButtonText, { color: colors.text }]}>
              {theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>High Accuracy GPS</Text>
            <Text style={[styles.settingDescription, { color: colors.muted }]}>
              {highAccuracy 
                ? 'Using high precision GPS (BestForNavigation accuracy)' 
                : 'Using balanced GPS (Balanced accuracy, better battery life)'
              }
            </Text>
          </View>
          <Switch
            value={highAccuracy}
            onValueChange={handleHighAccuracyChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={highAccuracy ? colors.onPrimary : colors.muted}
          />
        </View>
        

      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={requestLocationPermission}>
          <MapPin size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Request Location Permission</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Allow location access for trip tracking</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={openOSSettings}>
          <Smartphone size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Open System Settings</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Manage app permissions in system settings</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={clearCache}>
          <Database size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Clear Cache</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Clear app preferences and trial data</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={showAbout}>
          <Info size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>About</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>App version and information</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Debug</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={resetOnboarding}>
          <RefreshCw size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Reset Onboarding</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Show onboarding screens again (for testing)</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={checkOnboardingState}>
          <Info size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Check Onboarding State</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>View current onboarding status</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={resetTrialState}>
          <RefreshCw size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Reset Trial State</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>Clear trial data for testing</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface }]} onPress={checkTrialState}>
          <Info size={20} color={colors.primary} />
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Check Trial State</Text>
            <Text style={[styles.actionDescription, { color: colors.muted }]}>View current trial status</Text>
          </View>
        </TouchableOpacity>
      </View>



      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text }]}>IFTA Tracker</Text>
        <Text style={[styles.footerSubtext, { color: colors.muted }]}>Version {appVersion}</Text>
      </View>
    </ScrollView>
  );
}

const createDynamicStyles = (colors: any) => StyleSheet.create({
  unitButton: {
    backgroundColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  themeButton: {
    backgroundColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  loadingContent: {
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
    gap: 8,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  countryToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 8,
  },
  countryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileInfo: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileLabel: {
    fontSize: 14,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});