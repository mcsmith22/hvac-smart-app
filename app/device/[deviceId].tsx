import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth } from '../../.expo/config/firebase';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { toZonedTime } from 'date-fns-tz';

type SystemStatus = 'good' | 'warning' | 'failure';

interface TelemetryDoc {
  ts: Timestamp;
  amp: number;
  gasPpm: number;
  flashSequence: string;
  expireAt: Timestamp;
}

interface DeviceMetadata {
  deviceBrand?: string;
  deviceName?: string;
}

interface DeviceInfoUI extends DeviceMetadata {
  deviceId: string;
  date_of_req: string; 
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  errorDetail?: string;
  solutionSteps?: string;
  youtubeLink?: string;
}

const deriveStatus = (
  errorString: string | undefined,
  gasValue: number,
): SystemStatus => {
  if (errorString) {
    const first = errorString.split(' ')[0].replace(':', '').toLowerCase();
    if (first === 'failure') return 'failure';
    if (first === 'warning') return 'warning';
  }
  if (gasValue < 0) return 'warning';
  return 'good';
};

const zonedIso = (iso: string) => toZonedTime(iso, 'America/New_York').toString();

const removeFirstWord = (str: string) => str.split(' ').slice(1).join(' ');

export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);

  const fetchDeviceInfo = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !deviceId) return;

      const db = getFirestore();

      const telemetryRef = collection(db, 'devices', deviceId, 'telemetry');
      const latestQ = query(telemetryRef, orderBy('ts', 'desc'), limit(1));
      const telemetrySnap = await getDocs(latestQ);
      if (telemetrySnap.empty) {
        setDeviceInfo(null);
        return;
      }
      const tData = telemetrySnap.docs[0].data() as TelemetryDoc;

      const metaSnap = await getDoc(doc(db, 'users', user.uid, 'devices', deviceId));
      const metaData = metaSnap.exists() ? (metaSnap.data() as DeviceMetadata) : {};

      let info: DeviceInfoUI = {
        deviceId,
        date_of_req: tData.ts.toDate().toISOString(),
        flash_sequence: tData.flashSequence,
        amp_measurement: tData.amp,
        gas_value: tData.gasPpm,
        ...metaData,
      };

      if (info.deviceBrand && info.flash_sequence) {
        const codeRef = doc(db, 'codes', info.deviceBrand, 'CODES', info.flash_sequence);
        const codeSnap = await getDoc(codeRef);
        if (codeSnap.exists()) {
          const cd = codeSnap.data();
          info = {
            ...info,
            errorDetail: cd.error,
            solutionSteps: cd.steps,
            youtubeLink: cd.youtube,
          };
        }
      }

      setDeviceInfo(info);
    } catch (err) {
      console.error('fetchDeviceInfo error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceInfo();
    const id = setInterval(fetchDeviceInfo, 1000);
    return () => clearInterval(id);
  }, [deviceId]);

  const status = deriveStatus(deviceInfo?.errorDetail, deviceInfo?.gas_value ?? 0);

  const statusInfo = {
    good: { color: '#39b54a', text: 'No Warnings', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  } as const;

  return (
    <>
      <Stack.Screen
        options={{ title: deviceInfo?.deviceName ?? `Device ${deviceId}` }}
      />

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
            {deviceInfo?.deviceName ?? `Device: ${deviceId}`}
          </Text>
        </View>
      </SafeAreaView>

      {/* Body */}
      <SafeAreaView style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#49aae6" />
          </View>
        ) : deviceInfo ? (
          <ScrollView contentContainerStyle={styles.contentContainer}>
            {/* Status chip */}
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

            {/* Error card */}
            {deviceInfo.errorDetail !== 'GOOD: NO ERROR' &&
              (status === 'warning' || status === 'failure') && (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => setUnitErrorsOpen((o) => !o)}
                >
                  <Text style={styles.sectionTitle}>
                    Error Status: {removeFirstWord(deviceInfo.errorDetail!)}
                  </Text>
                  <Ionicons
                    style={styles.cardArrow}
                    name={unitErrorsOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              )}

            {unitErrorsOpen && deviceInfo.solutionSteps && deviceInfo.youtubeLink && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorStepsTitle}>Solution Steps:</Text>
                {deviceInfo.solutionSteps.replace(/\\n/g, '\n')
                  .split('\n')
                  .map((line, i) => (
                    <Text style={styles.errorSteps} key={i}>
                      {line}
                    </Text>
                  ))}
                <Text
                  style={styles.youtubeLink}
                  onPress={() => Linking.openURL(deviceInfo.youtubeLink!)}
                >
                  Video Tutorial
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Filter Status: </Text>
              {deviceInfo.amp_measurement < 0.44 ? (
                <Text style={[styles.cardValue, { color: '#39b54a' }]}>Good</Text>
              ) : (
                <Text style={[styles.cardValue, { color: '#ff3b30' }]}>Check Filter</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Gas Value: </Text>
              {deviceInfo.gas_value > 0 ? (
                <Text style={[styles.cardValue, { color: '#39b54a' }]}>Good</Text>
              ) : (
                <Text style={[styles.cardValue, { color: '#ff3b30' }]}>Warning</Text>
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
              <Ionicons
                style={styles.cardArrow}
                name="chevron-forward"
                size={20}
                color="#aaa"
              />
            </TouchableOpacity>

            <Text style={styles.date}>Last Updated: {zonedIso(deviceInfo.date_of_req)}</Text>
          </ScrollView>
        ) : (
          <Text style={styles.errorText}>No device information found for {deviceId}</Text>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  headerHome: { fontSize: 16, color: '#fff' },
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
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardValue: { fontSize: 16, color: '#333' },
  cardArrow: { marginLeft: 'auto' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  errorDetails: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  errorStepsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#333' },
  errorSteps: { fontSize: 14, color: '#555' },
  date: { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  loadingContainer: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  youtubeLink: {
    color: 'blue',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
    textDecorationLine: 'underline',
    alignSelf: 'center',
  },
});
