import { Stack } from 'expo-router';
import { navHeaderGreen } from '../../../../src/constants/config';

export default function ParentPaymentsLayout() {
  return (
    <Stack screenOptions={{ ...navHeaderGreen, headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'Paiements' }} />
    </Stack>
  );
}
