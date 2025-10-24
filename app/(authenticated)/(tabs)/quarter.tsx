import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { FileText, Download, TrendingUp, DollarSign, Calculator, Crown, Lock } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { getQuarterTrips, getQuarterFuelPurchases, getTaxRatesSnapshot } from '~/utils/database';
import { computeIFTA, bucketMilesByState } from '~/utils/ifta';
import { formatDistance, formatVolume, formatEfficiency, miToKm, galToL, mpgToKmPerL } from '~/utils/units';
import ExportButtons from '~/components/ExportButtons';
import { getPreferredUnit, getPreferredCurrency } from '~/utils/prefs';
import { loadThemeColors } from '~/utils/theme';
import { getSubscriptionTier } from '~/utils/subscription';
import { router } from 'expo-router';

function getQuarterRange(year: number, q: number) {
  const m0 = (q - 1) * 3;
  const start = new Date(Date.UTC(year, m0, 1));
  const end = new Date(Date.UTC(year, m0 + 3, 0, 23, 59, 59, 999));
  return { start, end };
}

export default function QuarterScreen() {
  const [quarterData, setQuarterData] = useState<any>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [unitSystem, setUnitSystem] = useState<'us' | 'metric'>('us');
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<any>(null);
  const [colors, setColors] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    // Auto-detect current quarter
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    setSelectedQuarter(currentQuarter);
  }, []);

  // Reload when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadPreferencesAndGenerateReport();
    }, [selectedQuarter, selectedYear])
  );

  const loadPreferencesAndGenerateReport = async () => {
    try {
      const [unit, themeColors, tier] = await Promise.all([
        getPreferredUnit(),
        loadThemeColors(),
        getSubscriptionTier()
      ]);

      setUnitSystem(unit);
      setColors(themeColors);
      setIsPremium(tier === 'premium');

      if (tier === 'premium') {
        await generateReport(selectedQuarter, selectedYear, unit);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      const tier = await getSubscriptionTier();
      setIsPremium(tier === 'premium');
      if (tier === 'premium') {
        await generateReport(selectedQuarter, selectedYear, unitSystem);
      }
    }
  };

  const generateReport = async (quarter: number, year: number, unit?: 'us' | 'metric') => {
    setLoading(true);
    try {
      const currentUnitSystem = unit || unitSystem;
      
      const trips = await getQuarterTrips(year, quarter);
      const fuelEntries = await getQuarterFuelPurchases(year, quarter);
      const taxRates = await getTaxRatesSnapshot(year, quarter);
      
      // Aggregate miles by state from trips
      const milesByState: Record<string, number> = {};
      trips.forEach(trip => {
        // Use trip.totalMiles and trip.startLocation.state as fallback
        if (trip.milesByState && Object.keys(trip.milesByState).length > 0) {
          Object.entries(trip.milesByState).forEach(([state, miles]) => {
            milesByState[state] = (milesByState[state] || 0) + miles;
          });
        } else if (trip.totalMiles > 0) {
          // Fallback: use start location state or Unknown
          const state = (trip.startLocation as any)?.state || 'Unknown';
          milesByState[state] = (milesByState[state] || 0) + trip.totalMiles;
        }
      });
      
      // Aggregate fuel by state
      const fuelByState: Record<string, number> = {};
      const taxIncludedByState: Record<string, { gallons: number; rate: number }[]> = {};
      
      fuelEntries.forEach(fuel => {
        fuelByState[fuel.state] = (fuelByState[fuel.state] || 0) + fuel.gallons;
        
        // Track tax-included purchases for tax paid at pump calculation
        if (fuel.taxIncludedAtPump) {
          if (!taxIncludedByState[fuel.state]) {
            taxIncludedByState[fuel.state] = [];
          }
          taxIncludedByState[fuel.state].push({
            gallons: fuel.gallons,
            rate: taxRates[fuel.state] || 0
          });
        }
      });
      
      // Calculate tax paid at pump per state
      const taxPaidAtPumpByState: Record<string, number> = {};
      Object.entries(taxIncludedByState).forEach(([state, purchases]) => {
        taxPaidAtPumpByState[state] = purchases.reduce((sum, p) => sum + (p.gallons * p.rate), 0);
      });
      
      // Compute IFTA results  
      const iftaResult = computeIFTA({
        milesByState,
        fuelByState,
        ratesByState: taxRates
      });
      
      // Calculate total fuel cost
      const totalFuelCost = fuelEntries.reduce((sum, fuel) => sum + fuel.totalCost, 0);
      
      // Set totals with proper values even if zero
      const computedTotals = {
        miles: currentUnitSystem === 'metric' ? miToKm(iftaResult.totalMiles || 0) : (iftaResult.totalMiles || 0),
        gallons: currentUnitSystem === 'metric' ? galToL(iftaResult.totalGallons || 0) : (iftaResult.totalGallons || 0),
        fleetMPG: currentUnitSystem === 'metric' ? mpgToKmPerL(iftaResult.fleetMPG || 0) : (iftaResult.fleetMPG || 0),
        net: iftaResult.netLiability || 0,
        unit: currentUnitSystem,
      };
      setTotals(computedTotals);
      
      setQuarterData({
        quarter,
        year,
        totalFuelCost,
        ...iftaResult,
        stateBreakdown: Object.entries(iftaResult.stateResults).map(([state, data]) => ({
          state,
          ...data,
          fuelPurchased: currentUnitSystem === 'metric' ? galToL(fuelByState[state] || 0) : (fuelByState[state] || 0),
          fleetMPG: currentUnitSystem === 'metric' ? mpgToKmPerL(iftaResult.fleetMPG) : iftaResult.fleetMPG,
          taxRate: taxRates[state] || 0,
          miles: currentUnitSystem === 'metric' ? miToKm(data.miles) : data.miles,
        })).sort((a, b) => b.miles - a.miles),
      });
    } catch (error) {
      console.error('Error generating report:', error);
      // Set empty totals on error
      setTotals({ miles: 0, gallons: 0, fleetMPG: 0, net: 0, unit: unitSystem });
      Alert.alert('Error', 'Failed to generate quarterly report');
    } finally {
      setLoading(false);
    }
  };

  const quarters = [1, 2, 3, 4];
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  if (!colors) {
    return (
      <View style={[styles.container, { backgroundColor: '#111827' }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const dynamicStyles = createDynamicStyles(colors);

  const handleUpgrade = () => {
    router.push('/(authenticated)/(tabs)/settings');
  };

  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Quarterly Summary</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>IFTA tax calculations and reporting</Text>
        </View>

        <View style={[styles.premiumGate, { backgroundColor: colors.surface }]}>
          <Lock size={48} color="#F59E0B" />
          <Text style={[styles.premiumTitle, { color: colors.text }]}>Premium Feature</Text>
          <Text style={[styles.premiumDescription, { color: colors.muted }]}>
            IFTA report generation is available with Premium subscription.
          </Text>
          <Text style={[styles.premiumDescription, { color: colors.muted }]}>
            Free users can view current quarter raw data in the dashboard.
          </Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Crown size={20} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>

          <View style={[styles.featuresList, { borderColor: colors.border }]}>
            <Text style={[styles.featuresTitle, { color: colors.text }]}>Premium Includes:</Text>
            <Text style={[styles.featureItem, { color: colors.muted }]}>• Quarterly IFTA report generation</Text>
            <Text style={[styles.featureItem, { color: colors.muted }]}>• State-by-state breakdown</Text>
            <Text style={[styles.featureItem, { color: colors.muted }]}>• PDF and CSV export</Text>
            <Text style={[styles.featureItem, { color: colors.muted }]}>• Historical report access</Text>
            <Text style={[styles.featureItem, { color: colors.muted }]}>• GPS-based trip tracking</Text>
            <Text style={[styles.featureItem, { color: colors.muted }]}>• Unlimited fuel entries</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Quarterly Summary</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>IFTA tax calculations and reporting</Text>
      </View>

      <View style={styles.selectorContainer}>
        <View style={styles.quarterSelector}>
          <Text style={[styles.selectorLabel, { color: colors.text }]}>Quarter</Text>
          <View style={styles.selectorButtons}>
            {quarters.map(q => (
              <TouchableOpacity
                key={q}
                style={[
                  dynamicStyles.selectorButton,
                  selectedQuarter === q && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => {
                  setSelectedQuarter(q);
                  generateReport(q, selectedYear, unitSystem);
                }}
              >
                <Text style={[
                  { color: selectedQuarter === q ? colors.onPrimary : colors.muted },
                  styles.selectorButtonText
                ]}>
                  Q{q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.yearSelector}>
          <Text style={[styles.selectorLabel, { color: colors.text }]}>Year</Text>
          <View style={styles.selectorButtons}>
            {years.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  dynamicStyles.selectorButton,
                  selectedYear === year && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  generateReport(selectedQuarter, year, unitSystem);
                }}
              >
                <Text style={[
                  { color: selectedYear === year ? colors.onPrimary : colors.muted },
                  styles.selectorButtonText
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Generating report...</Text>
        </View>
      ) : quarterData ? (
        <>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <TrendingUp size={24} color="#3B82F6" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {(totals?.miles || 0).toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  Total {totals?.unit === 'metric' ? 'Kilometers' : 'Miles'}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <DollarSign size={24} color="#10B981" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${(quarterData?.totalFuelCost || 0).toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Fuel Cost</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <Calculator size={24} color="#F59E0B" />
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {(totals?.fleetMPG || 0).toFixed(1)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  Avg {totals?.unit === 'metric' ? 'km/L' : 'MPG'}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <DollarSign size={24} color={(totals?.net || 0) >= 0 ? '#DC2626' : '#10B981'} />
                <Text style={[
                  styles.summaryValue,
                  { color: (totals?.net || 0) >= 0 ? colors.danger : '#10B981' }
                ]}>
                  ${Math.abs(totals?.net || 0).toFixed(2)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                  {(totals?.net || 0) >= 0 ? 'Tax Owed' : 'Tax Refund'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.taxBreakdownContainer}>
            <View style={styles.taxBreakdownHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Breakdown</Text>
            </View>
            <View style={styles.exportButtonsContainer}>
              <ExportButtons
                rows={quarterData.stateBreakdown}
                unitSystem={unitSystem}
                quarter={selectedQuarter}
                year={selectedYear}
              />
            </View>

            <View style={[styles.taxSummary, { backgroundColor: colors.surface }]}>
              <View style={styles.taxSummaryRow}>
                <Text style={[styles.taxSummaryLabel, { color: colors.muted }]}>Total Tax Liability:</Text>
                <Text style={[styles.taxSummaryValue, { color: colors.text }]}>
                  ${quarterData.totalLiability.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.taxSummaryRow}>
                <Text style={[styles.taxSummaryLabel, { color: colors.muted }]}>Total Tax Credits:</Text>
                <Text style={[styles.taxSummaryValue, { color: colors.text }]}>
                  ${(quarterData.totalLiability - quarterData.netLiability).toFixed(2)}
                </Text>
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <View style={styles.taxSummaryRow}>
                <Text style={[styles.taxSummaryLabel, styles.netTaxLabel, { color: colors.text }]}>Net Tax:</Text>
                <Text style={[
                  styles.taxSummaryValue,
                  styles.netTaxValue,
                  { color: quarterData.netLiability >= 0 ? colors.danger : '#10B981' }
                ]}>
                  {quarterData.netLiability >= 0 ? '' : '-'}${Math.abs(quarterData.netLiability).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stateBreakdownContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>State Breakdown</Text>
            
            {quarterData.stateBreakdown.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                <FileText size={48} color="#6B7280" />
                <Text style={[styles.emptyStateText, { color: colors.text }]}>No data for this quarter</Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.muted }]}>
                  Add trips and fuel entries to see state breakdown
                </Text>
              </View>
            ) : (
              <View style={styles.stateList}>
                {quarterData.stateBreakdown.map((state: any, index: number) => (
                  <View key={`${state.state}-${index}`} style={[styles.stateCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.stateHeader}>
                      <Text style={[styles.stateName, { color: colors.text }]}>{state.state}</Text>
                      <Text style={[styles.stateNetTax, { color: colors.primary }]}>
                        Net: ${state.liability.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.stateDetails}>
                      <View style={styles.stateRow}>
                        <Text style={[styles.stateLabel, { color: colors.muted }]}>
                          {unitSystem === 'metric' ? 'Kilometers:' : 'Miles:'}
                        </Text>
                        <Text style={[styles.stateValue, { color: colors.text }]}>
                          {state.miles.toFixed(0)} {unitSystem === 'metric' ? 'km' : 'mi'}
                        </Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={[styles.stateLabel, { color: colors.muted }]}>Fuel Purchased:</Text>
                        <Text style={[styles.stateValue, { color: colors.text }]}>
                          {(state.fuelPurchased || 0).toFixed(1)} {unitSystem === 'metric' ? 'L' : 'gal'}
                        </Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={[styles.stateLabel, { color: colors.muted }]}>Tax Rate:</Text>
                        <Text style={[styles.stateValue, { color: colors.text }]}>
                          ${state.taxRate.toFixed(3)}/{unitSystem === 'metric' ? 'L' : 'gal'}
                        </Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={[styles.stateLabel, { color: colors.muted }]}>Tax Liability:</Text>
                        <Text style={[styles.stateValue, { color: colors.danger }]}>
                          ${(state.taxRate * state.taxableGallons).toFixed(2)}
                        </Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={[styles.stateLabel, { color: colors.muted }]}>Tax Credits:</Text>
                        <Text style={[styles.stateValue, { color: '#10B981' }]}>
                          ${state.taxPaidAtPump.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const createDynamicStyles = (colors: any) => StyleSheet.create({
  selectorButton: {
    backgroundColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

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
  selectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 16,
  },
  quarterSelector: {},
  yearSelector: {},
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    borderRadius: 12,
    padding: 32,
    margin: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  taxBreakdownContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  taxBreakdownHeader: {
    marginBottom: 16,
  },
  exportButtonsContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  taxSummary: {
    borderRadius: 12,
    padding: 16,
  },
  taxSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taxSummaryLabel: {
    fontSize: 14,
  },
  taxSummaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  netTaxLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  netTaxValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  stateBreakdownContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
  stateList: {
    gap: 12,
  },
  stateCard: {
    borderRadius: 12,
    padding: 16,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stateName: {
    fontSize: 18,
    fontWeight: '600',
  },
  stateNetTax: {
    fontSize: 14,
    fontWeight: '600',
  },
  stateDetails: {
    gap: 4,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateLabel: {
    fontSize: 14,
  },
  stateValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  premiumGate: {
    margin: 16,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  premiumDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresList: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    marginBottom: 8,
  },
});