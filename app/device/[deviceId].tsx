import React, { useState, useEffect } from 'react';
import { TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { auth } from '../../.expo/config/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Ionicons from "react-native-vector-icons/Ionicons";

interface DeviceData {
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  userId: string;
  deviceBrand?: string;
  deviceName?: string;
  errorDetail?: string;
  solutionSteps?: string;
}

const removeFirstWord = (str: string): string => {
  const words = str.split(' ');
  return words.length > 1 ? words.slice(1).join(' ') : str;
};

const convertToISO = (dateStr: string): string => {
  const parts = dateStr.split('-'); 
  if (parts.length !== 6) return '1970-01-01T00:00:00Z';
  return `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}Z`;
};

const deriveStatusFromFlashSequence = (flash: string | undefined): 'good' | 'warning' | 'failure' => {
  if (!flash) return 'good';
  const tokens = flash.split(' ');
  const longCount = tokens.filter(token => token.toLowerCase() === 'long').length;
  if (longCount >= 2) return 'failure';
  if (longCount === 1) return 'warning';
  return 'good';
};

export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams();
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);

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
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data: DeviceData[] = await response.json();
      const entriesForDevice = data.filter(entry => entry.deviceId === deviceId);
      if (entriesForDevice.length === 0) {
        setDeviceInfo(null);
      } else {
        entriesForDevice.sort(
          (a, b) => new Date(convertToISO(b.date_of_req)).getTime() - new Date(convertToISO(a.date_of_req)).getTime()
        );
        let latestDevice = entriesForDevice[0];
        const db = getFirestore();

        const deviceRef = doc(db, 'users', latestDevice.userId, 'devices', latestDevice.deviceId);
        const deviceSnap = await getDoc(deviceRef);
        if (deviceSnap.exists()) {
          const firestoreData = deviceSnap.data();
          latestDevice = {
            ...latestDevice,
            deviceBrand: firestoreData.deviceBrand,
            deviceName: firestoreData.deviceName,
          };
        }

        if (latestDevice.deviceBrand) {
          const codeRef = doc(db, 'codes', latestDevice.deviceBrand, 'CODES', latestDevice.flash_sequence);
          const codeSnap = await getDoc(codeRef);
          if (codeSnap.exists()) {
            const codeData = codeSnap.data();
            latestDevice = {
              ...latestDevice,
              errorDetail: codeData.error,
              solutionSteps: codeData.steps,
            };
          }
        }
        setDeviceInfo(latestDevice);
      }
    } catch (error) {
      console.error('Error fetching device info:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceInfo();
    const intervalId = setInterval(fetchDeviceInfo, 1000);
    return () => clearInterval(intervalId);
  }, [deviceId]);

  const status = deviceInfo ? deriveStatusFromFlashSequence(deviceInfo.flash_sequence) : 'good';
  const statusInfo = {
    good: { color: '#39b54a', text: 'No Warnings', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  };

  return (
    <>
      <Stack.Screen options={{ title: deviceInfo ? `${deviceInfo.deviceName}` : `Device ${deviceId}` }} />
      <SafeAreaView style={{ backgroundColor: '#49aae6' }} edges={['left', 'right']}>
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
            {deviceInfo && deviceInfo.deviceName ? deviceInfo.deviceName : `Device: ${deviceId}`}
          </Text>
        </View>
      </SafeAreaView>
      
      <SafeAreaView style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#49aae6" />
          </View>
        ) : deviceInfo ? (
          <ScrollView contentContainerStyle={styles.contentContainer}>

            <View style={styles.statusContainer}>
              <Ionicons
                name={statusInfo[status].icon}
                size={50}
                color={statusInfo[status].color}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.statusText, { color: statusInfo[status].color }]}>
                {statusInfo[status].text}
              </Text>
            </View>
            <View style={styles.separator} />
            
            {deviceInfo.errorDetail && (status === 'warning' || status === 'failure') && (
              <TouchableOpacity 
                style={styles.card} 
                onPress={() => setUnitErrorsOpen(!unitErrorsOpen)}
              >
                <Text style={styles.sectionTitle}>
                  Error Status: {removeFirstWord(deviceInfo.errorDetail)}
                </Text>
                <Ionicons 
                  style={styles.cardArrow} 
                  name={unitErrorsOpen ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#aaa" 
                />
              </TouchableOpacity>
            )}
            
            {unitErrorsOpen && deviceInfo.solutionSteps && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorStepsTitle}>Solution Steps:</Text>
                <Text style={styles.errorSteps}>{deviceInfo.solutionSteps}</Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filter Status: </Text>
              <Text style={styles.cardValue}>{deviceInfo.amp_measurement}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gas Value: </Text>
              <Text style={[styles.cardValue, { color: deviceInfo.gas_value > 0 ? '#39b54a' : '#ff3b30' }]}>
                {deviceInfo.gas_value}
              </Text>
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Device Brand: </Text>
              <Text style={styles.cardValue}>{deviceInfo.deviceBrand}</Text>
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
          <Text style={styles.errorText}>
            No device information found for deviceId: {deviceId}
          </Text>
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  errorDetails: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginVertical: 6 },
  errorStepsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#333' },
  errorSteps: { fontSize: 14, color: '#555' },
  date: { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', marginTop: 80 },
});
