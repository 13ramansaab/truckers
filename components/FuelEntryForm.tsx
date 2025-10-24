import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Platform, Switch } from 'react-native';
import { Camera, Save, MapPin, Image as ImageIcon, Crown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { insertFuelPurchase } from '~/utils/database';
import { uploadReceiptImage } from '~/utils/storage';
import { FuelPurchase } from '~/types';
import { getCurrentLocation, getStateFromCoords } from '~/utils/location';
import { canAddFuelEntry, incrementFuelCount, getSubscriptionTier } from '~/utils/subscription';

interface FuelEntryFormProps {
  onEntryAdded?: (entry: FuelPurchase) => void;
  onUpgradePress?: () => void;
}

export default function FuelEntryForm({ onEntryAdded, onUpgradePress }: FuelEntryFormProps) {
  const [gallons, setGallons] = useState('');
  const [pricePerGallon, setPricePerGallon] = useState('');
  const [state, setState] = useState('');
  const [location, setLocation] = useState('');
  const [odometer, setOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [taxIncludedAtPump, setTaxIncludedAtPump] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fuelLimitInfo, setFuelLimitInfo] = useState<{ allowed: boolean; currentCount?: number; limit?: number }>({ allowed: true });
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkLimits = async () => {
      const tier = await getSubscriptionTier();
      setIsPremium(tier === 'premium');
      const limitInfo = await canAddFuelEntry();
      setFuelLimitInfo(limitInfo);
    };
    checkLimits();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    return true;
  };

  const takePhoto = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Receipt capture is a Premium feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Premium', onPress: onUpgradePress },
        ]
      );
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take receipt photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptPhoto(result.assets[0].uri);
      setUploadedReceiptUrl(null); // Reset uploaded URL when new photo taken
    }
  };

  const detectCurrentLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        setCurrentCoords(coords);
        
        const currentState = await getStateFromCoords(coords);
        if (currentState !== 'Unknown') {
          setState(currentState);
        }
        
        // Try to get a more specific location
        const { reverseGeocode } = await import('../utils/location');
        const address = await reverseGeocode(coords);
        if (address && address !== 'Unknown Location') {
          // Extract just the city/area part for location field
          const parts = address.split(',');
          if (parts.length > 0) {
            setLocation(parts[0].trim());
          }
        }
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      Alert.alert('Error', 'Unable to detect current location');
    }
  };

  const saveFuelPurchase = async () => {
    if (!fuelLimitInfo.allowed) {
      Alert.alert(
        'Free Tier Limit Reached',
        `You've reached the limit of ${fuelLimitInfo.limit} fuel entries this quarter. Upgrade to Premium for unlimited entries.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Premium', onPress: onUpgradePress },
        ]
      );
      return;
    }

    if (!gallons || !pricePerGallon || !state || !location) {
      Alert.alert('Missing Information', 'Please fill in all required fields (gallons, price, state, and location)');
      return;
    }

    const gallonsNum = parseFloat(gallons);
    const priceNum = parseFloat(pricePerGallon);
    const odometerNum = odometer ? parseFloat(odometer) : undefined;

    if (isNaN(gallonsNum) || isNaN(priceNum) || gallonsNum <= 0 || priceNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter valid positive numbers for gallons and price');
      return;
    }

    if (odometer && (isNaN(odometerNum!) || odometerNum! < 0)) {
      Alert.alert('Invalid Input', 'Please enter a valid odometer reading');
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload receipt if selected
      let finalReceiptUrl = uploadedReceiptUrl;
      if (receiptPhoto && !uploadedReceiptUrl) {
        try {
          const uploadResult = await uploadReceiptImage(receiptPhoto);
          finalReceiptUrl = uploadResult.receipt_url;
          setUploadedReceiptUrl(finalReceiptUrl);
        } catch (uploadError) {
          console.warn('Receipt upload failed, saving without receipt:', uploadError);
          // Continue without receipt if upload fails
          finalReceiptUrl = null;
        }
      }
      
      const fuelPurchase: FuelPurchase = {
        id: '', // Let DB generate UUID
        date: new Date().toISOString(),
        state,
        gallons: gallonsNum,
        pricePerGallon: priceNum,
        totalCost: gallonsNum * priceNum,
        taxIncludedAtPump,
        odometer: odometerNum,
        receiptPhoto: finalReceiptUrl || undefined,
        location,
        latitude: currentCoords?.latitude,
        longitude: currentCoords?.longitude,
        notes,
      };

      await insertFuelPurchase(fuelPurchase);

      await incrementFuelCount();

      const updatedLimitInfo = await canAddFuelEntry();
      setFuelLimitInfo(updatedLimitInfo);

      onEntryAdded?.(fuelPurchase);

      // Reset form
      setGallons('');
      setPricePerGallon('');
      setState('');
      setLocation('');
      setOdometer('');
      setNotes('');
      setReceiptPhoto(null);
      setUploadedReceiptUrl(null);
      setTaxIncludedAtPump(true);
      setCurrentCoords(null);

      Alert.alert('Success', 'Fuel purchase saved successfully');
    } catch (error) {
      console.error('Error saving fuel purchase:', error);
      Alert.alert('Error', 'Failed to save fuel purchase');
    } finally {
      setIsUploading(false);
    }
  };

  const totalCost = gallons && pricePerGallon ? 
    (parseFloat(gallons) * parseFloat(pricePerGallon)).toFixed(2) : '0.00';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Add Fuel Purchase</Text>

        {!isPremium && fuelLimitInfo.limit && (
          <View style={styles.limitBanner}>
            <Text style={styles.limitText}>
              {fuelLimitInfo.currentCount || 0}/{fuelLimitInfo.limit} entries this quarter
            </Text>
            {!fuelLimitInfo.allowed && (
              <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradePress}>
                <Crown size={14} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Gallons *</Text>
            <TextInput
              style={styles.input}
              value={gallons}
              onChangeText={setGallons}
              placeholder="0.00"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.halfField}>
            <Text style={styles.label}>Price/Gallon *</Text>
            <TextInput
              style={styles.input}
              value={pricePerGallon}
              onChangeText={setPricePerGallon}
              placeholder="$0.000"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Total Cost</Text>
          <Text style={styles.totalCost}>${totalCost}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>State/Province *</Text>
          <View style={styles.locationInputContainer}>
            <TextInput
              style={[styles.input, styles.locationInput]}
              value={state}
              onChangeText={setState}
              placeholder="Select state"
              placeholderTextColor="#6B7280"
            />
            <TouchableOpacity
              style={styles.detectButton}
              onPress={detectCurrentLocation}
            >
              <MapPin size={16} color="#FFFFFF" />
              <Text style={styles.detectButtonText}>Auto</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Gas station name or city"
            placeholderTextColor="#6B7280"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.switchContainer}>
            <View style={styles.switchInfo}>
              <Text style={styles.label}>Tax Included at Pump</Text>
              <Text style={styles.switchDescription}>
                Was fuel tax included in the pump price?
              </Text>
            </View>
            <Switch
              value={taxIncludedAtPump}
              onValueChange={setTaxIncludedAtPump}
              trackColor={{ false: '#374151', true: '#3B82F6' }}
              thumbColor={taxIncludedAtPump ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Odometer Reading</Text>
          <TextInput
            style={styles.input}
            value={odometer}
            onChangeText={setOdometer}
            placeholder="Miles (optional)"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes (optional)"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Camera size={20} color="#FFFFFF" />
          <Text style={styles.photoButtonText}>
            {receiptPhoto || uploadedReceiptUrl ? 'Receipt Photo Added ✓' : 'Take Receipt Photo'}
          </Text>
        </TouchableOpacity>

        {(receiptPhoto || uploadedReceiptUrl) && (
          <View style={styles.photoPreview}>
            <ImageIcon size={16} color="#10B981" />
            <Text style={styles.photoPreviewText}>Receipt ready for upload</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.saveButton, isUploading && styles.saveButtonDisabled]} 
          onPress={saveFuelPurchase}
          disabled={isUploading}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {isUploading ? 'Uploading...' : 'Save Fuel Purchase'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    margin: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  totalCost: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  detectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  photoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#065F46',
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
    gap: 6,
  },
  photoPreviewText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  limitText: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});