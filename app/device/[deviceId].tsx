import React, { useState, useEffect } from 'react';
import { TouchableOpacity, FlatList, SafeAreaView, ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; 
import { getAuth } from 'firebase/auth';
import Ionicons from "react-native-vector-icons/Ionicons";

type SystemStatus = 'good' | 'warning' | 'failure';

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
  status?: SystemStatus;
}

export default function DeviceInfoScreen() {
  const { deviceId } = useLocalSearchParams();
  const [deviceInfo, setDeviceInfo] = useState<DeviceData | null>(null);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);
  const router = useRouter();


  const statusInfo = {
    good: { color: '#39b54a', text: 'No Warnings', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning', icon: 'alert-circle' },
    failure: { color: '#ff3b30', text: 'Failure', icon: 'close-circle' },
  };

  
  const deriveStatus = (color: string): SystemStatus => {
    if (color.toLowerCase() === 'red') return 'failure';
    if (color.toLowerCase() === 'yellow') return 'warning';
    return 'good';
  };

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

  let overallStatus: SystemStatus = 'good';
  devices.forEach((device) => {
    if (device.status === 'failure') {
      overallStatus = 'failure';
    } else if (device.status === 'warning' && overallStatus !== 'failure') {
      overallStatus = 'warning';
    }
  });

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
              <Ionicons style={styles.cardArrow} name={unitErrorsOpen ? "chevron-up" : "chevron-down"} size={20} color="#aaa" />
            </TouchableOpacity>
               )}
                  {/* {unitErrorsOpen && (
                    
                      <FlatList
                        keyExtractor={(item) => item.id}
                        renderItem={renderErrorLogItem}
                        contentContainerStyle={styles.listContainer}
                      />
                  )} */}
          

            {/* <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/ErrorLogScreen')}
              >
              <Text style={styles.cardTitle}>Error Status: </Text>
              <Text style={styles.cardValue}>{deviceInfo.color}</Text>
              <Ionicons style={styles.cardArrow} name="chevron-forward" size={20} color="#aaa" />
            </TouchableOpacity> */}
            {/* <View style={styles.card}>
              <Text style={styles.cardTitle}>Device ID: </Text>
              <Text style={styles.cardValue}>{deviceInfo.deviceId}</Text>
            </View> */}
            {/* <View style={styles.card}>
              <Text style={styles.cardTitle}>Flash Sequence: </Text>
              <Text style={styles.cardValue}>{deviceInfo.flash_sequence}</Text>
            </View> */}
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
              <Text style={styles.cardTitle}>View Power Consumption </Text>
              
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 0,
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
  date: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center', 
    justifyContent: 'center', 
    textAlign: 'center', 
    height: 0, 
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
  statusContainer: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  statusText: { fontSize: 18, fontWeight: 'bold' },
  separator: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12,
    width: '100%',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
