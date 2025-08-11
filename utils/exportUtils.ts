import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const generateCSV = (data: any[], headers: string[]): string => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header.toLowerCase().replace(' ', '')];
      return typeof value === 'string' ? `"${value}"` : value || '';
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

export const exportToCSV = async (filename: string, csvContent: string): Promise<void> => {
  try {
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      console.log('Sharing is not available on this platform');
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

export const generateQuarterlyCSV = (quarterData: any): string => {
  const headers = ['State', 'Miles', 'Fuel Purchased (gal)', 'Fuel Cost ($)', 'Tax Rate', 'Tax Liability ($)', 'Tax Credits ($)', 'Net Tax ($)'];
  
  const data = quarterData.stateBreakdown.map((state: any) => ({
    state: state.state,
    miles: state.miles,
    'fuelpurchased(gal)': state.fuelPurchased.toFixed(2),
    'fuelcost($)': state.fuelCost.toFixed(2),
    taxrate: state.taxRate.toFixed(3),
    'taxliability($)': state.taxLiability.toFixed(2),
    'taxcredits($)': state.taxCredits.toFixed(2),
    'nettax($)': (state.taxLiability - state.taxCredits).toFixed(2),
  }));
  
  // Add summary row
  data.push({
    state: 'TOTAL',
    miles: quarterData.totalMiles,
    'fuelpurchased(gal)': quarterData.totalFuelPurchased.toFixed(2),
    'fuelcost($)': quarterData.totalFuelCost.toFixed(2),
    taxrate: '',
    'taxliability($)': quarterData.taxLiability.toFixed(2),
    'taxcredits($)': quarterData.taxCredits.toFixed(2),
    'nettax($)': quarterData.netTax.toFixed(2),
  });
  
  return generateCSV(data, headers);
};