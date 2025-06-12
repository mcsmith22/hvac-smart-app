#include <Adafruit_NeoPixel.h>
#define RGB_BRIGHTNESS 255 //  if I want to define a consistent light level.
// Define the LED pin (GPIO8 is used for the built-in addressable RGB LED)
#define LED_PIN 8       
#define NUM_LEDS 1  

// Create an instance of the NeoPixel library
Adafruit_NeoPixel rgb_led(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);


void setup() {
  Serial.begin(115200);
  rgb_led.begin();
  // Serial.println(RGB_BUILTIN);
}

// the loop function runs over and over again forever
void short_yellow() {
  // rgbLedWrite(RGB_BUILTIN, 255, 165, 0);  // yellow
  // rgbLedWrite(RGB_BUILTIN, 125, 80, 0);  // yellow

  // delay(270);
  // rgbLedWrite(RGB_BUILTIN, 0, 0, 0);  // Off / black
  rgb_led.setPixelColor(0, rgb_led.Color(255, 165, 0));
  rgb_led.show();
  delay(270);
  rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
  rgb_led.show();
}

void long_yellow() {
  // rgbLedWrite(RGB_BUILTIN, 255, 165, 0);  // yellow
  // rgbLedWrite(RGB_BUILTIN, 125, 80, 0);  // yellow
  // delay(1000);
  // rgbLedWrite(RGB_BUILTIN, 0, 0, 0);  // Off / black

  rgb_led.setPixelColor(0, rgb_led.Color(255, 165, 0));
  rgb_led.show();
  delay(1000);
  rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
  rgb_led.show();
}

void short_section(int num) {
  for (int i = 0; i < num; i++) {
    short_yellow();
    if (i < (num - 1)) { // still have more short flashes to go
      delay(250);
    }
  }
  delay(1000);
}

void long_section(int num) {
  for (int i = 0; i < num; i++) {
    long_yellow();
    if (i < (num - 1)) { // still have more long flashes to go
      delay(250);
    }
  }
  delay(2600);
}

void one_one(int i) { // No previous code
  while (i > 0) {
    short_section(1);
    long_section(1);
    i--;
  }
}

void one_two(int i) { // blower on after power up
  while (i > 0) {
    short_section(1);
    long_section(2);
    i--;    
  }

}
void one_three(int i) { //Limit or Flame roll out switch
  while (i > 0) {
    short_section(1);
    long_section(3); 
    i--;
  }
}

void one_four(int i) { // Ignition lockout
  while (i > 0) {
    short_section(1);
    long_section(4);  
    i--;
  }
}
void two_one(int i) { //Gas heating lockout
  while (i > 0) {
    short_section(2);
    long_section(1);
    i--;
  }
}
void two_two(int i) { //Abnormal flame proving signal
  while (i > 0) {
    short_section(2);
    long_section(2);
    i--;
  }
}
void two_three(int i) { //Pressure switch didn't open
  while (i > 0) {
    short_section(2);
    long_section(3);
    i--;
  }
}
void three_three(int i) { //Pressure switch didn't open
  while (i > 0) {
    short_section(3);
    long_section(3);
    i--;
  }
}


void loop() {
#ifdef RGB_BUILTIN

  // one_one();
  // one_two();
  one_three(3);
  three_three(3);
  two_three(3);
  one_four(3);
  
#endif
}


// -----------------------------------------------------------------  Austin's Code from Demmo Day ----------------------------------------------------------------------------------------
// #include <Adafruit_NeoPixel.h>
// // Define the LED pin (GPIO8 is used for the built-in addressable RGB LED)
// #define LED_PIN 8       
// #define NUM_LEDS 1  

// // Create an instance of the NeoPixel library
// Adafruit_NeoPixel rgb_led(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// void setup() {

//   Serial.begin(115200);
//   delay(1000);
//   // Serial.println("-------------------setup workedd------------------------");
//   rgb_led.begin();
//   rgb_led.setPixelColor(0, rgb_led.Color(52, 21, 57)); // initial purple
//   rgb_led.show();

  
// }

// void short_flash() {
//   rgb_led.setPixelColor(0, rgb_led.Color(255, 165, 0));
//   rgb_led.show();
//   delay(300);
//   rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
//   rgb_led.show();

//   delay(300);
// }

// void long_flash() {
//   rgb_led.setPixelColor(0, rgb_led.Color(255, 165, 0));
//   rgb_led.show();
//   delay(1000);
//   rgb_led.setPixelColor(0, rgb_led.Color(0, 0, 0));
//   rgb_led.show();

//   delay(300);
// }

// void loop() {
//   short_flash();

//   delay(700);

//   long_flash();
//   long_flash();

//   delay(2000);

//   short_flash();
//   short_flash();
//   short_flash();

//   delay(700);
  
//   long_flash();
//   long_flash();
//   long_flash();

//   delay(2000);

//   short_flash();
//   short_flash();

//   delay(700);
  
//   long_flash();
//   long_flash();
//   long_flash();

//   delay(2000);
// }