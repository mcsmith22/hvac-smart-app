# This file is executed on every boot (including wake-boot from deepsleep)
#import esp
#esp.osdebug(None)
#import webrepl
#webrepl.start()
from config import COSMOS_HOST, MASTER_KEY_B64, FUNCTION_URL


import network
import time
import ntptime
import urequests
import ubinascii
import hashlib
from time import sleep
from machine import Pin, I2C, SoftI2C

# wifis = {"Austin’s iPhone 14": "jifspoon", " Unit1507": "Unit1507@2024"}
wifis = {"Austin’s iPhone 14": "jifspoon"}

resource_type = "docs"
resource_link = "dbs/ColorsDB/colls/ColorReadings"
database_id = "ColorsDB"
collection_id = "ColorReadings"
url = f"https://{COSMOS_HOST}/dbs/{database_id}/colls/{collection_id}/docs"

def scan_wifi():
    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(True)

    networks = sta_if.scan()
    
    for net in networks:
        ssid_bytes, bssid, channel, rssi, authmode, hidden = net
        ssid = ssid_bytes.decode('utf-8')
        
        print("SSID:", ssid)
        print("  RSSI:", rssi)
        print("  Channel:", channel)
        print("  Authmode:", authmode)
        print("  Hidden:", hidden)
        print()

        if ssid in wifis:
        print(ssid)
        return ssid

def connect_wifi(known):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        wlan.connect(known, wifis[known])
        while not wlan.isconnected():
            time.sleep(1)
    print("WiFi connected:", known, " ", wlan.ifconfig())

def hmac_sha256(key, msg):
    # (Same code as above)
    block_size = 64
    if len(key) > block_size:
        key = hashlib.sha256(key).digest()
    if len(key) < block_size:
        key = key + b'\x00' * (block_size - len(key))
    o_key_pad = bytes([k ^ 0x5C for k in key])
    i_key_pad = bytes([k ^ 0x36 for k in key])
    inner_hash = hashlib.sha256(i_key_pad + msg).digest()
    return hashlib.sha256(o_key_pad + inner_hash).digest()

def create_auth_token(verb, resource_type, resource_id, date_string, master_key_b64):
    lower_payload = (verb.lower() + "\n" +
                    resource_type.lower() + "\n" +
                    resource_id + "\n" +
                    date_string.lower() + "\n\n")
    key = ubinascii.a2b_base64(master_key_b64)
    raw_hmac = hmac_sha256(key, lower_payload.encode('utf-8'))
    sig_b64 = ubinascii.b2a_base64(raw_hmac).strip()
    return "type=master&ver=1.0&sig=" + sig_b64.decode('utf-8')

def rfc1123_date_now():
    wdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    t = time.gmtime()
    year, month, mday, hour, minute, second, wday_idx, _ = t[:8]
    date = f"{wdays[wday_idx]}, {mday:02d} {months[month-1]} {year} {hour:02d}:{minute:02d}:{second:02d} GMT"
    # print(date)
    return date, [year, month, f"{mday:02d}", f"{hour:02d}", f"{minute:02d}", f"{second:02d}"]

def classify_color(r, g, b):
    if r - (g + b) > 50:
        return "Red"
    elif g - (r + b) > 50:
        return "Green"
    elif abs(r - g) < 60 and r > 100 and g > 100:
        return "Yellow"
    return "Unknown"

def scale_to_8bit(value, max_value=65535):
    return int((value / max_value) * 255)

def main():
    known = None
    while known is None:
    known = scan_wifi()
    connect_wifi(known)
    ntptime.settime() # gets current time, arduino doesnt keep clock updated

    sleep(2)

    while True:
        i2c = SoftI2C(scl=Pin(22), sda=Pin(21), freq=400000) # connecting to rgb sensor
        devices = i2c.scan()
        addr = None
        if len(devices) == 0:
            print("No I2C devices found.")
        else:
            print("I2C addresses found:", [hex(dev) for dev in devices])
            addr = devices[0]

        # Set device registers to read RGB
        i2c.writeto_mem(addr, 0x01, b'\x05')

        while True:
            color_vals = [[], [], []]
            for i in range(3):
            raw_data = i2c.readfrom_mem(addr, 0x09, 6)
            # print(raw_data.hex())
        
            g_value = (raw_data[1] << 8) | raw_data[0]
            r_value = (raw_data[3] << 8) | raw_data[2]
            b_value = (raw_data[5] << 8) | raw_data[4]
            
            r_8bit = scale_to_8bit(r_value)
            g_8bit = scale_to_8bit(g_value)
            b_8bit = scale_to_8bit(b_value)

            color_vals[0].append(r_8bit)
            color_vals[1].append(g_8bit)
            color_vals[2].append(b_8bit)

            r_8bit = sum(color_vals[0]) // 3
            g_8bit = sum(color_vals[1]) // 3
            b_8bit = sum(color_vals[2]) // 3
            
            hex_color = "#{:02X}{:02X}{:02X}".format(r_8bit, g_8bit, b_8bit)
        
            color_name = classify_color(r_8bit, g_8bit, b_8bit)
            
            # Print results
            # print("16-bit RGB:", r_value, g_value, b_value)
            print("8-bit RGB:", r_8bit, g_8bit, b_8bit)
            # print("Hex Color:", hex_color)
            print("Color Name:", color_name)

            if color_name != "Unknown":
            date_header, category_info = rfc1123_date_now()
        
            auth_token = create_auth_token("POST", resource_type, resource_link, date_header, MASTER_KEY_B64)

            formatted_date = f"{category_info[0]}-{category_info[1]}-{category_info[2]}-{category_info[3]}-{category_info[4]}-{category_info[5]}"
            # headers = {
            #     "Authorization": auth_token,
            #     "x-ms-date": date_header,
            #     "x-ms-version": "2018-12-31",
            #     "Content-Type": "application/json",
            #     "x-ms-documentdb-is-upsert": "True",
            #     "x-ms-documentdb-partitionkey": f"[\"testArduino\"]"
            # }

            headers = {
                "Content-Type": "application/json"
            }

        
            body = f'{{"id":"testArduino-{formatted_date}", "date_of_req": "{formatted_date}", "deviceId": "testArduino", "color": "{color_name}"}}'
            
            print(headers)
            print(body)
            
            # resp = urequests.post(url, data=body, headers=headers)
            # print("Status:", resp.status_code)
            # print("Body:", resp.text)
            # resp.close()

            resp = urequests.post(FUNCTION_URL, data=body, headers=headers) ## this is the major difficulty 
            print("Status:", resp.status_code)
            print("Body:", resp.text)
            resp.close()
            
            sleep(0.1)
        
main()