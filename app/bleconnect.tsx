import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { router } from 'expo-router';

export default function BLEConnect() {
const [devices, setDevices] = useState([]); // to keep track of the devices that we find
const bleManager = new BleManager();

// Android permissions
const requestPermissions = async () => {
    if (Platform.OS === 'android') { //android needs these to allow for BLE usaeg
        const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        //if the user doesnt accept all permissions, they cant use BLE 
        if (granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED || granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED || granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Bluetooth permissions not granted');
            }
    }
};

useEffect(() => {
    requestPermissions();
    return () => {
    bleManager.destroy(); // cleans up 
    };
}, []);

// Scan for BLE devices for 10 seconds
const scanDevices = () => {
    setDevices([]); //clear devices from previous scans

    bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
        console.warn('Problem scanning: ', error);
        return;
    }
    if (device && device.name) {
        // Update the list of devices with the new device if it's not already included.
        setDevices(seenDevices => {

        const deviceAlreadyAdded= seenDevices.some( //check if device has been added to current devices
            existingDevice => existingDevice.id === device.id
        );
        
        if (deviceAlreadyAdded === false) {
            return (seenDevices.concat(device));
        }
        
        return seenDevices;
        });
    }
    });

    setTimeout(() => {
    bleManager.stopDeviceScan();
    }, 10000); // scans for 10 seconds
};

return (
    <View style={styles.container}>
    <Text style={styles.heading}>Connect to Sensor</Text>
    <Button title="Scan for Devices" onPress={scanDevices} />
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
