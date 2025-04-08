import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../.expo/config/firebase';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <Stack screenOptions={{ gestureEnabled: false }}>
      {user ? (
        <>
          <Stack.Screen name="home" options={{ headerShown: false,  animation: 'slide_from_bottom'  }} />
          <Stack.Screen name="bleconnect" options={{ headerShown: false }} />

          {/* other screens for signed-in users */}
        </>
      ) : (
        <>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
        </>
      )}
    </Stack>
  );
}
 