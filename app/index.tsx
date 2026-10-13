import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { IntroSplash } from '../src/components/IntroSplash';
import { BRAND } from '../src/constants/config';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, initializeAuth } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const handleIntroFinish = useCallback(() => {
    setIntroDone(true);
  }, []);

  useEffect(() => {
    initializeAuth();
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [initializeAuth]);

  const readyToRoute = isMounted && introDone && !isLoading;

  useEffect(() => {
    if (!readyToRoute) return;

    const navigate = () => {
      if (isAuthenticated && user) {
        if (user.role === 'teacher') {
          router.replace('/(app)/(teacher)' as any);
        } else if (user.role === 'parent') {
          router.replace('/(app)/(parent)' as any);
        }
      } else {
        router.replace('/(auth)/login' as any);
      }
    };

    requestAnimationFrame(() => {
      setTimeout(navigate, 0);
    });
  }, [readyToRoute, isAuthenticated, user, router]);

  return (
    <View style={styles.root}>
      {!introDone && <IntroSplash onFinish={handleIntroFinish} />}
      {introDone && isLoading && (
        <View style={styles.loadingLayer}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingDots}>
              <View style={[styles.loadingDot, { backgroundColor: BRAND.green }]} />
              <View style={[styles.loadingDot, { backgroundColor: BRAND.orange }]} />
              <View style={[styles.loadingDot, { backgroundColor: BRAND.green }]} />
            </View>
            <ActivityIndicator size="large" color={BRAND.orange} style={styles.loadingSpinner} />
            <Text style={styles.loadingLabel}>Chargement…</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: 16,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e8ebe9',
    shadowColor: BRAND.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingSpinner: {
    marginBottom: 12,
  },
  loadingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.green,
    letterSpacing: 0.2,
  },
});
