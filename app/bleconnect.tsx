// import React, { useEffect, useState } from 'react';
// import { View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
// import { BleManager } from 'react-native-ble-plx';
// import { router } from 'expo-router';
// import { Buffer } from 'buffer';
// import { scanNetworks } from './wificonnections';
// import { getAuth } from 'firebase/auth';

// const wifiServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
// const wifiCharacteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

// export default function BLEConnect() {
//     // const [connectedDevice, setDevice] = useState(null);
//     const [devices, setDevices] = useState([]); // to keep track of the devices that we find
//     const [wifiNetworks, setWifiNetworks] = useState([]); // same thing for wifi
//     const bleManager = new BleManager();
//     const [connected, setConnected] = useState(false);

//     const [connectedDevice, setConnectedDevice] = useState(null);
//     const [clearInputs, setClearInputs] = useState(false);
//     const [foundNetworks, setFoundNetworks] = useState(false);

//     const [successfullyConnectedWifi, setSuccessfullyConnectedWifi] = useState("");

//     const [deviceName, setDeviceName] = useState(""); 
//     const [deviceInfoSent, setDeviceInfoSent] = useState(false); 

//     const auth = getAuth();

//     const [scanning, setScanning] = useState(false); 



//     // Android permissions
//     const requestPermissions = async () => {
//         if (Platform.OS === 'android') { //android needs these to allow for BLE usaeg
//             const granted = await PermissionsAndroid.requestMultiple([
//                 PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//                 PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//                 PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//             ]);
//             //if the user doesnt accept all permissions, they cant use BLE 
//             if (granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED || granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED || granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED) {
//                 console.warn('Bluetooth permissions not granted');
//             }
//         }
//     };

//     useEffect(() => {
//         requestPermissions();
//         return () => {
//             bleManager.destroy(); // cleans up 
//         };
//     }, []);

//     useEffect(() => {
//         console.log("wifi connected and changed value");
//         if (successfullyConnectedWifi.length > 1) {
//             setShowConnection(true);
//         }
//     }, [successfullyConnectedWifi]);

//     useEffect(() => {
//         console.log("wifiNetworks updated:", wifiNetworks);
//         // Perform any actions that depend on wifiNetworks here
//         if (wifiNetworks.length > 0) {
//             setFoundNetworks(true);
//             for (let i = 0; i < wifiNetworks.length; i++) {
//                 let name = wifiNetworks[i]["ssid"];
//                 console.log(name);
//             }
//         } 

//     }, [wifiNetworks]);



//     const testing = [{"ssid":"Apartment Gr8 2.4_EXT","rssi":-38,"encryption":"Secured"},{"ssid":"Apartment Gr8 2.4","rssi":-44,"encryption":"Secured"},{"ssid":"Sonic-2024","rssi":-46,"encryption":"Secured"}];



//     const scanDevices = () => {
//         setScanning(true)
//         setDevices([]); //empties previous scan

//         bleManager.startDeviceScan(null, null, (error, device) => {
//         if (error) {
//             console.warn('Problem scanning: ', error);
//             setScanning(false);
//             return; 
//         }
//         if (device && device.name) {
//             if (device.name === "HVASEE Sensor" || device.name === "ESP32-BLE-Device") {
//                 // console.log(device)
//                 // setourDevice(device)
//                 setConnectedDevice(device)
//                 connectToDevice(device)
//                 bleManager.stopDeviceScan()
//                 setScanning(false);
//             }
//             //this is to display other BLE devices in range, which we wont need but might want for testing
//             setDevices(seenDevices => {
//             const deviceAlreadyAdded = seenDevices.some( //check if device has been added to current devices
//                 existingDevice => existingDevice.id === device.id
//             );
//             if (deviceAlreadyAdded === false) {
//                 return (seenDevices.concat(device));
//             }
//             return seenDevices;
//             });
//         }
//         });

//         setTimeout(() => {
//             bleManager.stopDeviceScan();
//             setScanning(false);
//         }, 10000); // scans for 10 seconds
//     };

