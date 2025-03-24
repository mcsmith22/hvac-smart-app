import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        gestureEnabled: false 
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />

      <Stack.Screen name="signup" options={{ headerShown: false, animation: 'none' }} />

      <Stack.Screen name="home" options={{ headerShown: false,  animation: 'slide_from_bottom'  }} />

      <Stack.Screen name="bleconnect" options={{ headerShown: false }} />
    </Stack>
  );
}
 