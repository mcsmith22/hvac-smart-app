import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../.expo/config/firebase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#49aae6' }} edges={['left', 'right']}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        {user ? (
          <>
            <Stack.Screen name="home" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="bleconnect" />
          </>
        ) : (
          <>
            <Stack.Screen name="index" />
            <Stack.Screen name="signup" />
          </>
        )}
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
