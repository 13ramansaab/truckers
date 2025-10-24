import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [rcInitialized, setRcInitialized] = useState(false);

  useEffect(() => {
    // FORCE CLEAR: Clear any cached sessions to ensure fresh start
    const clearCachedSessions = async () => {
      try {
        // Force sign out multiple times to ensure complete cleanup
        await supabase.auth.signOut();
        await supabase.auth.signOut(); // Double sign out
        console.log('RootLayout: FORCE CLEARED all cached sessions');
        
        // Also clear any local storage
        try {
          const AsyncStorage = await import('@react-native-async-storage/async-storage');
          await AsyncStorage.default.removeItem('supabase.auth.token');
          await AsyncStorage.default.removeItem('sb-' + supabase.supabaseUrl.split('//')[1] + '-auth-token');
          console.log('RootLayout: Cleared local storage tokens');
        } catch (storageError) {
          console.log('RootLayout: No local storage to clear');
        }
      } catch (error) {
        console.log('RootLayout: No cached sessions to clear');
      }
    };

    // Check initial auth state FIRST - do not initialize RC until auth is resolved
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authenticated = !!session;
        setIsAuthenticated(authenticated);
        
        console.log('RootLayout: Auth state resolved (authed?', authenticated, ')');
        console.log('RootLayout: Session details:', session ? {
          userId: session.user?.id,
          email: session.user?.email,
          expiresAt: session.expires_at
        } : 'No session');
        
        // Only initialize RC AFTER auth state is resolved
        if (authenticated) {
          await initializeRevenueCat();
          // Link RC to authenticated user
          try {
            const { logInToPurchases } = await import('~/utils/iap');
            await logInToPurchases(session.user.id);
            console.log('RootLayout: RC loggedIn userId=', session.user.id, ', listener active? true');
          } catch (error) {
            console.warn('RootLayout: Failed to link RC to user:', error);
          }
        } else {
          // If no session, immediately logout from RevenueCat to prevent anonymous access
          try {
            const { logOutFromPurchases } = await import('~/utils/iap');
            await logOutFromPurchases();
            console.log('RootLayout: No session found, logged out from RevenueCat');
          } catch (error) {
            console.warn('RootLayout: Failed to logout from RevenueCat:', error);
          }
        }
      } catch (error) {
        console.warn('RootLayout: Failed to check auth state:', error);
        setIsAuthenticated(false);
      }
    };

    // Initialize RevenueCat only once at app bootstrap
    const initializeRevenueCat = async () => {
      if (rcInitialized) {
        console.log('RootLayout: RevenueCat already initialized');
        return;
      }

      try {
        const { initIAP } = await import('~/utils/iap');
        await initIAP();
        setRcInitialized(true);
        console.log('RootLayout: RevenueCat initialized successfully');
      } catch (error) {
        console.warn('RootLayout: Failed to initialize RevenueCat:', error);
      }
    };

    // Clear cached sessions first, then check auth state with delay
    clearCachedSessions().then(async () => {
      // Add delay to ensure session clearing takes effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('RootLayout: Starting auth check after session clear...');
      checkAuthState();
    });

    let sub: any = null;
    try {
      sub = AppState.addEventListener('change', s => {
        if (s === 'active' && supabase?.auth?.startAutoRefresh) {
          try {
            supabase.auth.startAutoRefresh();
          } catch (error) {
            console.warn('RootLayout: Failed to start auth auto-refresh:', error);
          }
        } else if (s !== 'active' && supabase?.auth?.stopAutoRefresh) {
          try {
            supabase.auth.stopAutoRefresh();
          } catch (error) {
            console.warn('RootLayout: Failed to stop auth auto-refresh:', error);
          }
        }
      });
    } catch (error) {
      console.warn('RootLayout: Failed to add AppState listener:', error);
    }
    
    // Start auto-refresh if available
    if (supabase?.auth?.startAutoRefresh) {
      try {
        supabase.auth.startAutoRefresh();
      } catch (error) {
        console.warn('RootLayout: Failed to start auth auto-refresh:', error);
      }
    }
    
    return () => { 
      if (supabase?.auth?.stopAutoRefresh) {
        try {
          supabase.auth.stopAutoRefresh();
        } catch (error) {
          console.warn('RootLayout: Failed to stop auth auto-refresh:', error);
        }
      }
      if (sub?.remove) {
        try {
          sub.remove(); 
        } catch (error) {
          console.warn('RootLayout: Failed to remove AppState listener:', error);
        }
      }
    };
  }, [rcInitialized]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('RootLayout: Auth state changed:', event, !!session);
      setIsAuthenticated(!!session);
      
      // If user logged out, immediately logout from RevenueCat
      if (!session) {
        try {
          const { logOutFromPurchases } = await import('~/utils/iap');
          await logOutFromPurchases();
          console.log('RootLayout: User logged out, logged out from RevenueCat');
        } catch (error) {
          console.warn('RootLayout: Failed to logout from RevenueCat on auth change:', error);
        }
      } else {
        // If user logged in, initialize RC and link to user
        try {
          if (!rcInitialized) {
            const { initIAP } = await import('~/utils/iap');
            await initIAP();
            setRcInitialized(true);
          }
          const { logInToPurchases } = await import('~/utils/iap');
          await logInToPurchases(session.user.id);
          console.log('RootLayout: RC loggedIn userId=', session.user.id, ', listener active? true');
        } catch (error) {
          console.warn('RootLayout: Failed to link RC to user on auth change:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [rcInitialized]);

  // Show loading while checking auth state
  if (isAuthenticated === null) {
    return (
      <ErrorBoundary>
        <StatusBar style="auto" />
      </ErrorBoundary>
    );
  }

  console.log('RootLayout: Rendering with isAuthenticated:', isAuthenticated);

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(authenticated)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(unauthenticated)" options={{ headerShown: false }} />
        )}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}
