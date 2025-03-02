// import { Link } from 'expo-router';
// import { View, Text, StyleSheet } from 'react-native';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { router } from 'expo-router';

// export default function BLEConnect() {
//     return (
//         <View style={styles.container}>
//             <Text>Dope</Text> 
//         </View>
        
//     );
// }


// const styles = StyleSheet.create({
//     container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     },
// });


export default function BLEConnect() {
const [devices, setDevices] = useState([]);
const bleManager = new BleManager();

// Request necessary permissions on Android
const requestPermissions = async () => {
    if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    if (
        granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED ||
        granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED
    ) {
        console.warn('Bluetooth permissions not granted');
    }
    }
};

useEffect(() => {
    requestPermissions();

    // Cleanup on unmount
    return () => {
    bleManager.destroy();
    };
}, []);

// Scan for BLE devices for 10 seconds
const scanDevices = () => {
    setDevices([]); // Clear the previous list

    bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
        console.warn('Scan error:', error);
        return;
    }
    if (device && device.name) {
        setDevices(prevDevices => {
        if (!prevDevices.some(d => d.id === device.id)) {
            return [...prevDevices, device];
        }
        return prevDevices;
        });
    }
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
    bleManager.stopDeviceScan();
    }, 10000);
};

return (
    <View style={styles.container}>
    <Text style={styles.heading}>BLE Connect</Text>
    <Button title="Scan for BLE Devices" onPress={scanDevices} />
    <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
        <Text style={styles.deviceText}>
            {item.name} ({item.id})
        </Text>
        )}
    />
    <Button title="Go Back" onPress={() => router.back()} />
    </View>
);
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
},
heading: {
    fontSize: 24,
    marginBottom: 20,
},
deviceText: {
    fontSize: 16,
    marginVertical: 5,
},
});
