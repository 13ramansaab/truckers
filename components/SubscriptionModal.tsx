import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Crown, Check, Zap } from 'lucide-react-native';
import { loadThemeColors } from '~/utils/theme';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

export default function SubscriptionModal({
  visible,
  onClose,
  onSubscribed,
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [colors, setColors] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const themeColors = await loadThemeColors();
      setColors(themeColors);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      // Subscription logic moved to PaywallGate
      Alert.alert('Info', 'Subscription handled by PaywallGate');
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'An error occurred during purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (!colors) {
    return null;
  }

  const features = [
    'Unlimited CSV exports',
    'Unlimited PDF reports',
    'Advanced analytics',
    'Priority support',
    'Cloud backup',
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Crown size={32} color={colors.onPrimary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Upgrade to Premium
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Unlock unlimited exports and premium features
            </Text>
          </View>

          <View style={[styles.trialBanner, { backgroundColor: colors.primary }]}>
            <Zap size={20} color={colors.onPrimary} />
            <Text style={[styles.trialText, { color: colors.onPrimary }]}>
              Start with 3 days FREE
            </Text>
          </View>

          <View style={[styles.pricingCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.priceText, { color: colors.text }]}>
              $9.99
            </Text>
            <Text style={[styles.periodText, { color: colors.muted }]}>
              per month
            </Text>
            <Text style={[styles.trialInfo, { color: colors.muted }]}>
              3-day free trial, then $9.99/month
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, { color: colors.text }]}>
              What's included:
            </Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Check size={20} color="#10B981" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: colors.primary },
              purchasing && styles.subscribeButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={purchasing || loading}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={[styles.subscribeButtonText, { color: colors.onPrimary }]}>
                Start Free Trial
              </Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            Cancel anytime. Your subscription will auto-renew unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  trialText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pricingCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  priceText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  periodText: {
    fontSize: 18,
    marginTop: 4,
  },
  trialInfo: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 40,
  },
});