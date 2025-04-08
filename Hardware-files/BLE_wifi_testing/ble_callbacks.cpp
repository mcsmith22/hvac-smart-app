#include <ble_callbacks.h>
#include <WiFi.h>
bool callSetupWhenWifiConnected = false;

void MyServerCallbacks::onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Client connected via BLE");
    wifiNetworks = scanForNetworks();
}

void MyServerCallbacks::onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Client disconnected");
}

String MyServerCallbacks::scanForNetworks() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  Serial.println("Scanning for Wi-Fi networks...");
  int numNetworks = WiFi.scanNetworks();
  String jsonResult = "[";
  int countUnique = 0;
  // Array to store unique SSIDs (max 10 unique networks)
  String uniqueSSIDs[10];
  
  if (numNetworks == 0) {
    jsonResult += "{\"error\":\"No networks found\"}";
  } else {
    for (int i = 0; i < numNetworks; i++) {
      String currentSSID = WiFi.SSID(i);
      bool duplicate = false;
      // Check if this SSID is already in our unique list
      for (int j = 0; j < countUnique; j++) {
        if (uniqueSSIDs[j] == currentSSID) {
          duplicate = true;
          break;
        }
      }
      // If it is not a duplicate, add it to the result
      if (!duplicate) {
        uniqueSSIDs[countUnique] = currentSSID;
        if (countUnique > 0) {
          jsonResult += ",";
        }
        jsonResult += "{\"ssid\":\"" + currentSSID + "\",";
        jsonResult += "\"encryption\":\"" + String(WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Secured") + "\"}";
        countUnique++;
        // Optionally, stop after 10 unique networks
        if (countUnique >= 10) {
          break;
        }
      }
    }
  }
  jsonResult += "]";
  Serial.println("Scan results:");
  Serial.println(jsonResult);
  return jsonResult;
}


  void MyCharacteristicCallbacks::onWrite(BLECharacteristic* pCharacteristic) {
    Serial.println("Made it to the callback");
    String valueStr = pCharacteristic->getValue();
    std::string value(valueStr.c_str());

    if (value.length() > 0) {
      Serial.print("Received scannn");
      Serial.println(value.c_str());
      String inputStr = String(value.c_str());
      Serial.println(inputStr);
      int colonIndex = inputStr.indexOf(':');

      if (inputStr == "SCANNN") {
        Serial.print("This should be setting the notification: ");
        Serial.println(wifiNetworks);
        
        pCharacteristic->setValue(wifiNetworks.c_str());
        delay(100);
        Serial.print("*******Value of pcharacteristic******:");
        Serial.println(pCharacteristic->getValue());
        delay(100);
        pCharacteristic->notify();


      } else if (colonIndex != -1) {
        // Extract the SSID and password using substring
          String ssid = inputStr.substring(0, colonIndex);
          String pswd = inputStr.substring(colonIndex + 1);

          WiFi.mode(WIFI_STA);
          WiFi.begin(ssid, pswd);
          int counter = 0;
          while (WiFi.status() != WL_CONNECTED) {
            if (counter > 10) { // arbitrary limit to give enough time before deciding its not going to connect
                break; // probably wont cponnect
            } else {
              Serial.println(".");
              counter += 1;
              delay(500);
            }
          }
          String send = "";
          if (WiFi.status() == WL_CONNECTED) {
            send = "Connected to Network: " + ssid;
          } else {
            // rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
            send = "WRONG PASSWORD FOR: " + ssid;
          }
          
          // rgb_led.show();
          
          Serial.print("send :");
          Serial.println(send);
          pCharacteristic->setValue(send.c_str());
          delay(300);
          Serial.println("Disconnecting from BLE...");
          // add functionality to disconnect from bleutooth
          Serial.println(pCharacteristic->getValue());
          pCharacteristic->notify();
          if (WiFi.status() == WL_CONNECTED) {
            Serial.println("Still connected after disconeecting from ble");

            // sensorAddr = setupWhenWifiConnected(); // start reading from the sensors to send to the database
            setSetupWhenWifiConnected();
          }
      } else {
        Serial.println("NOPEEE");
      }
    } else {
      Serial.println("blorbgorbabor");
    }
  }

void setSetupWhenWifiConnected() {
  callSetupWhenWifiConnected = true;
}
bool getSetupWhenWifiConnected() {
  return callSetupWhenWifiConnected;
}

