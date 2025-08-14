import { Tabs } from 'expo-router';
import { Chrome as Home, Route, Fuel, FileText, Settings } from 'lucide-react-native';
import AuthGate from '@/components/AuthGate';
import PaywallGate from '@/components/PaywallGate';

export default function TabLayout() {
  return (
    <AuthGate>
      <PaywallGate>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: '#6B7280',
            tabBarStyle: {
              backgroundColor: '#111827',
              borderTopColor: '#374151',
              borderTopWidth: 1,
              height: 80,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ size, color }) => (
                <Home size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="trip"
            options={{
              title: 'Trip',
              tabBarIcon: ({ size, color }) => (
                <Route size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="fuel"
            options={{
              title: 'Fuel',
              tabBarIcon: ({ size, color }) => (
                <Fuel size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="quarter"
            options={{
              title: 'Quarter',
              tabBarIcon: ({ size, color }) => (
                <FileText size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ size, color }) => (
                <Settings size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </PaywallGate>
    </AuthGate>
  );
}