#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <time.h>
#include <Adafruit_ADS1X15.h>
#include <Adafruit_NeoPixel.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "EmonLib.h"
#include <ble_callbacks.h>
#include <arduino_secrets.h>

// ----- WiFi Credential s -----
struct WifiCredential { 
  const char* ssid;
  const char* password;
};

WifiCredential wifis[] = {
  {"Austin’s iPhone 16", "jifspoon"},
  {" Unit1507", "Unit1507@2024"}
};

const int wifiCount = sizeof(wifis) / sizeof(wifis[0]);

// ----- Function Declarations -----
WifiCredential* scanWifi();
String getFormattedDate();
String getCategoryInfo();
String classifyColor(uint8_t r, uint8_t g, uint8_t b);
uint8_t scaleTo8bit(uint16_t value, uint16_t max_value = 65535);
String runColorDetection(uint8_t addr);
String runFlashDetectionRaw(uint8_t addr);
int runGasDetection();
double runAmpDetection();
uint8_t setupWhenWifiConnected();

// Define statements
#define WIFI_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8" // we can change this with any generated verion 4 uuid (randomly geneerated)
#define LED_PIN 8       
#define NUM_LEDS 1      
// For current sensor
#define ADC_INPUT 5
#define ADC_BITS 10
#define ADC_COUNTS (1 << ADC_BITS)

// RGB LED Control Setup
Adafruit_NeoPixel rgb_led(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
// String lastSequence = "short long";

// Amp Sesnor Setup
EnergyMonitor emon1;

// Gas Sensor Setup
const float GAS_THRESHOLD = 0.0;  
float R0 = 0.71; // came from calibraion of MQ9

// Wi-Fi Connection Setup
bool deviceConnected = false;
String wifiNetworks = "";

// RGB Sensor Setup
uint8_t sensorAddr;
struct ColorData {
  uint16_t r;
  uint16_t g;
  uint16_t b;
};


String getFormattedDate() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  gmtime_r(&now, &timeinfo);
  char buf[30];
  // Format: "YYYY-MM-DD-HH-MM-SS"
  sprintf(buf, "%04d-%02d-%02d-%02d-%02d-%02d",
          timeinfo.tm_year + 1900,
          timeinfo.tm_mon + 1,
          timeinfo.tm_mday,
          timeinfo.tm_hour,
          timeinfo.tm_min,
          timeinfo.tm_sec);
  return String(buf);
}

// ----- Color Classification & Scaling -----
String classifyColor(uint8_t r, uint8_t g, uint8_t b) {
  if ((int)r - ((int)g + (int)b) > 50) {
    return "Red";
  } else if ((int)g - ((int)r + (int)b) > 50) {
    return "Green";
  } else if (abs(r - g) < 60 && r > 100 && g > 100) {
    return "Yellow";
  }
  return "Unknown";
}

uint8_t scaleTo8bit(uint16_t value, uint16_t max_value) {
  return (uint8_t)((((float)value) / max_value) * 255.0);
}

// ----- Sensor Processing Functions -----
String runColorDetection(uint8_t addr) {
  uint16_t r_total = 0, g_total = 0, b_total = 0;
  // Take three samples and average them
  for (int i = 0; i < 3; i++) {
    uint8_t raw_data[6];
    // Request 6 bytes from register 0x09
    Wire.beginTransmission(addr);
    Wire.write(0x09);
    Wire.endTransmission();
    Wire.requestFrom(addr, (uint8_t)6);
    int index = 0;
    while (Wire.available() && index < 6) {
      raw_data[index++] = Wire.read();
    }
    
    uint16_t g_value = ((uint16_t)raw_data[1] << 8) | raw_data[0];
    uint16_t r_value = ((uint16_t)raw_data[3] << 8) | raw_data[2];
    uint16_t b_value = ((uint16_t)raw_data[5] << 8) | raw_data[4];
    
    uint8_t r_8bit = scaleTo8bit(r_value);
    uint8_t g_8bit = scaleTo8bit(g_value);
    uint8_t b_8bit = scaleTo8bit(b_value);
    
    r_total += r_8bit;
    g_total += g_8bit;
    b_total += b_8bit;
  }
  uint8_t r_avg = r_total / 3;
  uint8_t g_avg = g_total / 3;
  uint8_t b_avg = b_total / 3;
  
  char hex_color[8];
  sprintf(hex_color, "#%02X%02X%02X", r_avg, g_avg, b_avg);
  
  String color_name = classifyColor(r_avg, g_avg, b_avg);
  
  Serial.print("8-bit RGB: ");
  Serial.print(r_avg);
  Serial.print(" ");
  Serial.print(g_avg);
  Serial.print(" ");
  Serial.println(b_avg);
  Serial.print("Color Name: ");
  Serial.println(color_name);

  return color_name;
}

