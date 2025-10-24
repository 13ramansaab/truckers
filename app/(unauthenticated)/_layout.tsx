import { Stack } from 'expo-router';
import AuthGate from '~/components/AuthGate';

export default function UnauthenticatedLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}
