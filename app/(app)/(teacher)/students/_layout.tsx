import { Stack } from 'expo-router';
import { navHeaderGreen } from '../../../../src/constants/config';

export default function TeacherStudentsLayout() {
  return (
    <Stack
      screenOptions={{
        ...navHeaderGreen,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mes élèves' }} />
      <Stack.Screen
        name="report-create"
        options={{ title: 'Bilan hebdomadaire', headerShown: false }}
      />
    </Stack>
  );
}
