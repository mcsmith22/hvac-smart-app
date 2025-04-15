// BLECallbacks.h
#ifndef BLE_CALLBACKS_H
#define BLE_CALLBACKS_H

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>


extern bool deviceConnected; // if needed in both files
extern bool callSetupWhenWifiConnected; // want to make this false, then set it to true when i want this to be ran in main file
extern String wifiNetworks;  // likewise if shared

class MyServerCallbacks : public BLEServerCallbacks {
public:
    void onConnect(BLEServer* pServer) override;
    void onDisconnect(BLEServer* pServer) override;
private:
    String scanForNetworks();
};

class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
public:
    void onWrite(BLECharacteristic* pCharacteristic) override;
    String scanForNetworks2();
};
void setSetupWhenWifiConnected();
bool getSetupWhenWifiConnected();

#endif // BLE_CALLBACKS_H
