import { Stack } from 'expo-router';
import { navHeaderGreen } from '../../../../src/constants/config';

export default function ParentChildrenStackLayout() {
  return (
    <Stack
      screenOptions={{
        ...navHeaderGreen,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mes enfants',
        }}
      />
      <Stack.Screen name="grades" options={{ title: 'Notes' }} />
    </Stack>
  );
}
