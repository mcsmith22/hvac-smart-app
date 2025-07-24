import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../src/config/firebase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
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
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false, animation: "none", }}>
        {user ? (
          <>
            <Stack.Screen name="home" options={{ animation: 'none' }} />
            <Stack.Screen name="bleconnect" options={{ animation: 'none' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="signup" options={{ animation: 'none' }} />
          </>
        )}
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
