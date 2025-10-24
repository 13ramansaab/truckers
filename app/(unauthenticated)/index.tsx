import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function UnauthenticatedIndex() {
  // This screen should never be visible because AuthGate handles the login UI
  // If you see this screen, there's an issue with the AuthGate component
  console.log('UnauthenticatedIndex: This screen should not be visible - AuthGate should handle login UI');
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading Authentication...</Text>
      <Text style={styles.subtext}>If you see this, there's an issue with AuthGate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 10,
  },
  subtext: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
