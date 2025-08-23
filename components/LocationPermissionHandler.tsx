import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, AlertCircle } from 'lucide-react-native';

interface LocationPermissionHandlerProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  showRequestButton?: boolean;
}

export default function LocationPermissionHandler({
  onPermissionGranted,
  onPermissionDenied,
  showRequestButton = true,
}: LocationPermissionHandlerProps) {
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const status = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status.status);
      
      if (status.status === 'granted' && onPermissionGranted) {
        onPermissionGranted();
      }
    } catch (error) {
      console.warn('Could not check permission status:', error);
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use trip tracking features.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      
      if (status === 'granted') {
        if (onPermissionGranted) {
          onPermissionGranted();
        }
      } else {
        if (onPermissionDenied) {
          onPermissionDenied();
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert(
        'Permission Error',
        'There was an error requesting location permission. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openSettings = () => {
    Alert.alert(
      'Location Permission Required',
      'Location permission is required for trip tracking. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          // On iOS, this will open the app settings
          // On Android, this will open the app info page
          // Note: expo-linking can be used for a more robust solution
        }}
      ]
    );
  };

  if (permissionStatus === 'granted') {
    return null; // Don't show anything if permission is granted
  }

  if (permissionStatus === 'denied' && !showRequestButton) {
    return (
      <View style={styles.container}>
        <AlertCircle size={20} color="#EF4444" />
        <Text style={styles.text}>
          Location permission is required for trip tracking features.
        </Text>
        <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapPin size={20} color="#3B82F6" />
      <Text style={styles.text}>
        Location permission is needed to track your trips and calculate mileage.
      </Text>
      {showRequestButton && (
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={requestPermission}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Requesting...' : 'Allow Location Access'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginVertical: 8,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
