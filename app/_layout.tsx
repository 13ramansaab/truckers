import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

if (__DEV__) {
  LogBox.ignoreLogs([
    /ENOENT: .*<anonymous>/,
    'Failed to set an indexed property'
  ]);
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
