
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth } from '../.expo/config/firebase';


type SystemStatus = 'good' | 'warning' | 'failure';

interface DeviceData {
  id: string;
  deviceId: string;
  color: string;
  date_of_req: string;
  flash_sequence: string;
  amp_measurement: number;
  gas_value: number;
  unit_type: string;
  userId: string;
  status?: SystemStatus;
}

export default function HomeScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);

  const statusInfo = {
    good: { color: '#39b54a', text: 'No Warnings', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  };

  
  const deriveStatusFromFlashSequence = (flash: string | undefined): SystemStatus => {
    if (!flash) return 'good'; // if flash_sequence is missing, default to "good"
    const firstWord = flash.split(' ')[0].toLowerCase();
    if (firstWord === 'warning:') return 'warning';
    if (firstWord === 'failure:') return 'failure';
    return 'good';
  };

  function convertToISO(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length !== 6) return dateStr; // fallback to original if not in expected format
    return `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}Z`;
  }

  const fetchDevices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user signed in.");
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
      console.log('Fetched devices:', data);
      
      const devicesMap = new Map<string, DeviceData>();
      data.forEach((device) => {
        const existing = devicesMap.get(device.deviceId);
        if (!existing) {
          devicesMap.set(device.deviceId, device);
        } else {

          if (new Date(convertToISO(device.date_of_req)) > new Date(convertToISO(existing.date_of_req))) {
            devicesMap.set(device.deviceId, device);
          }
        }
      });
      

      const uniqueDevices = Array.from(devicesMap.values()).map((device) => ({
        ...device,
        status: deriveStatusFromFlashSequence(device.flash_sequence),
      }));
      
      setDevices(uniqueDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const intervalId = setInterval(fetchDevices, 1000);
    return () => clearInterval(intervalId);
  }, []);


  let overallStatus: SystemStatus = 'good';
  devices.forEach((device) => {
    if (device.status === 'failure') {
      overallStatus = 'failure';
    } else if (device.status === 'warning' && overallStatus !== 'failure') {
      overallStatus = 'warning';
    }
  });

  const renderDeviceItem = ({ item }: { item: DeviceData }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/device/${item.deviceId}`)}
    >
      <View style={styles.cardLeft}>
        <Ionicons
          name="snow"
          size={24}
          color="#000"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.cardTitle}>{item.deviceId}</Text>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardInfoText}>Unit Type: {item.unit_type}</Text>
        <Text style={styles.cardInfoText}>
          Status:{' '}
          <Text
            style={{
              color:
                item.status === 'good'
                  ? statusInfo.good.color
                  : item.status === 'warning'
                  ? statusInfo.warning.color
                  : statusInfo.failure.color,
              fontWeight: 'bold',
            }}
          >
            {item.status === 'good'
              ? 'Good'
              : item.status === 'warning'
              ? 'Warning'
              : 'Failure'}
          </Text>
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#aaa" />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'HVASee' }} />
      <SafeAreaView style={styles.container}>
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

        {loading ? (
          <Text style={styles.loadingText}>Loading devices...</Text>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={renderDeviceItem}
            contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10 }}
          />
        )}

        <TouchableOpacity style={styles.fab} onPress={() => router.push('/bleconnect')}>
          <Text style={styles.fabText}>Connect New Device</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerWrapper: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  statusContainer: { alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 18, fontWeight: 'bold' },
  loadingText: { fontSize: 16, textAlign: 'center', marginTop: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', width: 80 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardInfo: { flex: 1, marginHorizontal: 8, alignItems: 'flex-start', paddingLeft: 30 },
  cardInfoText: { fontSize: 14, color: '#333', textAlign: 'left' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#49aae6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
