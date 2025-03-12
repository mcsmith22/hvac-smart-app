// Able to connect to chip thru phone and input wifi
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
// #include <BLE2902.h> // when commented out: Sketch uses 1750779 bytes (89%) of program storage space. Maximum is 1966080 bytes.
#include <WiFi.h>
#include <Adafruit_NeoPixel.h>
// Define the LED pin (GPIO8 is used for the built-in addressable RGB LED)
#define LED_PIN 8       
#define NUM_LEDS 1      

// Create an instance of the NeoPixel library
Adafruit_NeoPixel rgb_led(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Define a UUID for the writable characteristic (choose one and use it in the app)
#define WIFI_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8" // we can change this with any generated verion 4 uuid (randomly geneerated)

bool deviceConnected = false;

//is called whenever device connects/disconnects
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("Client connected via BLE");
    rgb_led.setPixelColor(0, rgb_led.Color(0, 50, 0)); // Green
    rgb_led.show();
  }
  
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("Client disconnected");
    rgb_led.setPixelColor(0, rgb_led.Color(10, 0, 0));
    rgb_led.show();
  }
};

// Custom BLE Characteristic Callbacks for the writable characteristic
class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {

  void onWrite(BLECharacteristic *pCharacteristic) override {
    // std::string value = pCharacteristic->getValue();
    String valueStr = pCharacteristic->getValue();
    std::string value(valueStr.c_str());
    if (value.length() > 0) {
      Serial.print("Received WiFi data: ");
      rgb_led.setPixelColor(0, rgb_led.Color(52, 21, 57));
      rgb_led.show();
      Serial.println(value.c_str());

      String inputStr = String(value.c_str());
      int colonIndex = inputStr.indexOf(':');
      if (colonIndex != -1) {
        // Extract the SSID and password using substring
        String ssid = inputStr.substring(0, colonIndex);
        String pswd = inputStr.substring(colonIndex + 1);
        
        // Serial.print("SSID: ");
        // Serial.println(ssid);
        // Serial.print("Password: ");
        // Serial.println(pswd);
        //NOW TRY WIFI :):):)
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid, pswd);
        while (WiFi.status() != WL_CONNECTED) {
          Serial.print(".");
          delay(1000);
        }
        rgb_led.setPixelColor(0, rgb_led.Color(0, 40, 100));
        rgb_led.show();
        delay(1000);
        delay(1000);
        Serial.print("Wifi connected, IP is ");
        Serial.println(WiFi.localIP());
        Serial.println("Disconnecting from BLE...");

      } else {
        Serial.println("Delimiter ':' not found!");
      }
      // Here, you could parse the value into SSID and password
    } else {
      rgb_led.setPixelColor(0, rgb_led.Color(100, 0, 0));
      Serial.println("wifi data was blank");
    }
  }
};

void setup() {
  Serial.begin(115200);
  delay(10000);
  Serial.println("-------------------setup workedd------------------------");
  
  rgb_led.begin();
  rgb_led.setPixelColor(0, rgb_led.Color(45, 32, 0)); // initial yellow
  rgb_led.show();
  Serial.println("setting up  ble");
  BLEDevice::init("HVASEE Sensor"); // Set your device name
  Serial.println("name set");
  
  // Create a BLE server and set callbacks for connection events
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  //reate a BLE service
  BLEService *pService = pServer->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  
  // Create a writable characteristic for WiFi credentials
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
      WIFI_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE
  );
  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  
  // Start the service
  pService->start();
  
  // Start advertising so your phone can find the ESP32
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("BLE advertising started. Waiting for a client to connect...");
}

void loop() {
  delay(1000);
}







// // This code scans for nearby wifi networks

// #include "WiFi.h"   
// void setup() {
//     Serial.begin(115200);
//     WiFi.mode(WIFI_STA);  // Set Wi-Fi to station mode
//     WiFi.disconnect();    // Disconnect from any previous connections
//     delay(100);
//     Serial.println("------------------------------------------------------------------------------");