//     const handleScanNetworks = async () => {
//         console.log("Scanning for wifis");
//     // call for wifi scan from esp-32 chip
//     // display all of the results from the scan wih "connect" buttons next to them
//     //clicking this button makes you input the pswd
//         try {
//             if (connectedDevice === null) {
//                 console.log("No connected device, can't scan for Wifi");
//             } else {
//                 const scanResults = await scanNetworks(connectedDevice);
//             }
//         } catch (error) {
//             console.error('Failed to scan networks:', error);
//         }
//     };


//     const connectToDevice = async (device) => {
//         // console.log(device);
//         try {
//             console.log("------------------------------------------------------------------------------");
//             const connectedDev = await bleManager.connectToDevice(device.id);
//             console.log('Connected to device:', connectedDev.name);
            
//             setConnectedDevice(connectedDev);
            
//             await connectedDev.discoverAllServicesAndCharacteristics();
            
//             // Subscribe to notifications from device;
//             connectedDev.monitorCharacteristicForService(
//             wifiServiceUUID,
//             wifiCharacteristicUUID,
//             (error, characteristic) => {
//                 if (error) {
//                     console.warn("Notification error:", error);
//                     return;
//                 }
//                 if (characteristic?.value) {
//                         const decodedValue = Buffer.from(characteristic.value, 'base64').toString();
//                         console.log("Received notification", decodedValue);
//                     if (decodedValue[0] === "[") { // basic check to see if this is the first notification expected, a json with all of the wifi networks
//                         try {
//                             const networks = JSON.parse(decodedValue);
//                             setWifiNetworks(networks);
//                         } catch (e) {
//                             console.error("Error parsing JSON:", e);
//                         }
//                     } else if (decodedValue[0] === "C"){
//                         setSuccessfullyConnectedWifi(decodedValue);
//                     } else { // connection failed
//                         console.log("conenctio failed");
//                         setSuccessfullyConnectedWifi(decodedValue); // just so that it displays
//                     }

//                 }
//             }
//             );
//             setConnected(true);
//         } catch (error) {
//             console.error('Error connecting to device:', error);
//         }


//     };
//     const handleSubmitCredentials = async () => {
//         console.log('WiFi SSID:', wifiSSID, 'Password:', wifiPassword);
//         // Combine SSID and password
//         const dataToSend = `${wifiSSID}:${wifiPassword}`;
//         console.log('Data to send:', dataToSend);

//         try {
//             // Compute the base64 string in a local variable
//             const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64');
//             console.log('Computed Base64 data:', computedBase64Data);

//             if (connectedDevice) {
//                 try {
//                 const result = await connectedDevice.writeCharacteristicWithResponseForService(
//                     wifiServiceUUID,
//                     wifiCharacteristicUUID,
//                     computedBase64Data
//                 );
//                 console.log('Data successfully written:', result);
//                 } catch (error) {
//                 console.error('Error writing credentials:', error);
//                 }
//                 setClearInputs(true); 
//             } else {
//                 console.warn("No device connected!");
//             }
//         } catch (error) {
//             console.log("line 183 in handlesubmitcredentials");
//         }
//     };

//     const handleSendDeviceInfo = async () => { 
//         const user = auth.currentUser; 
//         if (!user) { 
//         Alert.alert("Error", "No user signed in."); 
//         return; 
//         }
//         if (!deviceName.trim()) { 
//         Alert.alert("Error", "Please enter a device name."); 
//         return;
//         }
//         const userId = user.uid;
//         const dataToSend = `DEVICE:${deviceName}:${userId}`; 
//         const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64'); 
//         console.log("Sending device info:", { deviceName, userId, computedBase64Data }); 
//         try { 
//         const result = await connectedDevice.writeCharacteristicWithResponseForService( 
//             wifiServiceUUID, 
//             wifiCharacteristicUUID, 
//             computedBase64Data 
//         );
//         console.log("Device info sent successfully:", result); 
//         setDeviceInfoSent(true); 
//         Alert.alert("Success", "Device info sent successfully."); 
//         router.push('/home'); 
//         } catch (error) { 
//         console.error("Error sending device info:", error); 
//         Alert.alert("Error", "Failed to send device info.");
//         }
//     };
// // -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//     const [wifiSSID, setWifiSSID] = useState('');
//     const [wifiPassword, setWifiPassword] = useState('');
//     const [showPasswordInput, setShowPasswordInput] = useState(false);
//     const [showConnection, setShowConnection] = useState(false);

