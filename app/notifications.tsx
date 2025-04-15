import { useEffect } from 'react';
import PushNotificationIOS from "@react-native-community/push-notification-ios";

export function requestNotis() {
    console.log("notis requested ------------")
    try {
        PushNotificationIOS.requestPermissions()
        console.log("PushNotificationIOS permissions granted:")
    } catch (error) {
        console.error("PushNotificationIOS permissions error:", error)
    }
}

// export function sendTest() {
//     const request = {
//     id: 'test-notification-' + Date.now(),
//     title: 'Per woj bro hes back bro hes back',
//     subtitle: 'Test Notification', // optional subtitle
//     body: 'Notification from sendTest',
//     // Badge number for the app icon (optional).
//     badge: 1,
//     sound: 'default',
//     userInfo: { extraData: 'any extra info you need' },
//     };
//     PushNotificationIOS.addNotificationRequest(request);
// }

const Dummy = () => null;
export default Dummy;