import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { auth } from "../.expo/config/firebase";


type SystemStatus = "good" | "warning" | "failure";
interface TelemetryDoc {
  ts: Timestamp;
  amp: number;
  gasPpm: number;
  flashSequence: string;
}
interface DeviceMeta {
  id: string;
  deviceBrand?: string;
  deviceName?: string;
  location?: string;
}
interface DeviceCard extends DeviceMeta {
  ts: string;
  amp: number;
  gasPpm: number;
  status: SystemStatus;
  errorDetail?: string;
}


const statusPalette = {
  good: { color: "#32D74B", icon: "checkmark-circle" },
  warning: { color: "#FFCC00", icon: "alert-circle" },
  failure: { color: "#FF453A", icon: "close-circle" },
} as const;

const deriveStatus = (
  err: string | undefined,
  gas: number,
): SystemStatus => {
  if (err) {
    const first = err.split(" ")[0].replace(":", "").toLowerCase();
    if (first === "failure") return "failure";
    if (first === "warning") return "warning";
  }
  return gas < 0 ? "warning" : "good";
};

const fetchUserDevices = async () => {
  const user = auth.currentUser;
  if (!user) return [] as DeviceMeta[];
  const db = getFirestore();
  const snap = await getDocs(collection(db, "users", user.uid, "devices"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DeviceMeta[];
};

const fetchLatestTelemetry = async (
  db: ReturnType<typeof getFirestore>,
  id: string,
) => {
  const ref = collection(db, "devices", id, "telemetry");
  const q = query(ref, orderBy("ts", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const t = snap.docs[0].data() as TelemetryDoc;
  return {
    amp: t.amp,
    gasPpm: t.gasPpm,
    flashSequence: t.flashSequence,
    ts: t.ts.toDate().toISOString(),
  } as const;
};

const fetchDevices = async (): Promise<DeviceCard[]> => {
  const db = getFirestore();
  const basics = await fetchUserDevices();
  const pairs = await Promise.all(
    basics.map(async (d) => ({ d, t: await fetchLatestTelemetry(db, d.id) })),
  );
  const out: DeviceCard[] = [];
  for (const { d, t } of pairs) {
    if (!t) continue;
    let combined: DeviceCard = { ...d, ...t } as DeviceCard;
    if (d.deviceBrand && t.flashSequence) {
      const codeSnap = await getDoc(
        doc(db, "codes", d.deviceBrand, "CODES", t.flashSequence),
      );
      if (codeSnap.exists()) combined.errorDetail = codeSnap.data().error;
    }
    combined.status = deriveStatus(combined.errorDetail, combined.gasPpm);
    out.push(combined);
  }
  return out;
};

const isConnected = (d: DeviceCard) =>
  Date.now() - new Date(d.ts).getTime() <= 30 * 60000;


interface NavItem {
  name: string;
  icon: string;
  route: string;
}
const tabs: NavItem[] = [
  { name: "Home", icon: "home", route: "/home" },
  { name: "Devices", icon: "list", route: "/devices" },
  { name: "Power", icon: "stats-chart", route: "/powergraphs" },
  { name: "Alerts", icon: "notifications", route: "/alerts" },
  { name: "Settings", icon: "settings", route: "/settings" },
];
const BottomNav = () => {
  const router = useRouter();
  const segs = useSegments();
  const current = `/${segs.join("/")}`;
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        tw`flex-row justify-between bg-[#1C1C1E] px-4`,
        { paddingBottom: insets.bottom + 6, paddingTop: 6 },
      ]}
    >
      {tabs.map((it) => {
        const active = current.startsWith(it.route);
        return (
          <Pressable
            key={it.route}
            style={tw`flex-1 items-center`}
            onPress={() => {
              if (!active) router.replace(it.route);
            }}
          >
            <Ionicons
              name={it.icon}
              size={22}
              color={active ? "#0A84FF" : "#8E8E93"}
            />
            <Text
              style={tw`text-xs ${
                active ? "text-blue-500" : "text-gray-400"
              }`}
            >
              {it.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default function DevicesScreen() {
  const router = useRouter();
  const [devs, setDevs] = useState<DeviceCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setDevs(await fetchDevices());
      setLoading(false);
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const healthy = devs.filter((d) => d.status === "good").length;
  const warn = devs.filter((d) => d.status === "warning").length;
  const crit = devs.filter((d) => d.status === "failure").length;

  if (loading)
    return (
      <SafeAreaView style={tw`flex-1 bg-black`} edges={["top","left","right"]}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator />
        </View>
        <BottomNav />
      </SafeAreaView>
    );


  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Devices", animation: "none" }} />

      <ScrollView contentContainerStyle={tw`pb-20`}>

        <View style={tw`px-6 pt-4`}>
          <Text style={tw`text-4xl font-bold text-white`}>My Devices</Text>
          <Text style={tw`text-lg text-gray-400 mt-1`}>
            {devs.length} HVAC units connected
          </Text>

          {/* search / filter */}
          {/* <View style={tw`flex-row mt-6`}>
            <Pressable
              style={[
                tw`flex-row flex-1 mr-2 py-3 rounded-2xl items-center justify-center border`,
                { borderColor: "#555" },
              ]}
            >
              <Ionicons name="search" size={18} color="#8E8E93" />
              <Text style={tw`text-gray-400 ml-2`}>Search</Text>
            </Pressable>
            <Pressable
              style={[
                tw`flex-row flex-1 ml-2 py-3 rounded-2xl items-center justify-center border`,
                { borderColor: "#555" },
              ]}
            >
              <Ionicons name="filter" size={18} color="#8E8E93" />
              <Text style={tw`text-gray-400 ml-2`}>Filter</Text>
            </Pressable>
          </View> */}

          <View
            style={[
              tw`flex-row justify-between mt-6 p-4 rounded-3xl`,
              { backgroundColor: "#1C1C1E" },
            ]}
          >
            {[
              { label: "Healthy", value: healthy, color: "text-green-400" },
              { label: "Warning", value: warn, color: "text-yellow-400" },
              { label: "Critical", value: crit, color: "text-red-400" },
            ].map((c) => (
              <View key={c.label} style={tw`items-center flex-1`}>
                <Text style={tw`text-lg font-semibold ${c.color}`}>
                  {c.value}
                </Text>
                <Text style={tw`text-xs text-gray-400 mt-1`}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={tw`mt-8 px-6`}>
          {devs.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/device/${d.id}`)}
              style={[
                tw`mb-6 p-5 rounded-3xl`,
                { backgroundColor: "#1C1C1E" },
              ]}
            >

              <View style={tw`flex-row items-center justify-between`}>
                <View>
                  <Text style={tw`text-lg font-semibold text-white`}>
                    {d.deviceName || d.id}
                  </Text>
                  {!!d.location && (
                    <Text style={tw`text-sm text-gray-400`}>{d.location}</Text>
                  )}
                </View>

                <View style={tw`flex-row items-center`}>
                  <Ionicons
                    name="wifi"
                    size={18}
                    color={isConnected(d) ? "#32D74B" : "#FF453A"}
                    style={tw`mr-1`}
                  />
                  <Text
                    style={tw`text-sm ${
                      isConnected(d) ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isConnected(d) ? "Connected" : "Disconnected"}
                  </Text>
                </View>
              </View>

              <View style={tw`flex-row items-center mt-4`}>
                <View
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                    { backgroundColor: statusPalette[d.status].color + "20" },
                  ]}
                >
                  <Ionicons
                    name={statusPalette[d.status].icon}
                    size={20}
                    color={statusPalette[d.status].color}
                  />
                </View>
                <View>
                  <Text style={tw`text-base text-white`}>
                    {d.status === "good"
                      ? "System Running Normally"
                      : d.status === "warning"
                      ? "Maintenance Required"
                      : "Failure"}
                  </Text>
                  {d.status !== "good" && d.errorDetail && (
                    <Text style={tw`text-xs text-gray-400 mt-1`}>
                      {d.errorDetail}
                    </Text>
                  )}
                </View>
              </View>

              <View style={tw`flex-row mt-4`}>
                <Text style={tw`text-gray-400 mr-1`}>Amp</Text>
                <Text style={tw`text-blue-500 mr-4`}>
                  {d.amp.toFixed(2)} A
                </Text>
                <Text style={tw`text-gray-400 mr-1`}>Gas</Text>
                <Text style={tw`text-blue-500`}>{d.gasPpm.toFixed(1)} ppm</Text>
              </View>
            </Pressable>
          ))}

          <Pressable
            onPress={() => router.replace("/bleconnect")}
            style={tw`mt-4 items-center`}
          >
            <Text style={tw`text-blue-500 underline text-lg`}>
              Add New Device
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
