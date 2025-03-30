import React, { useState, useEffect } from 'react'; 

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Button
} from 'react-native';
import { Stack, useRouter, router, Link } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';

type SystemStatus = 'good' | 'warning' | 'failure';
interface HVACSystem {
  id: string;
  name: string;
  location: string;
  brand: string;
  status: SystemStatus;
}

export default function HomeScreen() {
  const router = useRouter();

  const [systems, setSystems] = useState<HVACSystem[]>([
    {
      id: '1',
      name: 'Main',
      location: 'Basement',
      brand: 'Carrier',
      status: 'good',
    },
    {
      id: '2',
      name: 'Other',
      location: 'Attic',
      brand: 'Goodman',
      status: 'good',
    },

  
  ]);

  const statusInfo = {
    good:    { color: '#39b54a', text: 'No Warnings', icon: 'checkmark-circle' },
    warning: { color: '#f7b500', text: 'Warning',     icon: 'alert-circle'    },
    failure:   { color: '#ff3b30', text: 'Failure',       icon: 'close-circle'    },
  };

  const [color, setColor] = useState('');

  const fetchColor = async () => {
    try {
      const response = await fetch('https://hvasee.azurewebsites.net/api/getcolor');
      const data = await response.json();
      console.log('Parsed data:', data);

      let newStatus: SystemStatus = 'good'

      if (data.color == 'Red') {
        newStatus = 'failure'

      } else if (data.color == 'Yellow') {
        newStatus = 'warning'

      }

      setSystems((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], status: newStatus };
        return updated;
      });

    } catch (error) {
      console.error('Error fetching color:', error);
      
    }
  };


  // useEffect(() => { 
    // fetchColor();

    // const intervalId = setInterval(() => {
    //   fetchColor();
    // }, 1000);

    
    // return () => clearInterval(intervalId);

  // }, []);

  let overallStatus: SystemStatus = 'good';
  for (const sys of systems) {
    if (sys.status === 'failure') {

      overallStatus = 'failure';
      break;

    } else if (sys.status === 'warning') {

      overallStatus = 'warning';
    }
  }

  const renderSystemItem = ({ item }: { item: HVACSystem }) => (
    <TouchableOpacity
      style={styles.card}
      // This is se up to navigate to a new page. Replace path once device/system pages are created.
      onPress={() => null }
    >
      <View style={styles.cardLeft}>
        <Ionicons name="snow" size={24} color="#000" style={{ marginRight: 8 }} />
        <Text style={styles.cardTitle}>{item.name}</Text>
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardInfoText}>Location: {item.location}</Text>
        <Text style={styles.cardInfoText}>Brand: {item.brand}</Text>
        <Text style={styles.cardInfoText}>
          Status:{' '}
          <Text
            style={{
              color:
                item.status === 'good'
                  ? '#39b54a'
                  : item.status === 'warning'
                  ? '#f7b500'
                  : '#ff3b30',
              fontWeight: 'bold',
            }}
          >
            {item.status === 'good' ? 'Good' : item.status === 'warning' ? 'Warning' : 'Failure'}
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

        <FlatList
          data={systems}
          keyExtractor={(item) => item.id}
          renderItem={renderSystemItem}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10 }}
        />


        {/* CALVIN THIS IS THE CONNECT BUTTON*/}
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
  cardInfo: { flex: 1, marginHorizontal: 8, alignItems: 'flex-start', paddingLeft: 30},
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
