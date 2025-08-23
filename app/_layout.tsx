import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, AppState } from 'react-native';
import { useFrameworkReady } from '~/hooks/useFrameworkReady';
import { supabase } from '~/utils/supabase';
import ErrorBoundary from '~/components/ErrorBoundary';


if (__DEV__) {
  LogBox.ignoreLogs([
    /ENOENT: .*<anonymous>/,
    'Failed to set an indexed property'
  ]);
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Initialize RevenueCat when app starts
    const initializeRevenueCat = async () => {
      try {
        const { initIAP } = await import('../utils/iap');
        await initIAP();
      } catch (error) {
        console.warn('Failed to initialize RevenueCat:', error);
      }
    };

    // Delay initialization slightly to ensure modules are loaded
    const timer = setTimeout(initializeRevenueCat, 100);

    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => { 
      clearTimeout(timer);
      supabase.auth.stopAutoRefresh(); 
      sub.remove(); 
    };
  }, []);

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}
