import { Stack } from 'expo-router';
import PaywallGate from '~/components/PaywallGate';

export default function AuthenticatedLayout() {
  return (
    <PaywallGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </PaywallGate>
  );
}
