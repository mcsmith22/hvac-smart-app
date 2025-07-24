import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';

export async function addDeviceForUser(userId: string, deviceId: string, deviceName: string, deviceBrand: string) {
  try {
    const deviceRef = doc(db, "users", userId, "devices", deviceId);
    await setDoc(deviceRef, { deviceName, deviceBrand });
    console.log("Device info saved successfully.");
    
  } catch (error) {
    console.error("Error saving device info:", error);
  }
}
