import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { FileText, Download, TrendingUp, DollarSign, Calculator } from 'lucide-react-native';
import { getQuarterTrips, getQuarterFuelPurchases, getTaxRatesSnapshot } from '@/utils/database';
import { computeIFTA, bucketMilesByState } from '@/utils/ifta';
import { canExport, daysLeft, ensureTrialStart } from '@/utils/trial';
import { formatDistance, formatVolume, formatEfficiency } from '@/utils/units';
import ExportButtons from '@/components/ExportButtons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [canExportData, setCanExportData] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-detect current quarter
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    setSelectedQuarter(currentQuarter);
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await ensureTrialStart();
    const canExportStatus = await canExport();
    const trialDays = await daysLeft();
    
    // Load unit system from settings
    const savedUnitSystem = await AsyncStorage.getItem('settings.unitSystem');
    if (savedUnitSystem) {
      setUnitSystem(savedUnitSystem as 'us' | 'metric');
    }
    
    setCanExportData(canExportStatus);
    setTrialDaysLeft(trialDays);
    generateReport(selectedQuarter, selectedYear);
  };

  const generateReport = async (quarter: number, year: number) => {
    setLoading(true);
    try {
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
      
      setQuarterData({
        quarter,
        year,
        totalFuelCost,
        ...iftaResult,
        stateBreakdown: Object.entries(iftaResult.stateResults).map(([state, data]) => ({
          state,
          ...data,
          fuelPurchased: fuelByState[state] || 0,
          fleetMPG: iftaResult.fleetMPG,
          taxRate: taxRates[state] || 0,
        })).sort((a, b) => b.miles - a.miles),
      });
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate quarterly report');
    } finally {
      setLoading(false);
    }
  };

  const handleDisabledExport = () => {
    if (trialDaysLeft > 0) {
      Alert.alert(
        'Trial Active',
        `You have ${trialDaysLeft} days remaining in your free trial.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Export Unavailable',
        'Export is available during 14-day trial or with a subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK' }
        ]
      );
    }
  };

  const quarters = [1, 2, 3, 4];
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quarterly Summary</Text>
        <Text style={styles.subtitle}>IFTA tax calculations and reporting</Text>
      </View>

      <View style={styles.selectorContainer}>
        <View style={styles.quarterSelector}>
          <Text style={styles.selectorLabel}>Quarter</Text>
          <View style={styles.selectorButtons}>
            {quarters.map(q => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.selectorButton,
                  selectedQuarter === q && styles.selectorButtonActive
                ]}
                onPress={() => {
                  setSelectedQuarter(q);
                  generateReport(q, selectedYear);
                }}
              >
                <Text style={[
                  styles.selectorButtonText,
                  selectedQuarter === q && styles.selectorButtonTextActive
                ]}>
                  Q{q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.yearSelector}>
          <Text style={styles.selectorLabel}>Year</Text>
          <View style={styles.selectorButtons}>
            {years.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.selectorButton,
                  selectedYear === year && styles.selectorButtonActive
                ]}
                onPress={() => {
                  setSelectedYear(year);
                  generateReport(selectedQuarter, year);
                }}
              >
                <Text style={[
                  styles.selectorButtonText,
                  selectedYear === year && styles.selectorButtonTextActive
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating report...</Text>
        </View>
      ) : quarterData ? (
        <>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <TrendingUp size={24} color="#3B82F6" />
                <Text style={styles.summaryValue}>{quarterData.totalMiles.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Total Miles</Text>
              </View>

              <View style={styles.summaryCard}>
                <DollarSign size={24} color="#10B981" />
                <Text style={styles.summaryValue}>${quarterData.totalFuelCost.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Fuel Cost</Text>
              </View>

              <View style={styles.summaryCard}>
                <Calculator size={24} color="#F59E0B" />
                <Text style={styles.summaryValue}>{quarterData.fleetMPG.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>Avg MPG</Text>
              </View>

              <View style={styles.summaryCard}>
                <DollarSign size={24} color={quarterData.netLiability >= 0 ? '#DC2626' : '#10B981'} />
                <Text style={[
                  styles.summaryValue,
                  { color: quarterData.netLiability >= 0 ? '#DC2626' : '#10B981' }
                ]}>
                  ${Math.abs(quarterData.netLiability).toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>
                  {quarterData.netLiability >= 0 ? 'Tax Owed' : 'Tax Refund'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.taxBreakdownContainer}>
            <View style={styles.taxBreakdownHeader}>
              <Text style={styles.sectionTitle}>Tax Breakdown</Text>
              <ExportButtons
                rows={quarterData.stateBreakdown}
                unitSystem={unitSystem}
                disabled={!canExportData}
                onDisabledPress={handleDisabledExport}
                quarter={selectedQuarter}
                year={selectedYear}
              />
            </View>

            <View style={styles.taxSummary}>
              <View style={styles.taxSummaryRow}>
                <Text style={styles.taxSummaryLabel}>Total Tax Liability:</Text>
                <Text style={styles.taxSummaryValue}>
                  ${quarterData.totalLiability.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.taxSummaryRow}>
                <Text style={styles.taxSummaryLabel}>Total Tax Credits:</Text>
                <Text style={styles.taxSummaryValue}>
                  ${(quarterData.totalLiability - quarterData.netLiability).toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.taxSummaryRow}>
                <Text style={[styles.taxSummaryLabel, styles.netTaxLabel]}>Net Tax:</Text>
                <Text style={[
                  styles.taxSummaryValue,
                  styles.netTaxValue,
                  { color: quarterData.netLiability >= 0 ? '#DC2626' : '#10B981' }
                ]}>
                  {quarterData.netLiability >= 0 ? '' : '-'}${Math.abs(quarterData.netLiability).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stateBreakdownContainer}>
            <Text style={styles.sectionTitle}>State Breakdown</Text>
            
            {quarterData.stateBreakdown.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color="#6B7280" />
                <Text style={styles.emptyStateText}>No data for this quarter</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add trips and fuel entries to see state breakdown
                </Text>
              </View>
            ) : (
              <View style={styles.stateList}>
                {quarterData.stateBreakdown.map((state: any, index: number) => (
                  <View key={`${state.state}-${index}`} style={styles.stateCard}>
                    <View style={styles.stateHeader}>
                      <Text style={styles.stateName}>{state.state}</Text>
                      <Text style={styles.stateNetTax}>
                        Net: ${state.liability.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.stateDetails}>
                      <View style={styles.stateRow}>
                        <Text style={styles.stateLabel}>Miles:</Text>
                        <Text style={styles.stateValue}>{state.miles.toFixed(0)}</Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={styles.stateLabel}>Fuel Purchased:</Text>
                        <Text style={styles.stateValue}>{(state.fuelPurchased || 0).toFixed(1)} gal</Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={styles.stateLabel}>Tax Rate:</Text>
                        <Text style={styles.stateValue}>${state.taxRate.toFixed(3)}/gal</Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={styles.stateLabel}>Tax Liability:</Text>
                        <Text style={[styles.stateValue, { color: '#DC2626' }]}>
                          ${(state.taxRate * state.taxableGallons).toFixed(2)}
                        </Text>
                      </View>
                      
                      <View style={styles.stateRow}>
                        <Text style={styles.stateLabel}>Tax Credits:</Text>
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
  selectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 16,
  },
  quarterSelector: {},
  yearSelector: {},
  selectorLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  selectorButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  selectorButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  selectorButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 32,
    margin: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
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
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  taxBreakdownContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  taxBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
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
    backgroundColor: '#1F2937',
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
    color: '#9CA3AF',
    fontSize: 14,
  },
  taxSummaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  netTaxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  netTaxValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  stateBreakdownContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
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
  stateList: {
    gap: 12,
  },
  stateCard: {
    backgroundColor: '#1F2937',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  stateNetTax: {
    color: '#3B82F6',
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
    color: '#9CA3AF',
    fontSize: 14,
  },
  stateValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});