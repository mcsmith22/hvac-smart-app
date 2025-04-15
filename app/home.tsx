import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, SafeAreaView, Button } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth } from '../.expo/config/firebase';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
// import { requestNotis, sendTest } from './notifications';
// import { Button } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

type SystemStatus = 'good' | 'warning' | 'failure';


interface AzureEntry {
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  userId: string;
}

interface FirestoreDeviceData {
  id: string;
  deviceBrand?: string;
  deviceName?: string;
}

interface CombinedDeviceData extends AzureEntry, FirestoreDeviceData {
  status?: SystemStatus;
  errorDetail?: string;
  solutionSteps?: string;
  youtubeVideo?: string
}

// const [displayNotification, setDisplayNotification] = useState<CombinedDeviceData[]>([]);

const removeFirstWord = (str: string): string => {
  const words = str.split(' ');
  return words.length > 1 ? words.slice(1).join(' ') : str;
};

const convertToISO = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 6) return dateStr;
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

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<CombinedDeviceData[]>([]); // if these don't match at some point then I send a notif
  const [loading, setLoading] = useState(true);

  const statusInfo = {
    good: { color: '#39b54a', text: 'Good', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  };

  const fetchUserDevices = async (): Promise<FirestoreDeviceData[]> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user signed in.");
        return [];
      }
      const db = getFirestore();
      const devicesSnapshot = await getDocs(collection(db, 'users', user.uid, 'devices'));
      return devicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestoreDeviceData[];
    } catch (error) {
      console.error("Error fetching devices from Firestore:", error);
      return [];
    }
  };

  const fetchAzureEntries = async (): Promise<AzureEntry[]> => {
    try {
      const response = await fetch('https://HVASee.azurewebsites.net/api/getColor', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching Azure data:", error);
      return [];
    }
  };

  const fetchDevices = async () => {
    try {
      const userDevices = await fetchUserDevices();
      const validDeviceIds = userDevices.map(device => device.id);
      const azureEntries = await fetchAzureEntries();

      const filteredAzure = azureEntries.filter(entry => validDeviceIds.includes(entry.deviceId));

      const latestMap = new Map<string, AzureEntry>();
      filteredAzure.forEach(entry => {
        if (!latestMap.has(entry.deviceId)) {
          latestMap.set(entry.deviceId, entry);
        } else {
          const existing = latestMap.get(entry.deviceId)!;
          if (new Date(convertToISO(entry.date_of_req)).getTime() >
              new Date(convertToISO(existing.date_of_req)).getTime()) {
            latestMap.set(entry.deviceId, entry);
          }
        }
      });

      const combinedDevices: CombinedDeviceData[] = [];
      latestMap.forEach((azureEntry, id) => {
        const metadata = userDevices.find(device => device.id === id);
        const combined: CombinedDeviceData = {
          ...azureEntry,
          ...metadata,
          status: deriveStatusFromFlashSequence(azureEntry.flash_sequence),
        };
        combinedDevices.push(combined);
      });

      const newDevicesStr = JSON.stringify(combinedDevices);
      const currentDevicesStr = JSON.stringify(devices);
      if (newDevicesStr !== currentDevicesStr) {
        // sendTest() // we want to send a notifiction whenever the rendered devices change
        setDevices(combinedDevices);
        // setDisplayNotification[combinedDevices]
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } 
  };

  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true);
      await fetchDevices();
      setLoading(false);
    };
  
    initialFetch();
  
    const intervalId = setInterval(fetchDevices, 1000);
    return () => clearInterval(intervalId);
  }, []);

  let overallStatus: SystemStatus = 'good';
  devices.forEach(device => {
    if (device.status === 'failure') {
      overallStatus = 'failure';
    } else if (device.status === 'warning' && overallStatus !== 'failure') {
      overallStatus = 'warning';
    }
  });
  

  const renderDeviceItem = ({ item }: { item: CombinedDeviceData }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/device/${item.deviceId}`)}
    >
      <View style={styles.cardLeft}>
        <Ionicons name="snow" size={28} color="#87CEFA" style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>{item.deviceName || item.deviceId}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardInfoText}>
          Status:{' '}
          <Text style={{
            color: item.status === 'good'
              ? statusInfo.good.color
              : item.status === 'warning'
              ? statusInfo.warning.color
              : statusInfo.failure.color,
            fontWeight: 'bold'
          }}>
            {item.status === 'good' ? 'Good' : item.status === 'warning' ? 'Warning' : 'Failure'}
          </Text>
        </Text>
        <Text style={styles.cardInfoText}>
          Device Brand: {item.deviceBrand}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#aaa" />
    </TouchableOpacity>
  );

  // // Calvin adding this so that theres notifications if the displayed device has an error
  // let skip = true;
  // useEffect(() => {
  //   // if this is the first run, don't send notification
  //   if (skip) {
  //     skip = false
  //     return
  //   } else {
  //     sendTest() // send the notis to display that are stored in the array
  //     skip = true
  //   }
  //   // check if the error status of a device has changed, if so then send a notification banner saying "DeviceName : Error"
  // }, [devices]) // any time devices changes, send notif?

  // useEffect(() => {
  //   // fetch devices, if anything has changed then send the notif
  // })

  return (
    <>
      <Stack.Screen options={{ title: 'HVASee' }} />
      <SafeAreaView style={{ backgroundColor: '#49aae6' }} edges={['left', 'right']}>
        <View style={styles.headerBar}>
          <Text style={styles.headerText}>
            <Text style={styles.headerBold}>HVA</Text>
            <Text style={styles.headerItalic}>See</Text>
          </Text>
          {/* <Button
            onPress={() => {
              requestNotis();
            }}
            title="Allow Notifications"
            color="#841584"
          />
            <Button
            onPress={() => {
              sendTest();
            }}
            title="Test noti"
            color="#841584"
            accessibilityLabel=""
          /> */}

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
              keyExtractor={(item) => item.deviceId}
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
