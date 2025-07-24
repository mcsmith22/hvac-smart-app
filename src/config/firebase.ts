import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';


const testAsyncStorage = async () => {
  try {
    await AsyncStorage.setItem('testKey', 'testValue');
    const value = await AsyncStorage.getItem('testKey');
    console.log('AsyncStorage test value:', value);
  } catch (error) {
    console.error('AsyncStorage error:', error);
  }
};


const firebaseConfig = {
  apiKey: "AIzaSyANMLIWTuHEBZMhWioESiTGZZZTvq6Xaeg",
  authDomain: "hvasee-2b976.firebaseapp.com",
  projectId: "hvasee-2b976",
  storageBucket: "hvasee-2b976.firebasestorage.app",
  messagingSenderId: "19608840618",
  appId: "1:19608840618:web:75604d93e5448f736aa3d3",
  measurementId: "G-QG6DWBVYWG"
};


let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { app, auth, db };