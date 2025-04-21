import React, { useState, useEffect } from 'react';
import { TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { auth } from '../../.expo/config/firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Linking } from 'react-native';
import { toZonedTime } from 'date-fns-tz'

interface DeviceData {
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  deviceBrand?: string;
  deviceName?: string;
  errorDetail?: string;
  solutionSteps?: string;
  youtubeLink?: string;
}
const removeFirstWord = (str: string): string => {
  if (str) {
      const words = str.split(' ');
    return words.length > 1 ? words.slice(1).join(' ') : str;
  }
  return ""

};

const convertToISO = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 6) return dateStr;
  return toZonedTime(`${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}Z`, "America/New_York").toString();
};

const deriveStatus = (errorString: string | undefined, gasValue: number): 'good' | 'warning' | 'failure' => {
  let status: 'good' | 'warning' | 'failure' = 'good';

  if (errorString) {
    const firstWord = errorString.split(' ')[0].replace(':', '').toLowerCase();
    if (firstWord === 'failure') {
      status = 'failure';
    } else if (firstWord === 'warning') {
      status = 'warning';
    } else if (firstWord === 'good') {
      status = 'good';
    }
  }

  if (gasValue < 0 && status !== 'failure') {
    status = 'warning';
  }

  return status;
};
// export function updateNotifs() {
//   const fetchNotifInfo= async () => {
//     try {
//       const response = await fetch(`https://HVASee.azurewebsites.net/api/getColor?deviceId=${deviceId}`, {
//         headers: { 'Content-Type': 'application/json' },
//       });
//       if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
//       const azureData: DeviceData[] = await response.json();

//       if (azureData.length === 0) {
//         return;
//       }

//       azureData.sort(
//         (a, b) => new Date(convertToISO(b.date_of_req)).getTime() - new Date(convertToISO(a.date_of_req)).getTime()
//       );
//       let latestDevice = azureData[0];

//       const user = auth.currentUser;
//       if (!user) {
//         console.error("No user signed in.");
//         return;
//       }
//       const db = getFirestore();
//       const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);
//       const deviceSnap = await getDoc(deviceRef);
//       if (deviceSnap.exists()) {
//         const firestoreData = deviceSnap.data();
//         latestDevice = {
//           ...latestDevice,
//           deviceBrand: firestoreData.deviceBrand,
//           deviceName: firestoreData.deviceName,
//         };
//       }

//       if (latestDevice.deviceBrand) {
//         const codeRef = doc(db, 'codes', latestDevice.deviceBrand, 'CODES', latestDevice.flash_sequence);
//         const codeSnap = await getDoc(codeRef);
//         if (codeSnap.exists()) {
//           const codeData = codeSnap.data();
//           latestDevice = {
//             ...latestDevice,
//             errorDetail: codeData.error,
//             solutionSteps: codeData.steps,
//             youtubeVideo: codeData.youtube
//           };
//         }
//         return latestDevice.errorDetail
//       }
//     } catch (error) {
//     } finally {
//     }
//   };
  
// }


export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams();
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);

  const fetchDeviceInfo = async () => {
    try {
      const response = await fetch(`https://HVASee.azurewebsites.net/api/getColor?deviceId=${deviceId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const azureData: DeviceData[] = await response.json();

      if (azureData.length === 0) {
        setDeviceInfo(null);
        return;
      }

      azureData.sort(
        (a, b) => new Date(convertToISO(b.date_of_req)).getTime() - new Date(convertToISO(a.date_of_req)).getTime()
      );
      let latestDevice = azureData[0];

      const user = auth.currentUser;
      if (!user) {
        console.error("No user signed in.");
        return;
      }
      const db = getFirestore();
      const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);
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
            youtubeLink: codeData.youtube,
          };
        }
      }

      setDeviceInfo(latestDevice);
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

  const status = deviceInfo ? deriveStatus(deviceInfo.errorDetail, deviceInfo.gas_value) : 'good';

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
            {deviceInfo.errorDetail !== "GOOD: NO ERROR" && (status === 'warning' || status === 'failure') && (
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
            {unitErrorsOpen && deviceInfo.solutionSteps && deviceInfo.youtubeLink && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorStepsTitle}>Solution Steps:</Text>
                {(deviceInfo.solutionSteps.replace(/\\n/g, "\n"))
                  .split("\n")
                  .map((line, index) => (
                    <Text style={styles.errorSteps} key={index}>
                      {line}
                    </Text>
                ))}
                <Text style={styles.youtubeLink}
                      onPress={() => Linking.openURL(deviceInfo.youtubeLink)}>
                  Video Tutorial
                </Text>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filter Status: </Text>
              { deviceInfo.amp_measurement < 0.4 && (
                <Text style={[styles.cardValue, { color: '#39b54a'}]}>
                  Good
                </Text>
              )}
              { deviceInfo.amp_measurement >= 0.4 && (
                <Text style={[styles.cardValue, { color: '#ff3b30' }]}>
                  Check Filter
                </Text>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gas Value: </Text>
              { deviceInfo.gas_value > 0 && (
                <Text style={[styles.cardValue, { color: '#39b54a'}]}>
                  Good
                </Text>
              )}
              { deviceInfo.gas_value < 0 && (
                <Text style={[styles.cardValue, { color: '#ff3b30' }]}>
                  Warning
                </Text>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Device Brand: </Text>
              <Text style={styles.cardValue}>{deviceInfo.deviceBrand}</Text>
            </View>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/powerGraph?deviceId=${deviceId}`)}
            >
              <Text style={styles.cardTitle}>View Power Consumption</Text>
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </TouchableOpacity>
            <Text style={styles.date}>Last Updated: {convertToISO(deviceInfo.date_of_req)}</Text>
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
  cardLeft: { flexDirection: 'row', alignItems: 'center', width: 80 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardInfo: { flex: 1, marginHorizontal: 8, alignItems: 'flex-start', paddingLeft: 30 },
  cardValue: { fontSize: 16, color: '#333', textAlign: 'left' },
  cardArrow: { marginLeft: 'auto' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  errorDetails: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginVertical: 6 },
  errorStepsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#333' },
  errorSteps: { fontSize: 14, color: '#555', paddingBottom: 0},
  date: { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  loadingContainer: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  headerWrapper: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  youtubeLink: {
    color: 'blue',
    textAlign: 'center',
    fontSize: 16, 
    fontWeight: 'bold',
    padding: 10,
    textDecorationLine: 'underline',
    alignSelf: 'center',
  }
});
