import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid, TextInput } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { router } from 'expo-router';

export default function BLEConnect() {
const [devices, setDevices] = useState([]); // to keep track of the devices that we find
const bleManager = new BleManager();
const [connected, setConnected] = useState(false);
const [wifiSSID, setWifiSSID] = useState('');
const [wifiPassword, setWifiPassword] = useState('');

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

const scanDevices = () => {
    setDevices([]); //empties previous scan

    bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
        console.warn('Problem scanning: ', error);
        return;
    }
    if (device && device.name) {
        if (device.name === "HVASEE Sensor" || device.name === "ESP32-BLE-Device") {
            // console.log("helooosososos")
            // console.log(device)
            // setourDevice(device)
            connect(device)


            bleManager.stopDeviceScan()
        }
        
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
const connect = async (device) => {
    console.log("Made it to connect ---------")
    console.warn("trying to connect")
    console.log(device)
    try {
        console.log("------------------------------------------------------------------------------")
        // console.log(device.id)
        // console.log(bleManager)
        await bleManager.connectToDevice(device.id).then(connectedDevice=>{ 

            console.log('Connected to device:', connectedDevice.name);  
            console.warn("%cSuccessfully connected!", "color : ")
            
            // Add your logic for handling the connected device 
            // let connected = true
            setConnected(true);
            console.log(connectedDevice)
            return connectedDevice.discoverAllServicesAndCharacteristics();
        }).catch(error => { 
            // Handle errors 
        })
    } catch (error) {
        console.error('Error connecting to device:', error);
    }

};
const handleSubmitCredentials = () => {
    //use writeCharacteristicWithResponseForService to send inputted wifi/pswd to ESP chip
    console.log('WiFi SSID:', wifiSSID, 'Password:', wifiPassword);
};

return (
    <View style={styles.container}>
    <Text style={styles.heading}>Connect to Sensor</Text>
    <Button title="Scan for Devices" onPress={scanDevices} />
    {connected && (
        <View style={styles.wifiContainer}>
        <Button title="Disconnect" onPress={() => {bleManager.destroy()}}/>
        <Text style={styles.subHeading}>Enter WiFi Credentials</Text>
        <TextInput
            style={styles.input}
            placeholder="WiFi Name (SSID)"
            value={wifiSSID}
            onChangeText={setWifiSSID}
        />
        <TextInput
            style={styles.input}
            placeholder="WiFi Password"
            secureTextEntry
            value={wifiPassword}
            onChangeText={setWifiPassword}
        />
        <Button title="Submit Credentials" onPress={handleSubmitCredentials} />
    </View>
    
    )}

    <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => ( // allows to be scrolled
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
    marginTop: 65,
},
deviceText: {
    fontSize: 16,
    marginVertical: 5,
},
wifiContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
},
subHeading: {
    fontSize: 20,
    marginBottom: 10,
},
input: {
    height: 40,
    width: '90%',
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
},
});
