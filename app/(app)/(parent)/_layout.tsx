import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { BRAND, navHeaderGreen } from '../../../src/constants/config';
import { PaymentStatusHost } from '../../../src/components/payments/PaymentStatusHost';
import { useTabBarStyle } from '../../../src/hooks/useTabBarStyle';
import { useAuthStore } from '../../../src/stores/authStore';

export default function ParentLayout() {
  const { user, isLoading } = useAuthStore();
  const tabBarStyle = useTabBarStyle();

  // Important en web sur refresh deep-link (/help, /report, ...):
  // on attend la fin de l'hydratation auth avant toute redirection.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BRAND.green} />
      </View>
    );
  }

  if (!user || user.role !== 'parent') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <StatusBar style="light" />
      <PaymentStatusHost />
      <Tabs
        screenOptions={{
          ...navHeaderGreen,
          headerTitleAlign: 'center',
          tabBarActiveTintColor: BRAND.green,
          tabBarInactiveTintColor: '#6B7280',
          tabBarActiveBackgroundColor: '#EEF7EF',
          tabBarLabelStyle: { fontWeight: '700' },
          tabBarItemStyle: { marginHorizontal: 3, borderRadius: 10 },
          tabBarStyle,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          title: 'Enfants',
          tabBarLabel: 'Enfants',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Paiements',
          tabBarLabel: 'Paiements',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Rapport',
          tabBarLabel: 'Rapport',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          title: 'Aide',
        }}
      />
      </Tabs>
    </>
  );
}
