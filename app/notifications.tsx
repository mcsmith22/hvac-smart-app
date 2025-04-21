import { useEffect } from 'react';
import PushNotificationIOS from "@react-native-community/push-notification-ios";

export function requestNotis() {
    console.log("notis requested ------------")
    try {
        PushNotificationIOS.requestPermissions()
        console.log("PushNotificationIOS permissions granted:")
        return true
    } catch (error) {
        console.error("PushNotificationIOS permissions error:", error)
        return false
    }
}

export function sendTest(notifinfo, b, subtitle_) {
    const request = {
    id: 'test-notification-' + Date.now(),
    title: notifinfo,
    subtitle: subtitle_, // optional subtitle
    body: b,
    badge: 1, // Badge number for the app icon (optional). We would use this if we know the number of notifications that have built up
    sound: 'default',
    // category: '', this is something I need to add if I want an 'actionable' notififcation, meaning they would be able to click it to route to the device page?
    userInfo: { extraData: 'any extra info you need' },
    };
    PushNotificationIOS.addNotificationRequest(request);
}

const Dummy = () => null;
export default Dummy;