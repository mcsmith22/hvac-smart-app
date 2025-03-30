import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router'; 
import { getAuth } from 'firebase/auth';

interface DeviceData {
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  unit_type: string;
  userId: string;
}

export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams();
  const [deviceInfo, setDeviceInfo] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  const fetchDeviceInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No user signed in.");
        return;
      }
      const token = await user.getIdToken();

      const response = await fetch('https://HVASee.azurewebsites.net/api/getColor', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data: DeviceData[] = await response.json();

      const entriesForDevice = data.filter(entry => entry.deviceId === deviceId);
      if (entriesForDevice.length === 0) {
        setDeviceInfo(null);
      } else {

        entriesForDevice.sort((a, b) => new Date(b.date_of_req).getTime() - new Date(a.date_of_req).getTime());
        setDeviceInfo(entriesForDevice[0]);
      }
    } catch (error) {
      console.error('Error fetching device info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceInfo();
  }, [deviceId]);

  return (
    <>
      <Stack.Screen options={{ title: `Device ${deviceId}` }} />
      <SafeAreaView style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#49aae6" />
        ) : deviceInfo ? (
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Device ID:</Text>
              <Text style={styles.value}>{deviceInfo.deviceId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Color:</Text>
              <Text style={styles.value}>{deviceInfo.color}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Date of Request:</Text>
              <Text style={styles.value}>{deviceInfo.date_of_req}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Flash Sequence:</Text>
              <Text style={styles.value}>{deviceInfo.flash_sequence}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Amp Measurement:</Text>
              <Text style={styles.value}>{deviceInfo.amp_measurement}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Gas Value:</Text>
              <Text style={styles.value}>{deviceInfo.gas_value}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Unit Type:</Text>
              <Text style={styles.value}>{deviceInfo.unit_type}</Text>
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.errorText}>No device information found for deviceId: {deviceId}</Text>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    width: 150,
    color: '#555',
  },
  value: {
    flex: 1,
    color: '#333',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});
