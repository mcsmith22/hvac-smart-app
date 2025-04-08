import { Buffer } from 'buffer';

const wifiServiceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const wifiCharacteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

export async function scanNetworks(connectedDevice) {
    console.log("________MADE It to the wifi function callllll______________")
    const dataToSend = `SCANNN`;
    try {
        const computedBase64Data = Buffer.from(dataToSend, 'utf8').toString('base64');
        console.log('Computed Base64 data:', computedBase64Data);
        const result = await connectedDevice.writeCharacteristicWithResponseForService(
            wifiServiceUUID,
            wifiCharacteristicUUID,
            computedBase64Data
        );
        console.log('Data successfully written:');
        return result;
    } catch (error) {
        console.error("Error during scanNetworks:", error);
        throw error;
    }
}

const Dummy = () => null;
export default Dummy;

