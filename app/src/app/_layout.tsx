import { Stack } from 'expo-router';

import { GT_GOLD, GT_NAVY } from '@/constants/campus';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: GT_NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { color: GT_GOLD },
      }}>
      <Stack.Screen name="index" options={{ title: 'GT Event Map' }} />
    </Stack>
  );
}
