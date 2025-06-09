import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth } from '../.expo/config/firebase';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

type SystemStatus = 'good' | 'warning' | 'failure';


interface FirestoreTelemetry {
  ts: Timestamp;
  amp: number;
  gasPpm: number;
  flashSequence: string;
  expireAt: Timestamp;
}

interface FirestoreDeviceData {
  id: string;
  deviceBrand?: string;
  deviceName?: string;
}

interface CombinedDeviceData extends FirestoreDeviceData, Omit<FirestoreTelemetry, 'ts' | 'expireAt'> {
  ts: string;
  status?: SystemStatus;
  errorDetail?: string;
  solutionSteps?: string;
}

const deriveStatus = (errorString: string | undefined, gasValue: number): SystemStatus => {
  let status: SystemStatus = 'good';

  if (errorString) {
    const firstWord = errorString.split(' ')[0].replace(':', '').toLowerCase();
    if (firstWord === 'failure') {
      status = 'failure';
    } else if (firstWord === 'warning') {
      status = 'warning';
    }
  }

  if (gasValue < 0 && status !== 'failure') {
    status = 'warning';
  }

  return status;
};

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<CombinedDeviceData[]>([]);
  const [loading, setLoading] = useState(true);

  const statusInfo = {
    good: { color: '#39b54a', text: 'Good', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  } as const;


  const fetchUserDevices = async (): Promise<FirestoreDeviceData[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    const db = getFirestore();
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'devices'));

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestoreDeviceData[];
  };

  const fetchLatestTelemetry = async (
    db: ReturnType<typeof getFirestore>,
    deviceId: string,
  ): Promise<Omit<CombinedDeviceData, keyof FirestoreDeviceData> | null> => {
    const telemetryRef = collection(db, 'devices', deviceId, 'telemetry');
    const q = query(telemetryRef, orderBy('ts', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docData = snap.docs[0].data() as FirestoreTelemetry;
    return {
      amp: docData.amp,
      gasPpm: docData.gasPpm,
      flashSequence: docData.flashSequence,
      ts: docData.ts.toDate().toISOString(),
    };
  };

  const fetchDevices = async () => {
    try {
      const db = getFirestore();
      const userDevices = await fetchUserDevices();

      const telemetryPromises = userDevices.map(async (device) => {
        const latest = await fetchLatestTelemetry(db, device.id);
        return { device, latest } as const;
      });

      const deviceTelemetryPairs = await Promise.all(telemetryPromises);

      const combined: CombinedDeviceData[] = [];

      for (const { device, latest } of deviceTelemetryPairs) {
        if (!latest) continue;

        let combinedData: CombinedDeviceData = {
          ...device,
          ...latest,
        } as CombinedDeviceData;

        if (device.deviceBrand && latest.flashSequence) {
          const codeRef = doc(
            db,
            'codes',
            device.deviceBrand,
            'CODES',
            latest.flashSequence,
          );
          const codeSnap = await getDoc(codeRef);
          if (codeSnap.exists()) {
            const code = codeSnap.data();
            combinedData.errorDetail = code.error;
            combinedData.solutionSteps = code.steps;
          }
        }

        combinedData.status = deriveStatus(combinedData.errorDetail, latest.gasPpm);
        combined.push(combinedData);
      }

      if (JSON.stringify(devices) !== JSON.stringify(combined)) {
        setDevices(combined);
      }
    } catch (err) {
      console.error('Error fetching devices', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchDevices();
      setLoading(false);
    };

    init();
    const id = setInterval(fetchDevices, 1000);
    return () => clearInterval(id);
  }, []);

  const overallStatus: SystemStatus = devices.reduce<SystemStatus>((acc, d) => {
    if (d.status === 'failure') return 'failure';
    if (d.status === 'warning' && acc !== 'failure') return 'warning';
    return acc;
  }, 'good');

  const renderDeviceItem = ({ item }: { item: CombinedDeviceData }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/device/${item.id}`)}
    >
      <View style={styles.cardLeft}>
        <Ionicons name="snow" size={28} color="#87CEFA" style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>{item.deviceName || item.id}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardInfoText}>
          Status:{' '}
          <Text
            style={{
              color: statusInfo[item.status || 'good'].color,
              fontWeight: 'bold',
            }}
          >
            {statusInfo[item.status || 'good'].text}
          </Text>
        </Text>
        <Text style={styles.cardInfoText}>Device Brand: {item.deviceBrand}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#aaa" />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'HVASee' }} />
      <SafeAreaView style={{ backgroundColor: '#49aae6' }} edges={['left', 'right']}>
        <View style={styles.headerBar}>
          <Text style={styles.headerText}>
            <Text style={styles.headerBold}>HVA</Text>
            <Text style={styles.headerItalic}>See</Text>
          </Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <SafeAreaView style={styles.container}>
        {loading ? (
          <Text style={styles.loadingText}>Loading devices...</Text>
        ) : (
          <>
            <View style={styles.headerWrapper}>
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
            </View>
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              renderItem={renderDeviceItem}
              contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10 }}
            />
          </>
        )}
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/bleconnect')}>
          <Text style={styles.fabText}>Connect New Device</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 0 },
  headerBar: {
    backgroundColor: '#49aae6',
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
    position: 'relative',
  },
  headerText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerBold: { fontWeight: 'bold' },
  headerItalic: { fontStyle: 'italic' },
  settingsButton: {
    position: 'absolute',
    right: 10,
    top: 20,
    padding: 5,
  },
  container: { flex: 1, backgroundColor: '#fff' },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 20 },
  headerWrapper: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  statusContainer: { alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 18, fontWeight: 'bold' },
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
  cardInfoText: { fontSize: 14, color: '#333', textAlign: 'left' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    backgroundColor: '#49aae6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});
