import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Use the DeviceData shape from your first version (with an added "status" field)
interface DeviceData {
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  unit_type: string;
  userId: string;
  deviceBrand?: string;
  deviceName?: string;
  status?: 'good' | 'warning' | 'failure';
}

export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams();
  const router = useRouter();
  const auth = getAuth();
  
  const [deviceInfo, setDeviceInfo] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  // Retain unit errors toggle (UI from second version)
  const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);

  // --- Data Fetching Logic from the First Version ---

  // Convert a custom dash-separated date string (6 parts) to an ISO date string.
  function convertToISO(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length !== 6) return '1970-01-01T00:00:00Z';
    return `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}Z`;
  }

  // Derive system status based on the flash_sequence content.
  const deriveStatusFromFlashSequence = (flash: string | undefined): 'good' | 'warning' | 'failure' => {
    if (!flash) return 'good';
    const firstWord = flash.split(' ')[0].toLowerCase();
    if (firstWord === 'warning:') return 'warning';
    if (firstWord === 'failure:') return 'failure';
    return 'good';
  };

  // Fetch device info from your API, then filter and sort to get the latest record,
  // finally enriching it with Firestore data.
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
      // Filter data for this deviceId
      const entriesForDevice = data.filter(entry => entry.deviceId === deviceId);
      if (entriesForDevice.length === 0) {
        setDeviceInfo(null);
      } else {
        // Sort the entries by date (using our ISO converter) to get the latest entry
        entriesForDevice.sort((a, b) => {
          const dateA = new Date(convertToISO(a.date_of_req)).getTime();
          const dateB = new Date(convertToISO(b.date_of_req)).getTime();
          return dateB - dateA;
        });
        const latestDevice = entriesForDevice[0];
        
        // Enrich with additional Firestore data (deviceBrand and deviceName)
        const db = getFirestore();
        const deviceRef = doc(db, 'users', latestDevice.userId, 'devices', latestDevice.deviceId);
        const docSnap = await getDoc(deviceRef);
        const enrichedDevice = docSnap.exists()
          ? {
              ...latestDevice,
              deviceBrand: docSnap.data().deviceBrand,
              deviceName: docSnap.data().deviceName,
            }
          : latestDevice;
        // Set the system status using the flash_sequence content
        enrichedDevice.status = deriveStatusFromFlashSequence(enrichedDevice.flash_sequence);
        setDeviceInfo(enrichedDevice);
      }
    } catch (error) {
      console.error('Error fetching device info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceInfo();
    // Poll every 1000ms for updated data
    const intervalId = setInterval(fetchDeviceInfo, 1000);
    return () => clearInterval(intervalId);
  }, [deviceId]);

  // Determine overall status (if needed by UI; here we use the device's own status)
  const overallStatus = deviceInfo ? deviceInfo.status || 'good' : 'good';

  // UI Status info styling (from your second version)
  const statusInfo = {
    good: { color: '#39b54a', text: 'No Warnings', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  };

  // --- UI from the Second Version ---

  return (
    <>
      {/* Hide default header to use custom header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header with back button */}
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
          <Text style={styles.headerHome}>
            {deviceInfo && deviceInfo.deviceName
              ? deviceInfo.deviceName
              : `Device: ${deviceId}`}
          </Text>
        </View>
      </SafeAreaView>
      
      <SafeAreaView style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#49aae6" />
        ) : deviceInfo ? (
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.statusContainer}>
              <Ionicons
                name={statusInfo[overallStatus].icon}
                size={50}
                color={statusInfo[overallStatus].color}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.statusText, { color: statusInfo[overallStatus].color }]}>
                {statusInfo[overallStatus].text}
              </Text>
            </View>
            <View style={styles.separator} />

            {(deviceInfo.status === 'warning' || deviceInfo.status === 'failure') && (
              <TouchableOpacity 
                style={styles.card} 
                onPress={() => setUnitErrorsOpen(!unitErrorsOpen)}
              >
                <Text style={styles.sectionTitle}>Unit Errors</Text>
                <Ionicons 
                  style={styles.cardArrow} 
                  name={unitErrorsOpen ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#aaa" 
                />
              </TouchableOpacity>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filter Status: </Text>
              <Text style={styles.cardValue}>{deviceInfo.amp_measurement}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gas Value: </Text>
              <Text style={styles.cardValue}>{deviceInfo.gas_value}</Text>
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Unit Type: </Text>
              <Text style={styles.cardValue}>{deviceInfo.unit_type}</Text>
            </View>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/powerGraph')}
            >
              <Text style={styles.cardTitle}>View Power Consumption</Text>
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </TouchableOpacity>
            <Text style={styles.date}>Last Updated: {deviceInfo.date_of_req}</Text>
          </ScrollView>
        ) : (
          <Text style={styles.errorText}>No device information found for deviceId: {deviceId}</Text>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  safeArea: { flex: 0 },
  contentContainer: { padding: 16, paddingBottom: 80 },
  headerBar: {
    backgroundColor: '#49aae6',
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
    position: 'relative',
  },
  backButton: { position: 'absolute', top: 20, left: 10, padding: 10 },
  headerText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerBold: { fontWeight: 'bold' },
  headerItalic: { fontStyle: 'italic' },
  headerHome: { fontSize: 16, color: '#fff', marginTop: 0 },
  statusContainer: { alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 18, fontWeight: 'bold' },
  separator: { height: 1, backgroundColor: '#ddd', marginVertical: 12, width: '100%' },
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
  cardTitle: { fontWeight: 'bold', fontSize: 18, color: '#333' },
  cardValue: { padding: 6, fontSize: 17, color: '#555' },
  cardArrow: { marginLeft: 'auto' },
  date: { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
});
