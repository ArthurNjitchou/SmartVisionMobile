import { Stack } from 'expo-router';
import { navHeaderGreen } from '../../../../src/constants/config';

export default function TeacherPaymentsLayout() {
  return (
    <Stack screenOptions={{ ...navHeaderGreen, headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'Mes paiements' }} />
    </Stack>
  );
}
