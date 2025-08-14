import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, AppState } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/utils/supabase';

if (__DEV__) {
  LogBox.ignoreLogs([
    /ENOENT: .*<anonymous>/,
    'Failed to set an indexed property'
  ]);
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => { supabase.auth.stopAutoRefresh(); sub.remove(); };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => { supabase.auth.stopAutoRefresh(); sub.remove(); };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
