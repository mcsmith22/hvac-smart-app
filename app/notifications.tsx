import { useEffect } from 'react';
import PushNotificationIOS from "@react-native-community/push-notification-ios";

export function requestNotis() {
    console.log("notis requested ------------")
    PushNotificationIOS.requestPermissions().then(
        (data) => console.log("PushNotificationIOS permissions granted:", data),
        (error) => console.error("PushNotificationIOS permissions error:", error)
    );
}
// export function sendTest() {
//     const onNotification = (blah) => {
//         console.log("Notification received:", notification);
//     };
// }

const Dummy = () => null;
export default Dummy;