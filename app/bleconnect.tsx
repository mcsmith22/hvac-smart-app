import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid, TextInput } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { router } from 'expo-router';
import { Buffer } from 'buffer';

export default function BLEConnect() {
const [devices, setDevices] = useState([]); // to keep track of the devices that we find
const bleManager = new BleManager();
const [connected, setConnected] = useState(false);
const [wifiSSID, setWifiSSID] = useState('');
const [wifiPassword, setWifiPassword] = useState('');
const [connectedDevice, setConnectedDevice] = useState(null);
const [clearInputs, setClearInputs] = useState(false);
// const [base64Data, setBase64Data] = useState(null);

const wifiServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const wifiCharacteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

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
    console.log("device.name")
    if (device && device.name) {
        if (device.name === "HVASEE Sensor" || device.name === "ESP32-BLE-Device") {
            console.log("helooosososos")
            // console.log(device)
            // setourDevice(device)
            connect(device)


            bleManager.stopDeviceScan()
        }

        //this is to display other BLE devices in range, which we wont need but might want for testing
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
    console.log(device)
    try {
        console.log("------------------------------------------------------------------------------")
        await bleManager.connectToDevice(device.id).then(connectedDev=>{ 

            console.log('Connected to device:', connectedDev.name);  
            console.warn("%cSuccessfully connected!", "color : ")
            // let connected = true
            setConnected(true);
            setConnectedDevice(connectedDev);
            console.log(connectedDev)
            return connectedDev.discoverAllServicesAndCharacteristics();
        }).catch(error => { 
        })
    } catch (error) {
        console.error('Error connecting to device:', error);
    }

};
const handleSubmitCredentials = async () => {
    console.log('WiFi SSID:', wifiSSID, 'Password:', wifiPassword);
    // Combine SSID and password
    const dataToSend = `${wifiSSID}:${wifiPassword}`;
    console.log('Data to send:', dataToSend);

    try {
    // Compute the base64 string in a local variable
    const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64');
    console.log('Computed Base64 data:', computedBase64Data);
    console.log("--------------------------------------------------------------");

    if (connectedDevice) {
        try {
        const result = await connectedDevice.writeCharacteristicWithResponseForService(
            wifiServiceUUID,
            wifiCharacteristicUUID,
            computedBase64Data
        );
        console.log('Data successfully written:', result);
        } catch (error) {
        console.error('Error writing credentials:', error);
        }
        setClearInputs(true); 
    } else {
        console.warn("No device connected!");
    }
    } catch (error) {
    console.log("Couldn't convert to base64", error);
    }
};


return (
    <View style={styles.container}>
    <Text style={styles.heading}>Connect to Sensor</Text>
     <Button title="Scan for Devices" onPress={scanDevices} /> {/*Think I want to make this disappear when connection is made, and reappear when disconnected */}
    {connected && (
        <View style={styles.wifiContainer} >
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

    {/* meant to be a list of all devices found with bluetooth provisioning */}
    <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => ( // so we can scroll
        <Text style={styles.deviceText}>
            {item.name} ({item.id})
        </Text>
        )}
    />
    {/* <Button title="Go Back" onPress={() => router.back()} /> had this to return to prev page but theres one in top left that deos the same thing*/} 
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
