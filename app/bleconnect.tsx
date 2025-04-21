import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  PermissionsAndroid,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
} from 'react-native';

import { BleManager } from 'react-native-ble-plx';
import { Stack, router } from 'expo-router';
import { Buffer } from 'buffer';
import { scanNetworks } from './wificonnections';
import { auth } from '../.expo/config/firebase';
import { addDeviceForUser } from '../app/firestoreFunctions';
import { Picker } from '@react-native-picker/picker';
import { sendTest } from './notifications';
// import {sendTest } from './notifications';

const wifiServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const wifiCharacteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

//brands
const deviceBrands = ["Carrier", "Trane", "Whirlpool", "Lennox", "Rheem"];

export default function BLEConnect() {

  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [scanning, setScanning] = useState(false);
  const bleManager = new BleManager();
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [successfullyConnectedWifi, setSuccessfullyConnectedWifi] = useState("");
  const [currentStep, setCurrentStep] = useState("scanning");
  const [deviceName, setDeviceName] = useState("");
  const [showWifiWheel, setShowWifiWheel] = useState(false);

  const [deviceBrand, setDeviceBrand] = useState("");


  const [selectedWifi, setSelectedWifi] = useState(null);
  const [wifiPassword, setWifiPassword] = useState("");
  const [bleScanCount, setBleScanCount] = useState(0);
  const [wrongPassword, setWrongPassword] = useState(false)

  // request android ble permissions
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
  // useEffect(() => {
  //   // check if device status has changed
  //   // if device status changed, display error:
  //   // sendTest()
  // }), true

  useEffect(() => {
    requestPermissions();
    //need to wait for BLE be working before calling it to scan devices
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        scanForDevices(); // Now it's safe to start scanning
      }
    }, true);
  
    return () => {
      console.log("should be removing a device when I leave this page")
      subscription.remove();
      bleManager.destroy();
    };
  }, []);

  useEffect(() => {
    const tryAddDevice = async () => {
      if (successfullyConnectedWifi !== "") {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Error", "No user signed in.");
          return;
        }
  
        console.log(
          "About to try and add device to user (user.uuid, deviceId, deviceName, deviceBrand):",
          user.uid, connectedDevice.id, deviceName, deviceBrand
        );
  
        await addDeviceForUser(user.uid, connectedDevice.id, deviceName, deviceBrand);
        Alert.alert("Success", "Device added to firestore!");
  
        if (successfullyConnectedWifi !== "") {
          router.push('/home');
        } else {
          console.log("Added device to firestore, but WiFi not connected. Staying on page.");
          // You could show an error or retry here
        }
      }
    };
  
    tryAddDevice(); // run the async function
  }, [successfullyConnectedWifi]); // only runs when this value changes
  
  

  const handleMonitorCharacteristic = (error, characteristic) => {
    if (error) {
      console.warn("Notification error:", error);
      return;
    }
    if (characteristic?.value) {
      const decodedValue = Buffer.from(characteristic.value, 'base64').toString();
      console.log("Received notification:", decodedValue);
      if (decodedValue[0] === "[") {
        try {
          const networks = JSON.parse(decodedValue);
          setWifiNetworks(networks);
        } catch (e) {
          console.error("Error parsing WiFi networks JSON:", e);
        }
      } else if (decodedValue[0] === "C") {
        setSuccessfullyConnectedWifi(decodedValue);
      } else if (decodedValue[0] === "W") { // wrong password, go back to password selection and input
        console.log("Line 113ish: This is where I should put wrong pswd logic")
        setWrongPassword(true)
        // reste wifi ssid and pswd fields
        // try t connect to wifi again
        // setSuccessfullyConnectedWifi()
        
      } else {
        console.log("Device response:", decodedValue);
      }
    }
  };

  //scan for devices
  const scanForDevices = () => {
    console.log("IM in scanning wtf")
    setScanning(true);
    setDevices([]);
    console.log("rescannig for devices")
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.warn('Scanning error:', error);
        setScanning(false);
        return;
      }
      if (device && device.name) {
        // console.log("it is finding devices bro")
        // only show devices named "HVASEE Sensor" or "ESP32-BLE-Device"
        if (device.name === "HVASEE Sensor" || device.name === "ESP32-BLE-Device") {
          console.log(device.id)
          console.log("------------------------------------------------")
          // console.log("found our device, should be connecting")
          try {
            connect(device)
          } catch (error) {
            console.log("really just couldnt connect brto")
            setScanning(false);
          }

          setDevices(prev => {
            if (!prev.find(d => d.id === device.id)) return [...prev, device];
            return prev;
          });
        }
      }
    });
    // stop after time interval (10s right now)
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setScanning(false);
      setCurrentStep("deviceSelection");
    }, 10000);
  };

  const connect = async (device) => {
    console.log("trying to connect to device wtf")
    // console.log(device);
    try {
        console.log("------------------------------------------------------------------------------");
        const connectedDev = await bleManager.connectToDevice(device.id);
        console.log('Connected to device:', connectedDev.name);
        console.log('Connected dev id: ', connectedDev.id);
        
        setConnectedDevice(connectedDev);
        try {
          sendTest("connectedd to deviceeee", "body of notification", "Line 203") 
        } catch (e) {
          console.log("failed sending not", e)
        }

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
                } else if (decodedValue[0] === "C") {
                    console.log("line 194, WHY DO I HAVE BOTH THIS AND LINE 110?? SAME LOGIC/CHECK?");
                    setSuccessfullyConnectedWifi(decodedValue);
                } else if (decodedValue[0] === "W") { // connection failed
                    console.log("conenctio failed");
                    console.log("Line 201ish: This is where I should put wrong pswd logic")
                    setWrongPassword(true)
                }

            }
        }
        );
        // setConnected(true);
    } catch (error) {
        console.error('Error connecting to device:', error);
    }
};

  const handleSelectDevice = async (device) => {
    setCurrentStep("connecting");
    try {
      const connectedDev = await bleManager.connectToDevice(device.id);
      console.log('Connected to device:', connectedDev.name);
      setConnectedDevice(connectedDev);
      await connectedDev.discoverAllServicesAndCharacteristics();
      connectedDev.monitorCharacteristicForService(
        wifiServiceUUID,
        wifiCharacteristicUUID,
        handleMonitorCharacteristic
      );
      setCurrentStep("deviceInfo");
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert("Connection Error", "Failed to connect to the selected device.");
      setCurrentStep("deviceSelection");
    }
  };

  const selectDeviceBrandIOS = () => {

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...deviceBrands, "Cancel"],
        cancelButtonIndex: deviceBrands.length,
        title: "Select Device Brand",
      },
      (buttonIndex) => {
        if (buttonIndex !== deviceBrands.length) {
          setDeviceBrand(deviceBrands[buttonIndex]);
        }
      }
    );
  };

  // device info
  const handleSubmitDeviceInfo = async () => {
    if (!deviceName.trim()) {
      Alert.alert("Error", "Please enter a device name.");
      return;
    }
    if (!deviceBrand) {
      Alert.alert("Error", "Please select a device brand.");
      return;
    }

    setCurrentStep("wifiSetup");
  };

  // scan for WiFi networks
  const handleScanWifiNetworks = async () => {
    setShowWifiWheel(true)
    try {
      if (!connectedDevice) {
        Alert.alert("Error", "No device connected.");
        return;
      } else {
      const dataToSend = "SCANNN";
      const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64');
      const result = await connectedDevice.writeCharacteristicWithResponseForService(
        wifiServiceUUID,
        wifiCharacteristicUUID,
        computedBase64Data
      );
    }
      // console.log("WiFi scan command sent:", result);
    } catch (error) {
      console.error("Error scanning for WiFi networks:", error);
    }
  };

  const handleSubmitWifiCredentials = async () => {
    console.log("line 295")
    if (!selectedWifi) {
      Alert.alert("Error", "Please select a WiFi network.");
      return;
    }
    if (!wifiPassword.trim()) {
      Alert.alert("Error", "Please enter a WiFi password.");
      return;
    }
    try {
      const dataToSend = `${selectedWifi.ssid}:${wifiPassword}`;
      const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64');
      const result = await connectedDevice.writeCharacteristicWithResponseForService(
        wifiServiceUUID,
        wifiCharacteristicUUID,
        computedBase64Data
      );
      console.log("WiFi credentials sent:", result);
      
      // // save device info to firestore
      // const user = auth.currentUser;
      // if (!user) {
      //   Alert.alert("Error", "No user signed in.");
      //   return;
      // }

      // console.log("About to try and add device to user (user.uuid, deviceId, deviceName, deviceBrand) (", user.uid, ",", String(connectedDevice.id), "," , deviceName, ",", deviceBrand)
      // await addDeviceForUser(user.uid, connectedDevice.id, deviceName, deviceBrand);
      // Alert.alert("Success", "Device added to firestore!"); // this is triggering no matter what, even if the password is wrong... need to fix this!
      // if (successfullyConnectedWifi !== "") {
      //     router.push('/home');
      // } else {
      //   console.log("Added device to firestore (without wifi connection?) but don't want to push to home without setting wifi");
      //   console.log("line 328, handleSubmitWifiCredentials, Maybe I should await a response from the device, and if it says connect failed then I do logic here?")
      // }

    } catch (error) {
      console.error("Error sending WiFi credentials:", error);
      Alert.alert("Error", "Failed to send WiFi credentials.");
    }
  };

  // close button
  const renderCancelButton = () => (
    <TouchableOpacity style={styles.cancelButton} onPress={() => {
      
      router.push('/home')}
      }>
      <Text style={styles.cancelButtonText}>X</Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (currentStep) {
      case "scanning":
        return (
          <View style={styles.centeredContent}>
            <Text style={[styles.heading, styles.topHeading]}>Scanning for devices...</Text>
            <ActivityIndicator size="large" color="#49aae6" />
          </View>
        );
      case "deviceSelection":
        return (
          <View style={styles.centeredContent}>
            {devices.length === 0 ? (
              <>
                <Text style={[styles.heading, styles.topHeading]}>No HVASee Device Found</Text>
                <Text style={styles.notFoundText}>
                  Move closer to your device and make sure the device is plugged in.
                </Text>
                <TouchableOpacity style={styles.submitButton} onPress={() => {
                  const bleManager = new BleManager();
                  setCurrentStep("scanning")
                  scanForDevices()
                }}
                  >
                <Text style={styles.buttonText}>Scan Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.heading, styles.topHeading]}>Select your HVASee Sensor</Text>
                <FlatList
                  data={devices}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.deviceListItem} onPress={() => handleSelectDevice(item)}>
                      <Text style={styles.deviceListText}>{item.name} ({item.id})</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </View>
        );
      case "connecting":
        return (
          <View style={styles.centeredContent}>
            <Text style={[styles.heading, styles.topHeading]}>Connecting to device...</Text>
            <ActivityIndicator size="large" color="#49aae6" />
          </View>
        );
      case "deviceInfo":
        return (
          <View style={styles.centeredContent}>
            <Text style={[styles.heading, styles.topHeading]}>Name Your Device</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter device name"
              value={deviceName}
              onChangeText={setDeviceName}
            />
            <Text style={styles.subHeading}>Select Device Brand</Text>
            {Platform.OS === 'ios' ? (
              <TouchableOpacity style={styles.actionButton} onPress={selectDeviceBrandIOS}>
                <Text style={[styles.actionButtonText, { color: deviceBrand ? '#000' : '#888' }]}>
                  {deviceBrand ? deviceBrand : "-- Select a brand --"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={deviceBrand}
                  onValueChange={(itemValue) => setDeviceBrand(itemValue)}
                  style={[styles.picker, { color: deviceBrand ? '#000' : '#888' }]}
                  mode="dropdown"
                  itemStyle={{ color: '#000' }}
                >
                  <Picker.Item label="-- Select a brand --" value="" />
                  <Picker.Item label="Carrier" value="Carrier" />
                  <Picker.Item label="Trane" value="Trane" />
                  <Picker.Item label="Whirlpool" value="Whirlpool" />
                  <Picker.Item label="Lennox" value="Lennox" />
                  <Picker.Item label="Rheem" value="Rheem" />
                </Picker>
              </View>
            )}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitDeviceInfo}>
              <Text style={styles.buttonText}>Submit Device Info</Text>
            </TouchableOpacity>
          </View>
        );
      case "wifiSetup":
        return (
          <View style={styles.centeredContent}>
            <Text style={[styles.heading, styles.topHeading]}>WiFi Setup</Text>
            {wifiNetworks.length === 0 ? (
              <>
                <TouchableOpacity style={styles.submitButton} onPress={handleScanWifiNetworks}>
                  <Text style={styles.buttonText}>Scan for WiFi Networks</Text>
                </TouchableOpacity>
        
                {(showWifiWheel) && (
                <>
                <Text style={styles.subHeading}>Scanning for WiFi networks...</Text>
                <ActivityIndicator size="large" color="#49aae6" />
                </>
              )}
              </>
            ) : (
              <>
                <Text style={styles.subHeading}>Select a WiFi network:</Text>
                <FlatList
                  data={wifiNetworks}
                  keyExtractor={(item, index) => item.ssid + index}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.deviceListItem} onPress={() => setSelectedWifi(item)}>
                      <Text style={styles.deviceListText}>{item.ssid}</Text>
                    </TouchableOpacity>
                  )}
                />
                {selectedWifi && (
                  <>
                    
                    <Text style={styles.subHeading}>Enter WiFi Password for {selectedWifi.ssid}:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="WiFi Password"
                      secureTextEntry
                      value={wifiPassword}
                      onChangeText={setWifiPassword}
                    />
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmitWifiCredentials}>
                      <Text style={styles.buttonText}>Submit WiFi Credentials</Text>
                    </TouchableOpacity>
                    {wrongPassword && (
                      // setWifiPassword("")
                      <Text style={styles.wrpngPasswordText}>WRONG PASSWORD FOR {selectedWifi.ssid}, TRY AGAIN:</Text>
                    )
                    } 
                  </>
                )}
              </>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {renderCancelButton()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centeredContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeading: {
    marginTop: 10,
  },
  heading: {
    fontSize: 26,
    marginBottom: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: '500',
    color: '#555',
    textAlign: 'center',
  },
  wrpngPasswordText: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: '500',
    color: '#f00', // wanrt this to be red
    textAlign: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginVertical: 10,
  },
  input: {
    height: 45,
    width: '90%',
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: '90%',
    height: 45,
    marginBottom: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 45,
  },
  actionButton: {
    height: 45,
    width: '90%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#49aae6',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
    width: '90%',
    alignItems: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deviceListItem: {
    width: '90%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginVertical: 5,
    alignItems: 'center',
  },
  deviceListText: {
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ccc',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 20,
    color: '#fff',
  },
});
