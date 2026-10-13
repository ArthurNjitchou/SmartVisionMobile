import { router } from 'expo-router';
import { useEffect } from 'react';
import { ACCOUNT_DISABLED_MESSAGE } from '../constants/config';
import { paymentSocket } from '../services/payment-socket.service';
import { useAuthStore } from '../stores/authStore';

/**
 * Garde le socket ouvert pour tout utilisateur connecté (parent comme enseignant) afin
 * de recevoir `account:deactivated` : quand un administrateur désactive le compte, la
 * session est fermée immédiatement et l'écran de connexion affiche la raison.
 */
export function AccountStatusWatcher() {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!token) return;
    paymentSocket.connect();
    return paymentSocket.onAccountDeactivated(async () => {
      await logout(ACCOUNT_DISABLED_MESSAGE);
      router.replace('/(auth)/login' as never);
    });
  }, [token, logout]);

  return null;
}
