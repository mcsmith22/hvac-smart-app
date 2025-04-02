//leaving this to keep track of how it looked before I split into header and c++ file
// //is called whenever device connects/disconnects
// class MyServerCallbacks: public BLEServerCallbacks {

  // void onConnect(BLEServer* pServer) override {
  //   deviceConnected = true;
  //   Serial.println("Client connected via BLE");
  //   wifiNetworks = scanForNetworks();

  //   rgb_led.setPixelColor(0, rgb_led.Color(0, 50, 0)); // Green
  //   rgb_led.show();

  // }
  // void onDisconnect(BLEServer* pServer) override {
  //   deviceConnected = false;
  //   Serial.println("Client disconnected");
  //   if (WiFi.status() != WL_CONNECTED) {
  //     rgb_led.setPixelColor(0, rgb_led.Color(10, 0, 0));
  //   } else {
  //     rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
  //   }
    
  //   rgb_led.show();
  //   // setup();   // get rid of this when I'm done testing, wont be able to connect to wifi, bc I will disconnect when connecting to wifi ---------- IMPORTANT ---------------- IMPORTANT ----------------------
  // }
  // String scanForNetworks() {
  //   WiFi.mode(WIFI_STA);  // Set Wi-Fi to station mode
  //   WiFi.disconnect();    // Disconnect from any previous connections
  //   delay(100);
  //   Serial.println("------------------------------------------------------------------------------");

  //   Serial.println("Scanning for Wi-Fi networks...");
  //   int numNetworks = WiFi.scanNetworks();
  //   String jsonResult = "[";
  //   if (numNetworks == 0) {
  //     Serial.println("No networks found.");
  //     jsonResult += "{\"error\":\"No networks found\"}";
  //   } else {
  //       for (int i = 0; i < 10; i++) {
  //         jsonResult += "{\"ssid\":\"" + WiFi.SSID(i) + "\",";
  //         jsonResult += "\"encryption\":\"" + String(WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Secured") + "\"}";
  //         if (i < 10 - 1) {
  //           jsonResult += ",";
  //         }
  //       }
  //   }
  //   jsonResult += "]";
  //   Serial.println("Scan results:");
  //   Serial.println(jsonResult.c_str());
  //   return jsonResult;
  // }
// };

// // called whenever the device is written to, custom BLE characteristic callback
// class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
//   void onWrite(BLECharacteristic *pCharacteristic) override {
//     Serial.println("Made it to the callback");
//     String valueStr = pCharacteristic->getValue();
//     std::string value(valueStr.c_str());

//     if (value.length() > 0) {
//       Serial.print("Received scannn");
//       Serial.println(value.c_str());
//       String inputStr = String(value.c_str());
//       Serial.println(inputStr);
//       int colonIndex = inputStr.indexOf(':');

//       if (inputStr == "SCANNN") {
//         Serial.print("This should be setting the notification: ");
//         Serial.println(wifiNetworks);
        
//         pCharacteristic->setValue(wifiNetworks.c_str());
//         delay(100);
//         Serial.print("*******Value of pcharacteristic******:");
//         Serial.println(pCharacteristic->getValue());
//         delay(100);
//         pCharacteristic->notify();


//       } else if (colonIndex != -1) {
//         // Extract the SSID and password using substring
//           String ssid = inputStr.substring(0, colonIndex);
//           String pswd = inputStr.substring(colonIndex + 1);

//           WiFi.mode(WIFI_STA);
//           WiFi.begin(ssid, pswd);
//           delay(200);
//           int counter = 0;
//           while (WiFi.status() != WL_CONNECTED) {
//             if (counter > 4) { // arbitrary limit to give enough time before deciding its not going to connect
//                 break; // probably wont cponnect
//             } else {
//             Serial.println(".");
//             counter += 1;
//             delay(400);
//             }
//           }
//           String send = "";
//           if (!(WiFi.status() != WL_CONNECTED)) {
//             rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
//             send = "Connected to Network: " + ssid;
//           } else {
//             rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
//             send = "WRONG PASSWORD FOR: " + ssid;
//           }
          
//           rgb_led.show();
          
//           Serial.print("send :");
//           Serial.println(send);
//           pCharacteristic->setValue(send.c_str());
//           delay(300);
//           Serial.println("Disconnecting from BLE...");
//           // add functionality to disconnect from bleutooth
//           Serial.println(pCharacteristic->getValue());
//           pCharacteristic->notify();
//           if (WiFi.status() == WL_CONNECTED) {
//             sensorAddr = setupWhenWifiConnected(); // start reading from the sensors to send to the database
//           }
//       } else {
//         Serial.println("NOPEEE");
//       }
//     } else {
//       Serial.println("blorbgorbabor");
//     }
//   }
// };