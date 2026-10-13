import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AccountStatusWatcher } from '../../src/components/AccountStatusWatcher';
import { useAuthStore } from '../../src/stores/authStore';

export default function AppLayout() {
  const { isAuthenticated, user, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialiser l'authentification au démarrage
    initializeAuth();
  }, []);

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <AccountStatusWatcher />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </>
  );
}
