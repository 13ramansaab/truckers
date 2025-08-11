// components/ExportButtons.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Download, FileText } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

interface ExportButtonsProps {
  csvData: string;
  pdfData: string;
  disabled: boolean;
  onDisabledPress: () => void;
  quarter: number;
  year: number;
}

export default function ExportButtons({
  csvData,
  pdfData,
  disabled,
  onDisabledPress,
  quarter,
  year,
}: ExportButtonsProps) {
  const exportCSV = async () => {
    if (disabled) {
      onDisabledPress();
      return;
    }

    try {
      const filename = `ifta_Q${quarter}_${year}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
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
    if (disabled) {
      onDisabledPress();
      return;
    }

    try {
      const filename = `ifta_Q${quarter}_${year}.pdf`;
      
      const { uri } = await Print.printToFileAsync({
        html: pdfData,
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.csvButton, disabled && styles.disabledButton]}
        onPress={exportCSV}
      >
        <Download size={16} color={disabled ? '#6B7280' : '#FFFFFF'} />
        <Text style={[styles.buttonText, disabled && styles.disabledText]}>
          Export CSV
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.pdfButton, disabled && styles.disabledButton]}
        onPress={exportPDF}
      >
        <FileText size={16} color={disabled ? '#6B7280' : '#FFFFFF'} />
        <Text style={[styles.buttonText, disabled && styles.disabledText]}>
          Export PDF
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  csvButton: {
    backgroundColor: '#10B981',
  },
  pdfButton: {
    backgroundColor: '#DC2626',
  },
  disabledButton: {
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    color: '#6B7280',
  },
});