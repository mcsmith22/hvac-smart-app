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
#include <ble_callbacks.h>
#include <arduino_secrets.h>

// ----- WiFi Credentials -----
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
String runFlashDetection(uint8_t addr);
float runGasDetection();
float runAmpDetection();
uint8_t setupWhenWifiConnected();

// Define statements
#define WIFI_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8" // we can change this with any generated verion 4 uuid (randomly geneerated)
#define LED_PIN 8       
#define NUM_LEDS 1      

// RGB LED Control Setup
Adafruit_NeoPixel rgb_led(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Amp Sesnor Setup
Adafruit_ADS1115 ads;
const float FACTOR = 100; //20A/1V from the CT
const float multiplier = 0.00005;

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

// (Optional) Flash detection function, similar in style
String runFlashDetection(uint8_t addr) {
  int on_for = 0;
  String flash_sequence = "";
  while (true) {
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
    
    if (r_8bit > 30 && g_8bit > 30 && b_8bit > 30) {
      on_for++;
    } else {
      if (on_for > 0) {
        if (on_for > 10) {
          if (flash_sequence.length() > 0) {
            flash_sequence += " long";
          }
        } else {
          if (flash_sequence.endsWith("short")) {
            flash_sequence += " short";
          } else {
            // Serial.println("Short flash detected");
            if (flash_sequence.length() > 0) {
              Serial.println(flash_sequence);
              return flash_sequence;
            }

            flash_sequence = "short";
          }
        }
        on_for = 0;
      }
    }
    delay(50);
  }
}

float runAmpDetection() {
  float voltage;
  float current;
  float sum = 0;
  long time_check = millis();
  int counter = 0;

  while (millis() - time_check < 1000)
  {
    // voltage = ads.readADC_Differential_0_1() * multiplier;
    voltage = analogRead(1) * multiplier;
    current = voltage * FACTOR;
    //current /= 1000.0;

    sum += sq(current);
    counter = counter + 1;
  }

  current = sqrt(sum / counter);
  return (current);
  // return 0.0;
}

float runGasDetection() {
  // Read sensor value and compute voltage
  int sensorValue = analogRead(0); // sensorpin is set to 0
  float sensor_volt = (sensorValue / 1024.0) * 5.0;
  
  // Calculate the sensor resistance in gas (RS_gas) using the voltage divider formula
  // Note: This assumes a 5V supply and a properly chosen load resistor.
  float RS_gas = (5.0 - sensor_volt) / sensor_volt;  
  // Calculate the ratio of RS_gas to the calibrated baseline R0
  float ratio = RS_gas / R0;  
  
  // Print sensor details
  Serial.print("Sensor Voltage = ");
  Serial.print(sensor_volt);
  Serial.println(" V");
  Serial.print("RS_gas = ");
  Serial.println(RS_gas);
  Serial.print("RS_gas / R0 = ");
  Serial.println(ratio);
  Serial.println();
  return ratio; // if this is below 0 we want to return that theres a dangerous amount of C0
  // Compare the ratio against the threshold.
  // If the ratio exceeds the threshold, turn on the LED to signal a dangerous condition.
  if (ratio < GAS_THRESHOLD) {
    Serial.println("ALARM: Gas concentration high! ratio: ");
    Serial.print(ratio);
  } else {

    Serial.print("u all good bro, (ratio, threshhold) = (");
    Serial.print(ratio);
    Serial.print(", ");
    Serial.print(GAS_THRESHOLD);
    Serial.println(")");
  }
}

uint8_t setupWhenWifiConnected() { // mostly just the setup for sensor code to do once wifi connection has been establoished, just the stuff I want to run once instead of loop
  // ads.setGain(GAIN_FOUR); // +/- 1.024V 1bit = 0.5mV for Matthew's sensor, this conflicts with austin's pin
  // ads.begin(); // for the current sensor connected to the I2C bus
  // Wire.begin(); // for the gas sensor connected to pin 0
  rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
  rgb_led.show();
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
    // Serial.println("End transmission return: " + result);
  }
  if (sensorAddr == 0) {
    Serial.println("No I2C devices found.");
    return 0;
  }

  // Set sensor register to enable RGB reading (write 0x05 to register 0x01)
  Wire.beginTransmission(sensorAddr);
  Wire.write(0x01);
  Wire.write(0x05);
  Wire.endTransmission();

  return sensorAddr;
}

// ----- Setup & Main Loop -----
void setup() {
  Serial.begin(115200);
  Serial.println("-------------------Setup Done------------------------");
  
  rgb_led.begin();
  rgb_led.setPixelColor(0, rgb_led.Color(45, 32, 0)); // initial yellow
  rgb_led.show();
  Serial.println("setting up  ble");
  BLEDevice::init("HVASEE Sensor"); // Set device name
  
  // Create BLE server and set callbacks for connection events
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

  // setupWhenWifiConnected();
}
bool alreadySetupAfterWifiConnect = false; // This is honestly fucking stupid but its how im making sure setupWhenWifiConnected() is only called once
void loop() {
  if (getSetupWhenWifiConnected() == true && alreadySetupAfterWifiConnect == false) {
    sensorAddr = setupWhenWifiConnected();
    alreadySetupAfterWifiConnect = true;
    Serial.println("BOOOOOM BOOOOOOM BOOOOM BOOMMMMM");
  }
  // Start the color detection loop (this function runs indefinitely)
  if (WiFi.status() == WL_CONNECTED && sensorAddr != 0) { 
    Serial.println("Sensor found at: " + sensorAddr);
    String flashSequence = runFlashDetection(sensorAddr);
    float gasValue = runGasDetection();
    float ampMeasurement = runAmpDetection();
    String colorName = runColorDetection(sensorAddr);

    String formattedDate = getFormattedDate();

    HTTPClient http;
    http.begin(FUNCTION_URL);
    http.addHeader("Content-Type", "application/json");
    String body = "{\"id\":\"testArduino-" + formattedDate + "\", \"date_of_req\": \"" + formattedDate +
                  "\", \"deviceId\": \"testArduino\", \"color\": \"" + colorName + "\", \"flash_sequence\": \"" + flashSequence +
                  "\", \"amp_measurement\": \"" + ampMeasurement + "\", \"gas_value\": \"" + gasValue + "\", \"unit_type\": \"carrier\", \"userId\": \"fZUfNhLtujW7JzJPcS8UGCZt9gs2\"}";
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

    delay(5000);
    // }
  } else if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Sensor not found");
    delay(500);
  }

}
