import 'dotenv/config';

export default ({ config }) => ({
  ...config,

  name: 'hvac-smart-app',
  slug: 'hvac-smart-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.hvac-smart-app',
    infoPlist: {
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
    },
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    permissions: [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
    ],
    package: 'com.anonymous.hvacsmartapp',
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    ['react-native-ble-plx'],
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-secure-store',
  ],

  experiments: { typedRoutes: true },

  extra: {
    FIREBASE_API_KEY:            process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN:        process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID:         process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET:     process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID:process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID:             process.env.FIREBASE_APP_ID,

    router: { origin: false },
    eas:   { projectId: '7e2f5a51-31bd-49de-91a6-f4b5d10c8700' },
  },

  owner: 'msmith22',
});
