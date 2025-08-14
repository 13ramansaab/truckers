import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Download, FileText } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { loadThemeColors } from '@/utils/theme';

interface ExportButtonsProps {
  rows: any[];
  unitSystem: 'us' | 'metric';
  quarter: number;
  year: number;
}

export default function ExportButtons({
  rows,
  unitSystem,
  quarter,
  year,
}: ExportButtonsProps) {
  const [colors, setColors] = React.useState<any>(null);

  React.useEffect(() => {
    loadThemeColors().then(setColors);
  }, []);

  const exportCSV = async () => {
    try {
      const headers = 'Quarter,Year,State,Miles,Gallons Purchased,Fleet MPG,Taxable Gallons,Tax Rate,Tax Paid At Pump,Liability';
      const csvRows = rows.map(row => 
        `${quarter},${year},${row.state},${row.miles.toFixed(2)},${row.fuelPurchased.toFixed(2)},${row.fleetMPG.toFixed(2)},${row.taxableGallons.toFixed(2)},${row.taxRate.toFixed(3)},${row.taxPaidAtPump.toFixed(2)},${row.liability.toFixed(2)}`
      );
      
      const csvContent = [headers, ...csvRows].join('\n');
      const filename = `ifta_Q${quarter}_${year}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export IFTA CSV',
        });
      } else {
        Alert.alert('Success', `CSV saved to ${filename}`);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV file');
    }
  };

  const exportPDF = async () => {
    try {
      const totalMiles = rows.reduce((sum, row) => sum + row.miles, 0);
      const totalGallons = rows.reduce((sum, row) => sum + row.fuelPurchased, 0);
      const fleetMPG = totalGallons > 0 ? totalMiles / totalGallons : 0;
      const netLiability = rows.reduce((sum, row) => sum + row.liability, 0);
      
      const stateRows = rows.map(row => `
        <tr>
          <td>${row.state}</td>
          <td>${row.miles.toFixed(2)}</td>
          <td>${row.fuelPurchased.toFixed(2)}</td>
          <td>${fleetMPG.toFixed(2)}</td>
          <td>${row.taxableGallons.toFixed(2)}</td>
          <td>$${row.taxRate.toFixed(3)}</td>
          <td>$${row.taxPaidAtPump.toFixed(2)}</td>
          <td>$${row.liability.toFixed(2)}</td>
        </tr>
      `).join('');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>IFTA Quarter Summary</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .totals { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>IFTA Quarter Summary – Q${quarter} ${year}</h1>
            <p>Unit System: ${unitSystem.toUpperCase()} | Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="totals">
            <h3>Summary Totals</h3>
            <p><strong>Total Miles:</strong> ${totalMiles.toFixed(2)}</p>
            <p><strong>Total Gallons:</strong> ${totalGallons.toFixed(2)}</p>
            <p><strong>Fleet MPG:</strong> ${fleetMPG.toFixed(2)}</p>
            <p><strong>Net Liability:</strong> $${netLiability.toFixed(2)}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Miles</th>
                <th>Gallons Purchased</th>
                <th>Fleet MPG</th>
                <th>Taxable Gallons</th>
                <th>Tax Rate</th>
                <th>Tax Paid At Pump</th>
                <th>Liability</th>
              </tr>
            </thead>
            <tbody>
              ${stateRows}
            </tbody>
          </table>
          
          <div class="footer">
            <p>All distances computed with Haversine; state detection via reverse-geocoding (approx).</p>
          </div>
        </body>
        </html>
      `;
      
      const filename = `ifta_Q${quarter}_${year}.pdf`;
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      
      // Move to documents directory with proper filename
      const finalUri = FileSystem.documentDirectory + filename;
      await FileSystem.moveAsync({
        from: uri,
        to: finalUri,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export IFTA PDF',
        });
      } else {
        Alert.alert('Success', `PDF saved to ${filename}`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'Failed to export PDF file');
    }
  };

  if (!colors) return null;

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.csvButton]}
        onPress={exportCSV}
        activeOpacity={0.8}
      >
        <Download size={16} color={colors.onPrimary} />
        <Text style={styles.buttonText}>
          Export CSV
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.pdfButton]}
        onPress={exportPDF}
        activeOpacity={0.8}
      >
        <FileText size={16} color={colors.onDanger} />
        <Text style={styles.buttonText}>
          Export PDF
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    minHeight: 40,
  },
  csvButton: {
    backgroundColor: colors.primary,
  },
  pdfButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});