String runFlashDetectionRaw(uint8_t addr) {
  Serial.println("Running flash detection (RAW)");
  String flash_samples = "[";
  unsigned long startTime = millis(); // millis() reads the # of milliseconds passed since the arduino board began running the current program. This overflows back to 0 after 50 days of runtime. This will be an issue.
  int sampleCount = 0;

  while (millis() - startTime < 8000) { // collect data for 8 seconds.  This is where the 50 days overflow will go wrong I think. This was a dumb way to do this.
    uint8_t raw_data[6];
    Wire.beginTransmission(addr);
    Wire.write(0x09);
    Wire.endTransmission();
    Wire.requestFrom(addr, (uint8_t)6);
    int index = 0;
    while (Wire.available() && index < 6) {
      raw_data[index++] = Wire.read();
    }

    uint16_t g_value = ((uint16_t)raw_data[1] << 8) | raw_data[0];
    uint16_t r_value = ((uint16_t)raw_data[3] << 8) | raw_data[2];
    uint16_t b_value = ((uint16_t)raw_data[5] << 8) | raw_data[4];
    uint8_t r_8bit = scaleTo8bit(r_value);
    uint8_t g_8bit = scaleTo8bit(g_value);
    uint8_t b_8bit = scaleTo8bit(b_value);

    // Serial.println("R " + String(r_8bit));
    // Serial.println("G " + String(g_8bit));
    // Serial.println("B " + String(b_8bit));

    int brightness = r_8bit + g_8bit + b_8bit;
    int time = sampleCount * 50;

    // Append to JSON-like array
    if (sampleCount > 0) flash_samples += ",";
    flash_samples += "{\"t\":" + String(time) + ",\"b\":" + String(brightness) + "}";

    sampleCount++;
    delay(50);  // 20 samples per second
  }

  flash_samples += "]";
  Serial.println("Collected flash samples:");
  Serial.println(flash_samples);

  return flash_samples;
}

double runAmpDetection() {
  double amps = emon1.calcIrms(1480);
  Serial.print("Current: ");
  Serial.print(amps, 2);
  Serial.println(" A");
  return amps;
}

int runGasDetection() {
  // Read sensor value and compute voltage
  int sensorValue = analogRead(0); // sensorpin is set to 0
  Serial.println("The gas value is " + String(sensorValue));
  return sensorValue;
}

uint8_t setupWhenWifiConnected() { // mostly just the setup for sensor code to do once wifi connection has been establoished, just the stuff I want to run once instead of loop
  // ads.setGain(GAIN_FOUR); // +/- 1.024V 1bit = 0.5mV for Matthew's sensor, this conflicts with austin's pin
  // ads.begin(); // for the current sensor connected to the I2C bus
  // Wire.begin(); // for the gas sensor connected to pin 0
  Serial.println("Setting up");
  
  Wire.begin(6, 7); // for the rgb sensors conenctec to pins 6 and 7
  // Configure time using NTP
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  time_t now = time(nullptr);
  while (now < 100000) {
    delay(1000);
    now = time(nullptr);
  }
  Serial.println("Time synchronized");
    // Scan for I2C devices by iterating over possible addresses
  Serial.println("Scanning I2C devices...");
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    uint8_t result = Wire.endTransmission();
    if (result != 2) {
      Serial.print("I2C device found at address 0x");
      Serial.println(a, HEX);
      sensorAddr = a;
      break;
    }
  }

  if (sensorAddr == 0) {
    Serial.println("No I2C devices found.");
    return 0;
  } else {
    Serial.println("Sensor found at " + sensorAddr);
  }

  Wire.beginTransmission(sensorAddr);
  Wire.write(0x01);
  Wire.write(0x05);
  Wire.endTransmission();

  analogReadResolution(ADC_BITS);  // Use 10-bit ADC for compatibility with EmonLib

  emon1.current(ADC_INPUT, 20.0);  // Initialize CT sensor on GPIO34 with calibration for 20A/V

  Serial.println("Current monitor initialized.");
  sensorAddr = sensorAddr;
  return sensorAddr;
}

// ----- Setup & Main Loop -----
void setup() {
  Serial.begin(115200);
  Serial.print("------------------Setup started----------------------");
  // WiFi.begin("Austin’s iPhone 16", "jifspoon");

  // while (WiFi.status() != WL_CONNECTED) {
  //   delay(1000);
  //   Serial.println("Connecting...");
  // }
  
  rgb_led.begin();
  rgb_led.setPixelColor(0, rgb_led.Color(45, 32, 0)); // initial yellow
  rgb_led.show();
  Serial.println("setting up  ble");
  BLEDevice::init("HVASee Sensor"); // Set device name
  
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
  Serial.println("-------------------Setup Done------------------------");
}

// bool alreadySetupAfterWifiConnect = false; This is lowkey dumb as hell but its the way that I am ensuring that setupWhenWifiConnected only runs once
void loop() {
  // Start the color detection loop (this function runs indefinitely)
  // if (getSetupWhenWifiConnected() == true && alreadySetupAfterWifiConnect == false) {
  //   sensorAddr = setupWhenWifiConnected();
  //   alreadySetupAfterWifiConnect = true;
  // }

  if (WiFi.status() == WL_CONNECTED && sensorAddr != 0) { 
    Serial.println("RGB Sensor found at: " + sensorAddr);
    String flashSequence = runFlashDetectionRaw(sensorAddr);
    int gasValue = runGasDetection();
    double ampMeasurement = runAmpDetection();
    // String colorName = runColorDetection(sensorAddr);

    String formattedDate = getFormattedDate();

    HTTPClient http;
    http.begin(FUNCTION_URL);
    http.addHeader("Content-Type", "application/json");
    String body = "{\"id\":\"testArduino-" + formattedDate + "\", \"date_of_req\": \"" + formattedDate +
                  "\", \"deviceId\": \"testArduino\", \"color\": \"None\", \"flash_sequence\": \"" + flashSequence +
                  "\", \"amp_measurement\": \"" + ampMeasurement + "\", \"gas_value\": \"" + gasValue + 
                  "\", \"unit_type\": \"carrier\", \"userId\": \"fZUfNhLtujW7JzJPcS8UGCZt9gs2\"}";

    Serial.println("Body: " + body);
    
    int httpResponseCode = http.POST(body);
    Serial.print("Status: ");
    Serial.println(httpResponseCode);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.println("HTTP request error");
    }
    http.end();
  } else if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Sensor not found");
    delay(200);
    setupWhenWifiConnected();
  }
}