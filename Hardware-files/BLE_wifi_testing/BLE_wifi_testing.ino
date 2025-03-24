// Able to connect to chip thru phone and input wifi
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h> // might be able to comment out
#include <WiFi.h>
#include <Adafruit_NeoPixel.h>
#define LED_PIN 8       
#define NUM_LEDS 1      

Adafruit_NeoPixel rgb_led(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Define a UUID for the writable characteristic (choose one and use the same one in the app)
#define WIFI_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8" // we can change this with any generated verion 4 uuid (randomly geneerated)

bool deviceConnected = false;
String wifiNetworks = "";

//is called whenever device connects/disconnects
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("Client connected via BLE");
    wifiNetworks = scanForNetworks();

    rgb_led.setPixelColor(0, rgb_led.Color(0, 50, 0)); // Green
    rgb_led.show();

  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("Client disconnected");
    rgb_led.setPixelColor(0, rgb_led.Color(10, 0, 0));
    rgb_led.show();
    setup();   // get rid of this when I'm done testing, wont be able to connect to wifi, bc I will disconnect when connecting to wifi ---------- IMPORTANT ---------------- IMPORTANT ----------------------
  }
  String scanForNetworks() {
    WiFi.mode(WIFI_STA);  // Set Wi-Fi to station mode
    WiFi.disconnect();    // Disconnect from any previous connections
    delay(100);
    Serial.println("------------------------------------------------------------------------------");

    Serial.println("Scanning for Wi-Fi networks...");
    int numNetworks = WiFi.scanNetworks();
    String jsonResult = "[";
    if (numNetworks == 0) {
      Serial.println("No networks found.");
      jsonResult += "{\"error\":\"No networks found\"}";
    } else {
        for (int i = 0; i < 10; i++) {
          jsonResult += "{\"ssid\":\"" + WiFi.SSID(i) + "\",";
          jsonResult += "\"encryption\":\"" + String(WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Secured") + "\"}";
          if (i < 10 - 1) {
            jsonResult += ",";
          }
        }
    }
    jsonResult += "]";
    Serial.println("Scan results:");
    Serial.println(jsonResult.c_str());
    return jsonResult;
  }
};

// Custom BLE Characteristic Callbacks for the writable characteristic
class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
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
          delay(200);
          int counter = 0;
          while (WiFi.status() != WL_CONNECTED) {
            if (counter < 4) { // arbitrary limit to give enough time before deciding its not going to connect
                break; // probably wont cponnect
            } else {
            Serial.println(".");
            counter += 1;
            delay(400);
            }
          }
          String send = "";
          if (WiFi.status() == WL_CONNECTED) {
            rgb_led.setPixelColor(0, rgb_led.Color(40, 40, 100));
            send = "Connected to Network: " + ssid;
          } else {
            rgb_led.setPixelColor(0, rgb_led.Color(80, 0, 80));
            send = "WRONG PASSWORD FOR: " + ssid;
          }
          
          rgb_led.show();
          
          Serial.print("send :");
          Serial.println(send);
          pCharacteristic->setValue(send.c_str());
          delay(300);
          // Serial.print("Wifi connected, IP is ");
          // Serial.println(WiFi.localIP());
          Serial.println("Disconnecting from BLE...");
          // add functionality to disconnect from bleutooth
          Serial.println(pCharacteristic->getValue());
          pCharacteristic->notify();
      } else {
        Serial.println("NOPEEE");
      }
    } else {
      Serial.println("blorbgorbabor");
    }
  }
};

void setup() {
  Serial.begin(115200);
  delay(5000);
  Serial.println("-------------------setup workedd------------------------");
  
  rgb_led.begin();
  rgb_led.setPixelColor(0, rgb_led.Color(45, 32, 0)); // initial yellow
  rgb_led.show();
  Serial.println("setting up  ble");
  BLEDevice::init("HVASEE Sensor"); // Set device name
  
  // Create a BLE server and set callbacks for connection events
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  //reate a BLE service
  BLEService *pService = pServer->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  
  BLECharacteristic *pCharacteristic = pService->createCharacteristic(
      WIFI_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
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
  delay(100);
  // make it so if a wifi stored it tries to continuously connect 
}



















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
