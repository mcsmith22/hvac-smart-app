import React, { useState, useEffect } from 'react';
import { TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; 
import { getAuth } from 'firebase/auth';
import Ionicons from "react-native-vector-icons/Ionicons";

interface DeviceData {
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  replaceFilter: boolean;
  gas_value: number;
  unit_type: string;
  userId: string;
  errorCodes: string[];
}

export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams();
  const [deviceInfo, setDeviceInfo] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const router = useRouter();

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
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Ionicons 
              name="arrow-back"  
              size={25}           
              color="white"       
              onPress={() => router.back()} 
              style={styles.backButton} 
          />
          <Text style={styles.headerText}>
            <Text style={styles.headerBold}>HVA</Text>
              <Text style={styles.headerItalic}>See</Text>
          </Text>
              <Text style={styles.headerHome}>Device: {deviceId}</Text>
        </View>
      </SafeAreaView>
      
      <SafeAreaView style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#49aae6" />
        ) : deviceInfo ? (
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/ErrorLogScreen')}
              >
              <Text style={styles.cardTitle}>Error Status: </Text>
              <Text style={styles.cardValue}>{deviceInfo.color}</Text>
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </TouchableOpacity>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Device ID: </Text>
              <Text style={styles.cardValue}>{deviceInfo.deviceId}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Date of Request: </Text>
              <Text style={styles.cardValue}>{deviceInfo.date_of_req}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Flash Sequence: </Text>
              <Text style={styles.cardValue}>{deviceInfo.flash_sequence}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Amp Measurement: </Text>
              <Text style={styles.cardValue}>{deviceInfo.amp_measurement}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gas Value: </Text>
              <Text style={styles.cardValue}>{deviceInfo.gas_value}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Unit Type: </Text>
              <Text style={styles.cardValue}>{deviceInfo.unit_type}</Text>
            </View>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/powerGraph')}
              >
              <Text style={styles.cardTitle}>View Power Consumption </Text>
              
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </TouchableOpacity>
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
  card: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4, 
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  cardValue: {
    padding: 6,
    fontSize: 17,
    color: '#555',
  },
  cardArrow: {
    marginLeft: 'auto'
  },
  headerBar: {
    backgroundColor: '#49aae6',
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerBold: {
    fontWeight: 'bold',
  },
  headerItalic: {
    fontStyle: 'italic',
  },
  safeArea: {
    flex: 0,  
  },
  headerHome: {
    fontSize: 16,
    color: '#fff',
    marginTop: 0,
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
  backButton: {
    position: 'absolute',
    top: 20, 
    left: 10,
    padding: 10,
  },
});
