import React, { useEffect, useState, useRef } from "react";
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
  SafeAreaView,
  ActionSheetIOS,
  ScrollView,
} from "react-native";
import { Stack, router, useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import tw from "twrnc";
import * as SecureStore from 'expo-secure-store'

import { scanNetworks } from "./wificonnections";
import { auth } from "../src/config/firebase";
import { addDeviceForUser } from "../app/firestoreFunctions";
import { Picker } from "@react-native-picker/picker";

const wifiServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const wifiCharacteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const deviceBrands = ["Carrier", "Trane", "Whirlpool", "Lennox", "Rheem"];

function OutlineCard({ children, style, ...rest }: { children: React.ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          width: '100%',
          borderWidth: 1,
          borderColor: '#3A3A3C',
          borderRadius: 16,
          padding: 20,
          backgroundColor: '#1C1C1E',
          marginBottom: 20,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}



export default function BLEConnect() {
  const [userEmail,    setUserEmail]    = useState<string|undefined>()
  const [userPassword, setUserPassword] = useState<string|undefined>()

  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const bleManager = useRef(new BleManager()).current;
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [successfullyConnectedWifi, setSuccessfullyConnectedWifi] =
    useState("");
  const [currentStep, setCurrentStep] = useState<
    "scanning" | "deviceSelection" | "connecting" | "deviceInfo" | "wifiSetup"
  >("scanning");
  const [deviceName, setDeviceName] = useState("");
  const [showWifiWheel, setShowWifiWheel] = useState(false);
  const [deviceBrand, setDeviceBrand] = useState("");
  const [selectedWifi, setSelectedWifi] = useState<any>(null);
  const [wifiPassword, setWifiPassword] = useState("");

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  };

  useEffect(() => {
    requestPermissions();
    //need to wait for BLE be working before calling it to scan devices
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        scanForDevices(); // Now it's safe to start scanning
      }
    }, true);
    (async () => {
      const loginEmail = await SecureStore.getItemAsync('userEmail')
      const loginPassword = await SecureStore.getItemAsync('userPassword')
      if (loginEmail) setUserEmail(loginEmail)
      if (loginPassword) setUserPassword(loginPassword)
    })()
  
    return () => {
      console.log("should be removing a device when I leave this page")
      subscription.remove();
      bleManager.destroy();
    };
  }, [bleManager]);



  const scanForDevices = () => {
    setScanning(true);
    setDevices([]);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.warn('Scanning error:', error);
        setScanning(false);
        return;
      }
      if (device && device.name) {
        // only show devices named "HVASEE Sensor" or "ESP32-BLE-Device"
        if (device.name === "HVASEE Sensor" || device.name === "ESP32-BLE-Device") {
          console.log("------------------------------------------------")
          console.log("found our device, should be connecting")
          connect(device)

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
    // console.log(device);
    try {
        console.log("------------------------------------------------------------------------------");
        const connectedDev = await bleManager.connectToDevice(device.id);
        console.log('Connected to device:', connectedDev.name);
        console.log('Connected dev id: ', connectedDev.id);
        
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

        if (!userEmail || !userPassword) {
      console.log(`deviceName${deviceName}`)
      console.log(`email${userEmail}`)
      console.log(`Password${userPassword}`)
      Alert.alert('Error','Missing credentials')
      return
    }
    try {
      const dataToSend = `Credentials/${deviceName}/${userEmail}/${userPassword}`
      const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64');
      const result = await connectedDevice.writeCharacteristicWithResponseForService (
        wifiServiceUUID,
        wifiCharacteristicUUID,
        computedBase64Data
      );
      console.log("Device credentials sent:", result);

    } catch (error) {
      console.error("Error sending devcie credentials:", error);
      Alert.alert("Error", "Failed to send device credentiakls.");
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
      console.log("WiFi scan command sent:", result);
    } catch (error) {
      console.error("Error scanning for WiFi networks:", error);
    }
  };

  const handleSubmitWifiCredentials = async () => {
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
      
      // save device info to firestore
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "No user signed in.");
        return;
      }
      console.log("About to try and add device to user (user.uuid, deviceId, deviceName, deviceBrand) (", user.uid, ",", String(connectedDevice.id), "," , deviceName, ",", deviceBrand)
      await addDeviceForUser(user.uid, connectedDevice.id, deviceName, deviceBrand);
      Alert.alert("Success", "Device connected successfully!");
      router.push('/home');
    } catch (error) {
      console.error("Error sending WiFi credentials:", error);
      Alert.alert("Error", "Failed to send WiFi credentials.");
    }
  };

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
      } else {
        console.log("Device response:", decodedValue);
      }
    }
  };



  const renderContent = () => {
    switch (currentStep) {
      case "scanning":
        return (
          <OutlineCard>
            <Text style={styles.heading}>Scanning for devices…</Text>
            <ActivityIndicator />
          </OutlineCard>
        );

      case "deviceSelection":
        return (
          <OutlineCard>
            <Text style={styles.heading}>Select your HVASee Sensor</Text>
            {devices.length === 0 ? (
              <Text style={styles.note}>
                No device found. Move closer and be sure it’s powered on.
              </Text>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(d) => d.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleSelectDevice(item)}
                  >
                    <Text style={styles.listText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </OutlineCard>
        );

      case "connecting":
        return (
          <OutlineCard>
            <Text style={styles.heading}>Connecting…</Text>
            <ActivityIndicator />
          </OutlineCard>
        );

      case "deviceInfo":
        return (
          <OutlineCard>
            <Text style={styles.heading}>Name your device</Text>
            <TextInput
              style={styles.input}
              placeholder="Device name"
              value={deviceName}
              onChangeText={setDeviceName}
              placeholderTextColor="#666"
            />
            <Text style={styles.sub}>Brand</Text>

            {Platform.OS === "ios" ? (
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={selectDeviceBrandIOS}
              >
                <Text
                  style={[
                    styles.selectTxt,
                    { color: deviceBrand ? "#fff" : "#8E8E93" },
                  ]}
                >
                  {deviceBrand || "Tap to pick"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={deviceBrand}
                  onValueChange={setDeviceBrand}
                  style={{ color: "#fff" }}
                  dropdownIconColor="#fff"
                >
                  <Picker.Item label="-- Select brand --" value="" />
                  {deviceBrands.map((b) => (
                    <Picker.Item key={b} label={b} value={b} />
                  ))}
                </Picker>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSubmitDeviceInfo}
            >
              <Text style={styles.btnTxt}>Continue</Text>
            </TouchableOpacity>
          </OutlineCard>
        );

      case "wifiSetup":
        return (
          <OutlineCard>
            <Text style={styles.heading}>Wi‑Fi setup</Text>

            {wifiNetworks.length === 0 ? (
              <>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleScanWifiNetworks}
                >
                  <Text style={styles.btnTxt}>Scan networks</Text>
                </TouchableOpacity>
                {showWifiWheel && (
                  <ActivityIndicator style={tw`mt-3`} size="small" />
                )}
              </>
            ) : (
              <>
                <FlatList
                  data={wifiNetworks}
                  keyExtractor={(i, k) => `${i.ssid}-${k}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.listItem}
                      onPress={() => setSelectedWifi(item)}
                    >
                      <Text
                        style={[
                          styles.listText,
                          selectedWifi?.ssid === item.ssid &&
                            tw`text-blue-400`,
                        ]}
                      >
                        {item.ssid}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {selectedWifi && (
                  <>
                    <Text style={styles.sub}>
                      Password for {selectedWifi.ssid}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      secureTextEntry
                      value={wifiPassword}
                      onChangeText={setWifiPassword}
                      placeholderTextColor="#666"
                    />
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleSubmitWifiCredentials}
                    >
                      <Text style={styles.btnTxt}>Connect</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </OutlineCard>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={tw`flex-1 bg-[#0C0C0E]`}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ title: "HVASee", animation: "none" }} />

      <View
        style={tw`h-14 flex-row items-center justify-center bg-[#0C0C0E] border-b border-[#1C1C1E]`}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color="white"
          style={tw`absolute left-4`}
          onPress={() => router.replace("/devices")}
        />
        <Text style={tw`text-xl font-extrabold text-white`}>
          HVA<Text style={tw`italic`}>See</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={tw`flex-1 px-6 pt-6 pb-6 items-center`}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  sub: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
    alignSelf: "flex-start",
    marginTop: 12,
    marginBottom: 4,
  },
  note: { color: "#FF453A", textAlign: "center" },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#262628",
    color: "#fff",
    marginBottom: 10,
  },
  pickerWrap: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#262628",
    overflow: "hidden",
    marginBottom: 10,
  },
  selectBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#262628",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectTxt: { fontSize: 16 },
  primaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnTxt: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  listItem: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#262628",
    marginVertical: 4,
  },
  listText: { color: "#fff", fontSize: 16 },
});
