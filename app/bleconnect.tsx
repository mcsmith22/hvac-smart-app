import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid, TextInput } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Stack, router } from 'expo-router';
import { Buffer } from 'buffer';
import { scanNetworks } from './wificonnections';
import Ionicons from "react-native-vector-icons/Ionicons";
// import { disconnect } from 'process';

export default function BLEConnect() {
// const [connectedDevice, setDevice] = useState(null);
const [devices, setDevices] = useState([]); // to keep track of the devices that we find
const [wifiNetworks, setWifiNetworks] = useState([]); // same thing for wifi
const bleManager = new BleManager();
const [connected, setConnected] = useState(false);

const [connectedDevice, setConnectedDevice] = useState(null);
const [clearInputs, setClearInputs] = useState(false);
const [foundNetworks, setFoundNetworks] = useState(false);

const [successfullyConnectedWifi, setSuccessfullyConnectedWifi] = useState("");

useEffect(() => {
    console.log("wifi connected and changed value");
    if (successfullyConnectedWifi.length > 1) {
        setShowConnection(true);
    }
}, [successfullyConnectedWifi]);

useEffect(() => {
    console.log("wifiNetworks updated:", wifiNetworks);
    // Perform any actions that depend on wifiNetworks here
    if (wifiNetworks.length > 0) {
        setFoundNetworks(true);
        for (let i = 0; i < wifiNetworks.length; i++) {
            let name = wifiNetworks[i]["ssid"];
            console.log(name);
        }
    } 

}, [wifiNetworks]);

const wifiServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const wifiCharacteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const testing = [{"ssid":"Apartment Gr8 2.4_EXT","rssi":-38,"encryption":"Secured"},{"ssid":"Apartment Gr8 2.4","rssi":-44,"encryption":"Secured"},{"ssid":"Sonic-2024","rssi":-46,"encryption":"Secured"}];

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
            // console.log(device)
            // setourDevice(device)
            setConnectedDevice(device)
            connect(device)
            bleManager.stopDeviceScan()
        }
        //this is to display other BLE devices in range, which we wont need but might want for testing
        setDevices(seenDevices => {
        const deviceAlreadyAdded = seenDevices.some( //check if device has been added to current devices
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

    const handleScanNetworks = async () => {
    // call for wifi scan from esp-32 chip
    // display all of the results from the scan wih "connect" buttons next to them
    //clicking this button makes you input the pswd
        try {
            if (connectedDevice === null) {
                console.log("No connected device, can't scan for Wifi");
            } else {
                const scanResults = await scanNetworks(connectedDevice);
            }
        } catch (error) {
            console.error('Failed to scan networks:', error);
        }
    };


const connect = async (device) => {
    // console.log(device);
    try {
        console.log("------------------------------------------------------------------------------");
        console.log(device.id);
        const connectedDev = await bleManager.connectToDevice(device.id);
        console.log('Connected to device:', connectedDev.name);
        
        setConnectedDevice(connectedDev);
        
        await connectedDev.discoverAllServicesAndCharacteristics();
        
        // Subscribe to notifications from device;
        connectedDev.monitorCharacteristicForService(
        wifiServiceUUID,
        wifiCharacteristicUUID,
        (error, characteristic) => {
            if (error) {
                console.warn("Notification error:", error);
                return;
            }
            if (characteristic?.value) {
                    const decodedValue = Buffer.from(characteristic.value, 'base64').toString();
                    console.log("Received notification", decodedValue);
                if (decodedValue[0] === "[") { // basic check to see if this is the first notification expected, a json with all of the wifi networks
                    try {
                        const networks = JSON.parse(decodedValue);
                        setWifiNetworks(networks);
                    } catch (e) {
                        console.error("Error parsing JSON:", e);
                    }
                } else if (decodedValue[0] === "C"){
                    setSuccessfullyConnectedWifi(decodedValue);
                } else { // connection failed
                    console.log("conenctio failed");
                    setSuccessfullyConnectedWifi(decodedValue); // just so that it displays
                }

            }
        }
        );
        setConnected(true);
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
        console.log("line 183 in handlesubmitcredentials");
    }
};
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const [wifiSSID, setWifiSSID] = useState('');
const [wifiPassword, setWifiPassword] = useState('');
const [showPasswordInput, setShowPasswordInput] = useState(false);
const [showConnection, setShowConnection] = useState(false);
return (
    <>
          <Stack.Screen options={{ title: 'Login' }} />
    
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
              <Text style={styles.headerHome}>Connect New Device</Text>
            </View>
          </SafeAreaView>

    <View style={styles.container}>
    {showConnection && (
        <Text>{successfullyConnectedWifi}</Text>
    )}


    {/*Think I want to make this disappear when connection is made, and reappear when disconnected */}
    {!connected && (
                <View style={styles.card}>
                    <Button title="Scan for Devices" onPress={scanDevices} />
                </View>
            )}

    {connected && (!foundNetworks) && (
        <View style={styles.card}>
            <Button title="Scan for WiFi" onPress={handleScanNetworks}/>
        </View>
    )}

    {connected && (!foundNetworks) && (
        <View style={styles.card} >
        
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


    <View style={styles.disconnect}>
        <Button title="Disconnect Bluetooth" color="red" onPress={() => { bleManager.destroy(); }} />
    </View>

    {/* meant to be a list of all devices found with bluetooth provisioning */}
    {!connected ? (<FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => ( // so we can scroll
        <Text style={styles.deviceText}>
            {item.name} ({item.id})
        </Text>
        )}
    />) : <Text selectionColor="green">Connected!</Text>}
    
    {/** wifi networks */}
    {foundNetworks && (
    <View style={styles.wifiContainer}>
        {(!showPasswordInput) && (
            <FlatList
                data={wifiNetworks}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                <View style={styles.card}>
                    <Text style={styles.deviceText}>
                    {item.ssid} ({item.encryption})
                    </Text>
                    <Button
                    title="Connect"
                    onPress={() => {
                        setWifiSSID(item.ssid);
                        console.log("setting pswd input now");
                        setShowPasswordInput(true);
                    }}
                    />
                </View>
                )}
            />
        )}
        {showPasswordInput && (
            <View>
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
    </View>
    )}
    </View>
    </>
);
}

const styles = StyleSheet.create({

  safeArea: {
    flex: 0,  
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
  headerHome: {
    fontSize: 14,  
    color: '#fff',  
    marginTop: 0, 
  },
  headerWrapper: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  backButton: {
    position: 'absolute',
    top: 20, 
    left: 10,
    padding: 10,
  },
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
    flex: 1,
    marginTop: 20,
    marginBottom: 80,
    paddingBottom: 10,
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
row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
},
card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4, 
  },
  disconnect: {
    position: 'absolute',
    bottom: 40,
    width: '100%',       
    alignItems: 'center', 

  }
});




    