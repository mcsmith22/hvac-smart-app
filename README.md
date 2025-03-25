# hvac-smart-app
App for displaying data from our HVAC smart solution. -- CAPSTONE CREATE-X

helpful project tutorial/resource:
https://expo.dev/blog/how-to-build-a-bluetooth-low-energy-powered-expo-app

CALVINS TUTORIAL to get app running on yalls laptop/phone:
This is the BLE github:https://github.com/dotintent/react-native-ble-plx/blob/master/README.md
Using this is why we need a Dev build

1) npm install
2) Install bluetooth package | npm (or npx?) install react-native-ble-plx | more info on the gitub linked above
3) Switch to development build | npx expo install expo-dev-client
(I ran this at some point in troubleshooting connection, but I dont use an eas build so I would wait to use this unless errors come up (npm install -g eas-cli))
4) To see if this runs without a physical device, try npx expo run:ios
5) To run on physical device, start with npx expo prebuild | follow this tutorial https://www.youtube.com/watch?v=s0gdh418OCQ



## Prerequisites

- **Node.js & npm:**  
  Download and install from [nodejs.org](https://nodejs.org/). npm comes bundled with Node.js.

- **Visual Studio Code:**  
  Download and install VSCode from [code.visualstudio.com](https://code.visualstudio.com/).

- **Expo Go:**  
  For testing on physical devices, install the Expo Go app:  
  - [iOS (App Store)](https://apps.apple.com/us/app/expo-go/id982107779)  
  - [Android (Google Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent)