//     return (
        
//         <View style={styles.container}>
//             <Text style={styles.heading}>Connect to Sensor</Text>
            
//             {successfullyConnectedWifi.length > 1 && (
//                 <Text style={styles.infoText}>{successfullyConnectedWifi}</Text>
//             )}
        
//             {!connected && (
//                 <>
//                 <Button title="Scan for Devices" onPress={scanDevices} /> 
//                 {scanning && <ActivityIndicator size="small" color="#49aae6" />} 
//                 </>
//             )}
        
//             {connected && !deviceInfoSent && (
//                 <View style={styles.deviceInfoContainer}>
//                 <Text style={styles.subHeading}>Name Your Device</Text>
//                 <TextInput
//                     style={styles.input}
//                     placeholder="Enter device name"
//                     value={deviceName}
//                     onChangeText={setDeviceName}
//                 />
//                 <TouchableOpacity style={styles.button} onPress={handleSendDeviceInfo}>
//                     <Text style={styles.buttonText}>Send Device Info</Text>
//                 </TouchableOpacity>
//                 </View>
//             )}
        
//             {connected && !foundNetworks && (
                
//                 <View style={styles.wifiContainer}>
//                 <Text style={styles.subHeading}>Enter WiFi Credentials</Text>
//                 <TextInput
//                     style={styles.input}
//                     placeholder="WiFi Name (SSID)"
//                     value={wifiSSID}
//                     onChangeText={setWifiSSID}
//                 />
//                 {(!showPasswordInput) ? (
//                     <Button title="Scan for WiFi Networks" onPress={() => {handleScanNetworks}
//                     } /> 
//                 ) : null}
//                 {showPasswordInput && (
//                     <View>
//                     <TextInput
//                         style={styles.input}
//                         placeholder="WiFi Password"
//                         secureTextEntry
//                         value={wifiPassword}
//                         onChangeText={setWifiPassword}
//                     />
//                     <Button title="Submit Credentials" onPress={handleSubmitCredentials} />
//                     </View>
//                 )}
//                 </View>
//             )}
        
//             {!connected ? (
//                 <FlatList
//                 data={devices}
//                 keyExtractor={(item) => item.id}
//                 renderItem={({ item }) => (
//                     <Text style={styles.deviceText}>
//                     {item.name} ({item.id})
//                     </Text>
//                 )}
//                 />
//             ) : (
//                 <Text style={styles.connectedText}>Connected!</Text> 
//             )}
            
//             {connected && (
//                 <View style={styles.actionButtons}>
//                 <Button title="Disconnect" color="red" onPress={() => { bleManager.destroy(); }} /> 
//                 </View>
//             )}
//                 {foundNetworks && (


//     <View>
//         {(!showPasswordInput) && (
//             <FlatList
//                 data={wifiNetworks}
//                 keyExtractor={(_, index) => index.toString()}
//                 renderItem={({ item }) => (
//                 <View style={styles.row}>
//                     <Text style={styles.deviceText}>
//                     {item.ssid} ({item.encryption})
//                     </Text>
//                     <Button
//                     title="Connect"
//                     onPress={() => {
//                         setWifiSSID(item.ssid);
//                         console.log("setting pswd input now");
//                         setShowPasswordInput(true);
//                     }}
//                     />
//                 </View>
//                 )}
//             />
//         )}
//         {showPasswordInput && (
//             <View>
//                 <TextInput
//                     style={styles.input}
//                     placeholder="WiFi Password"
//                     secureTextEntry
//                     value={wifiPassword}
//                     onChangeText={setWifiPassword}
//                 />
//                 <Button title="Submit Credentials" onPress={handleSubmitCredentials} />
//             </View>
//         )}
//     </View>