//     Serial.println("Scanning for Wi-Fi networks...");
//     int numNetworks = WiFi.scanNetworks();
//     if (numNetworks == 0) {
//       Serial.println("No networks found.");
//     } else {
//         Serial.println("Networks found:");
//         for (int i = 0; i < numNetworks; i++) {
//           // Serial.printf("%d: %s (Signal Strength: %d dBm, Encryption: %s)\n", 
//           Serial.printf("%s (Signal Strength: %d dBm, Encryption: %s)\n"
//             , WiFi.SSID(i).c_str(), WiFi.RSSI(i),
//             WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Secured");
//         }
//     }
//     Serial.println("Stopping Wi-Fi scan.");
// }

// void loop() {
//   //dont do anything, should run the scan once in setup

// }



// // For Austins chip
// // Able to connect to chip thru phone and input wifi
// #include <BLEDevice.h>
// #include <BLEServer.h>
// #include <BLEUtils.h>
// #include <BLE2902.h> // when commented out: Sketch uses 1750779 bytes (89%) of program storage space. Maximum is 1966080 bytes.
// #include <WiFi.h>


// // Define a UUID for the writable characteristic (choose one and use it in the app)
// #define WIFI_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8" // we can change this with any generated verion 4 uuid (randomly geneerated)

// bool deviceConnected = false;

// //is called whenever device connects/disconnects
// class MyServerCallbacks: public BLEServerCallbacks {
//   void onConnect(BLEServer* pServer) override {
//     deviceConnected = true;
//     Serial.println("Client connected via BLE");
//   }
  
//   void onDisconnect(BLEServer* pServer) override {
//     deviceConnected = false;
//     Serial.println("Client disconnected");
//   }
// };

// // Custom BLE Characteristic Callbacks for the writable characteristic
// class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {

//   void onWrite(BLECharacteristic *pCharacteristic) override {
//     // std::string value = pCharacteristic->getValue();
//     String valueStr = pCharacteristic->getValue();
//     std::string value(valueStr.c_str());
//     if (value.length() > 0) {
//       Serial.print("Received WiFi data: ");
//       Serial.println(value.c_str());

//       String inputStr = String(value.c_str());
//       int colonIndex = inputStr.indexOf(':');
//       if (colonIndex != -1) {
//         // Extract the SSID and password using substring
//         String ssid = inputStr.substring(0, colonIndex);
//         String pswd = inputStr.substring(colonIndex + 1);
        
//         // Serial.print("SSID: ");
//         // Serial.println(ssid);
//         // Serial.print("Password: ");
//         // Serial.println(pswd);
//         //NOW TRY WIFI :):):)
//         WiFi.mode(WIFI_STA);
//         WiFi.begin(ssid, pswd);
//         while (WiFi.status() != WL_CONNECTED) {
//           Serial.print(".");
//           delay(1000);
//         }
//         delay(1000);
//         delay(1000);
//         Serial.print("Wifi connected, IP is ");
//         Serial.println(WiFi.localIP());
//         Serial.println("Disconnecting from BLE...");

//       } else {
//         Serial.println("Delimiter ':' not found!");
//       }
//       // Here, you could parse the value into SSID and password
//     } else {
//       Serial.println("wifi data was blank");
//     }
//   }
// };

// void setup() {
//   Serial.begin(115200);
//   delay(10000);
//   Serial.println("-------------------setup workedd------------------------");
  
//   Serial.println("setting up  ble");
//   BLEDevice::init("HVASEE Sensor"); // Set your device name
//   Serial.println("name set");
  
//   // Create a BLE server and set callbacks for connection events
//   BLEServer *pServer = BLEDevice::createServer();
//   pServer->setCallbacks(new MyServerCallbacks());
  
//   //reate a BLE service
//   BLEService *pService = pServer->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  
//   // Create a writable characteristic for WiFi credentials
//   BLECharacteristic *pCharacteristic = pService->createCharacteristic(
//       WIFI_CHARACTERISTIC_UUID,
//       BLECharacteristic::PROPERTY_WRITE
//   );
//   pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  
//   // Start the service
//   pService->start();
  
//   // Start advertising so your phone can find the ESP32
//   BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
//   pAdvertising->addServiceUUID("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
//   pAdvertising->setScanResponse(false);
//   pAdvertising->setMinPreferred(0x06);
//   pAdvertising->setMinPreferred(0x12);
//   BLEDevice::startAdvertising();
  
//   Serial.println("BLE advertising started. Waiting for a client to connect...");
// }

// void loop() {
//   delay(1000);
// }