//     )}
//             <Button title="Go Back" onPress={() => router.back()} /> 

//         </View>
       
//     );
// }
    
// const styles = StyleSheet.create({
//     scrollContainer: { 
//         flexGrow: 1, 
//         justifyContent: 'center', 
//         alignItems: 'center', 
//         paddingVertical: 20, 
//         backgroundColor: '#fff', 
//     },

//     container: { 
//         flex: 1, 
//         padding: 20,  
//         justifyContent: 'center',  
//         alignItems: 'center',  
//         backgroundColor: '#fff',  
//     },

//     heading: {  
//         fontSize: 26,  
//         marginBottom: 20,  
//         marginTop: 65,  
//         fontWeight: '600',
//         color: '#333',
//     },

//     infoText: {  
//         fontSize: 16,  
//         marginBottom: 10,  
//         color: 'green',  
//         },
//         deviceText: {  
//         fontSize: 16,  
//         marginVertical: 5,  
//     },

//     connectedText: {  
//         fontSize: 18,  
//         color: 'green',  
//         marginVertical: 10,  
//     },

//     deviceInfoContainer: { 
//         marginTop: 20, 
//         width: '100%', 
//         alignItems: 'center',
//         backgroundColor: '#f9f9f9',
//         padding: 15,
//         borderRadius: 10,
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 }, 
//         shadowOpacity: 0.25, 
//         shadowRadius: 3.84, 
//         elevation: 5,
//     },

//     subHeading: {  
//         fontSize: 20,  
//         marginBottom: 10,
//         fontWeight: '500', 
//         color: '#555', 
//     },

//     wifiContainer: {  
//         marginTop: 20,  
//         width: '100%',  
//         alignItems: 'center',  
//     },

//     input: {  
//         height: 45,  
//         width: '90%',  
//         borderColor: '#ccc',  
//         borderWidth: 1,  
//         marginBottom: 10,  
//         paddingHorizontal: 15,  
//         borderRadius: 8,  
//         backgroundColor: '#fff',
//     },

//     button: {  
//         backgroundColor: '#49aae6',
//         paddingVertical: 15, 
//         paddingHorizontal: 20, 
//         borderRadius: 10,
//         marginBottom: 10,
//         width: '90%',
//         alignItems: 'center',
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 }, 
//         shadowOpacity: 0.3, 
//         shadowRadius: 3, 
//         elevation: 4,
//     },

//     buttonText: {  
//         color: '#fff',  
//         fontSize: 16,  
//         fontWeight: 'bold',  
//     },

//     row: {  
//         flexDirection: 'row',  
//         alignItems: 'center',  
//         justifyContent: 'space-between',  
//         paddingVertical: 10,  
//         paddingHorizontal: 15,  
//         borderBottomWidth: 1,  
//         borderBottomColor: '#ccc',  
//     },

//     actionButtons: {  
//         marginVertical: 10,  
//         width: '100%',  
//         alignItems: 'center',  
//     },
// });

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, Platform, PermissionsAndroid, TextInput } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { router } from 'expo-router';
import { Buffer } from 'buffer';
import { scanNetworks } from './wificonnections';;

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
    <View style={styles.container}>
    <Text style={styles.heading}>Connect to Sensor</Text>
    {showConnection && (
        <Text>{successfullyConnectedWifi}</Text>
    )}
    {/*Think I want to make this disappear when connection is made, and reappear when disconnected */}
    <Button title="Scan for Devices" onPress={scanDevices} /> 
    {connected && (!foundNetworks) && (
        <View style={styles.wifiContainer} >
        
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

    {connected && (
    <View>
        <Button title="Scan for wifis lol" onPress={handleScanNetworks}/>
        <Button title="Disconnect" color="red" onPress={() => {bleManager.destroy()}}/>
    </View>
    )}

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
    
    
    {foundNetworks && (
    <View>
        {(!showPasswordInput) && (
            <FlatList
                data={wifiNetworks}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                <View style={styles.row}>
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
row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
},

});




