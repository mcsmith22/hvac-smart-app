import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
  where,
} from "firebase/firestore";
import { auth } from "../.expo/config/firebase";

type SystemStatus = "good" | "warning" | "failure";
interface FirestoreTelemetry {
  ts: Timestamp;
  amp: number;
  gasPpm: number;
  flashSequence: string;
  expireAt: Timestamp;
}
interface FirestoreDeviceData {
  id: string;
  deviceBrand?: string;
  deviceName?: string;
  location?: string;
}
interface CombinedDeviceData extends FirestoreDeviceData {
  ts: string;
  amp: number;
  gasPpm: number;
  flashSequence: string;
  status: SystemStatus;
  errorDetail?: string;
  solutionSteps?: string;
}
interface AlertItem {
  id: string;
  title: string;
  message: string;
}

const statusPalette = {
  good: { color: "#32D74B", text: "Good", icon: "checkmark-circle" },
  warning: { color: "#FFCC00", text: "Warning", icon: "alert-circle" },
  failure: { color: "#FF453A", text: "Failure", icon: "close-circle" },
} as const;

const deriveStatus = (err: string | undefined, gas: number): SystemStatus => {
  let s: SystemStatus = "good";
  if (err) {
    const first = err.split(" ")[0].replace(":", "").toLowerCase();
    if (first === "failure") s = "failure";
    else if (first === "warning") s = "warning";
  }
  if (gas < 0 && s !== "failure") s = "warning";
  return s;
};

const fetchUserDevices = async (): Promise<FirestoreDeviceData[]> => {
  const user = auth.currentUser;
  if (!user) return [];
  const db = getFirestore();
  const snap = await getDocs(collection(db, "users", user.uid, "devices"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestoreDeviceData[];
};

const fetchLatestTelemetry = async (
  db: ReturnType<typeof getFirestore>,
  id: string,
) => {
  const ref = collection(db, "devices", id, "telemetry");
  const q = query(ref, orderBy("ts", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const t = snap.docs[0].data() as FirestoreTelemetry;
  return {
    amp: t.amp,
    gasPpm: t.gasPpm,
    flashSequence: t.flashSequence,
    ts: t.ts.toDate().toISOString(),
  } as const;
};

const fetchDevices = async (): Promise<CombinedDeviceData[]> => {
  const db = getFirestore();
  const basics = await fetchUserDevices();
  const pairs = await Promise.all(
    basics.map(async (d) => ({ d, t: await fetchLatestTelemetry(db, d.id) })),
  );
  const out: CombinedDeviceData[] = [];
  for (const { d, t } of pairs) {
    if (!t) continue;
    let combined: CombinedDeviceData = { ...d, ...t } as CombinedDeviceData;
    if (d.deviceBrand && t.flashSequence) {
      const snap = await getDoc(
        doc(db, "codes", d.deviceBrand, "CODES", t.flashSequence),
      );
      if (snap.exists()) {
        const code = snap.data();
        combined.errorDetail = code.error;
        combined.solutionSteps = code.steps;
      }
    }
    combined.status = deriveStatus(combined.errorDetail, combined.gasPpm);
    out.push(combined);
  }
  return out;
};

const startOfTodayTS = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
};
const kWhForDeviceToday = async (id: string, V = 120) => {
  const db = getFirestore();
  const ref = collection(db, "devices", id, "telemetry");
  const q = query(ref, where("ts", ">=", startOfTodayTS()), orderBy("ts", "asc"));
  const snap = await getDocs(q);
  if (snap.size < 2) return 0;
  let wh = 0,
    prev: FirestoreTelemetry | null = null;
  snap.forEach((s) => {
    const cur = s.data() as FirestoreTelemetry;
    if (prev)
      wh +=
        ((cur.amp + prev.amp) / 2) *
        V *
        (cur.ts.toDate().getTime() - prev.ts.toDate().getTime()) /
        3.6e6;
    prev = cur;
  });
  return wh / 1000;
};

const useWeather = () => {
  const [st, setSt] = useState<{
    t: number | null;
    h: number | null;
    loading: boolean;
  }>({ t: null, h: null, loading: true });

  useEffect(() => {
    let cancel = false;
    if (Platform.OS === "web") {
      setSt({ t: null, h: null, loading: false });
      return;
    }
    (async () => {
      try {
        const L = await import("expo-location");
        const { status } = await L.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error();
        const p = await L.getCurrentPositionAsync({});
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude}&longitude=${p.coords.longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`,
        );
        const j = await res.json();
        if (!cancel)
          setSt({
            t: Math.round(j.current.temperature_2m),
            h: Math.round(j.current.relative_humidity_2m),
            loading: false,
          });
      } catch {
        if (!cancel) setSt({ t: null, h: null, loading: false });
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return st;
};

interface NavItem {
  name: string;
  icon: string;
  route: string;
}
const navItems: NavItem[] = [
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
      {navItems.map((it) => {
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

export default function HomeScreen() {
  const router = useRouter();
  const { t, h, loading: wLoad } = useWeather();

  const [devices, setDevices] = useState<CombinedDeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kWh, setKWh] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchDevices();
        setDevices(list);
        const vals = await Promise.all(
          list.map((d) => kWhForDeviceToday(d.id)),
        );
        setKWh(Number(vals.reduce((a, b) => a + b, 0).toFixed(2)));
        setError(null);
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const isConnected = (d: CombinedDeviceData) =>
    Date.now() - new Date(d.ts).getTime() <= 30 * 60000;

  const overallStatus: SystemStatus = useMemo(
    () =>
      devices.reduce<SystemStatus>((acc, d) => {
        if (d.status === "failure") return "failure";
        if (d.status === "warning" && acc !== "failure") return "warning";
        return acc;
      }, "good"),
    [devices],
  );

  const pinnedDevice = useMemo(() => {
    if (!devices.length) return undefined;
    return devices.reduce((l, d) =>
      new Date(d.ts) > new Date(l.ts) ? d : l,
    );
  }, [devices]);

  const alerts: AlertItem[] = devices
    .filter((d) => d.status === "failure")
    .map((d) => ({
      id: d.id,
      title: "Failure",
      message: `${d.deviceName || d.id} reporting failure`,
    }));

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    return hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const Metric = ({
    icon,
    value,
    label,
  }: {
    icon: string;
    value: string;
    label: string;
  }) => (
    <View style={tw`flex-1 items-center py-6`}>
      <Ionicons name={icon} size={18} color="#0A84FF" />
      <Text style={tw`text-2xl font-semibold text-blue-500 mt-1`}>{value}</Text>
      <Text style={tw`text-xs text-gray-400 mt-1`}>{label}</Text>
    </View>
  );

  const Reading = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <View style={tw`flex-row mr-6 items-baseline`}>
      <Text style={tw`text-gray-400 text-sm mr-1`}>{label}</Text>
      <Text style={tw`text-blue-500 text-sm`}>{value}</Text>
    </View>
  );

  if (loading)
  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top","left","right"]}>
      <View style={tw`flex-1 items-center justify-center`}>
        <ActivityIndicator />
      </View>
      <BottomNav /> 
    </SafeAreaView>
  );

  if (error)
    return (
      <SafeAreaView style={tw`flex-1 bg-black`} edges={["top","left","right"]}>
        <View style={tw`flex-1 bg-black items-center justify-center px-6`}>
          <Text style={tw`text-red-400 text-center mb-4`}>{error}</Text>
          <Pressable
            onPress={() => setError(null)}
            style={tw`px-4 py-2 bg-blue-500 rounded-lg`}
          >
            <Text style={tw`text-white`}>Retry</Text>
          </Pressable>
        </View>
        <BottomNav />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={tw`flex-1 bg-[#0C0C0E]`} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "HVASee", animation: "none" }} />
      <ScrollView contentContainerStyle={tw`pb-28`}>

        <View style={tw`px-6 pt-2`}>
          <Text style={tw`text-4xl font-bold text-white`}>{greeting}</Text>
          <Text style={tw`text-lg text-gray-400 mt-1`}>
            {overallStatus === "good"
              ? "Your HVAC systems are running smoothly"
              : overallStatus === "warning"
              ? "Some devices require attention"
              : "Immediate action needed"}
          </Text>
        </View>

        <View
          style={[
            tw`mx-6 mt-6 p-5 rounded-3xl flex-row items-center`,
            { backgroundColor: "#1C1C1E" },
          ]}
        >
          <View
            style={[
              tw`w-12 h-12 rounded-full items-center justify-center mr-4`,
              { backgroundColor: statusPalette[overallStatus].color + "20" },
            ]}
          >
            <Ionicons
              name={statusPalette[overallStatus].icon}
              size={24}
              color={statusPalette[overallStatus].color}
            />
          </View>

          <View>
            <Text style={tw`text-xl font-semibold text-white`}>
              System Status
            </Text>
            <Text style={tw`text-sm text-gray-400`}>
              {devices.length} device{devices.length === 1 ? "" : "s"} monitored
            </Text>
          </View>
        </View>

        <View
          style={tw`mx-6 mt-6 flex-row bg-[#1C1C1E] rounded-3xl divide-x divide-gray-800`}
        >
          <Metric
            icon="thermometer"
            value={wLoad || t == null ? "--°" : `${t}°`}
            label="Outdoor"
          />
          <Metric
            icon="water"
            value={wLoad || h == null ? "--%" : `${h}%`}
            label="Humidity"
          />
          <Metric
            icon="flash"
            value={kWh == null ? "--" : kWh.toFixed(1)}
            label="kWh Today"
          />
        </View>

        <View style={tw`mx-6 mt-10`}>
          <Text style={tw`text-xl font-semibold text-white mb-4`}>
            Pinned Devices
          </Text>
            {pinnedDevice ? (
              <Pressable
                onPress={() => router.push(`/device/${pinnedDevice.id}`)}
                style={[tw`p-5 rounded-3xl`, { backgroundColor: "#1C1C1E" }]}
              >

                <View style={tw`flex-row items-center justify-between`}>
                  <View>
                    <Text style={tw`text-lg font-semibold text-white`}>
                      {pinnedDevice.deviceName || pinnedDevice.id}
                    </Text>
                    {!!pinnedDevice.location && (
                      <Text style={tw`text-sm text-gray-400`}>{pinnedDevice.location}</Text>
                    )}
                  </View>

                  <View style={tw`flex-row items-center`}>
                    <Ionicons
                      name="wifi"
                      size={18}
                      color={isConnected(pinnedDevice) ? "#32D74B" : "#FF453A"}
                      style={tw`mr-1`}
                    />
                    <Text
                      style={tw`text-sm ${
                        isConnected(pinnedDevice) ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {isConnected(pinnedDevice) ? "Connected" : "Disconnected"}
                    </Text>
                  </View>
                </View>


                <View style={tw`flex-row items-center mt-4`}>
                  <View
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                      { backgroundColor: statusPalette[pinnedDevice.status].color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={statusPalette[pinnedDevice.status].icon}
                      size={20}
                      color={statusPalette[pinnedDevice.status].color}
                    />
                  </View>
                  <Text style={tw`text-base text-white`}>
                    {pinnedDevice.status === "good"
                      ? "System Running Normally"
                      : pinnedDevice.status === "warning"
                      ? "Warning"
                      : "Failure"}
                  </Text>
                </View>


                <View style={tw`flex-row mt-4`}>
                  <Reading label="Amp" value={`${pinnedDevice.amp.toFixed(2)} A`} />
                  <Reading label="Gas" value={`${pinnedDevice.gasPpm.toFixed(0)} ppm`} />
                </View>
              </Pressable>
            ) : (
              <Text style={tw`text-gray-400`}>No devices yet</Text>
            )}
          <Pressable
            style={tw`mt-4 items-center`}
            onPress={() => router.replace("/devices")}
          >
            <Text style={tw`text-blue-500 underline`}>View All Devices</Text>
          </Pressable>
        </View>

        <View style={tw`mx-6 mt-10`}>
          <Text style={tw`text-xl font-semibold text-white mb-4`}>
            Urgent Alerts
          </Text>

          {alerts.length === 0 ? (
            <Text style={tw`text-gray-400`}>No urgent alerts 🎉</Text>
          ) : (
            alerts.map((al) => (
              <View
                key={al.id}
                style={[
                  tw`p-5 mb-4 rounded-3xl flex-row`,
                  { backgroundColor: "#1C1C1E" },
                ]}
              >
                <View
                  style={[
                    tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                    { backgroundColor: "#FF453A20" },
                  ]}
                >
                  <Ionicons name="alert" size={20} color="#FF453A" />
                </View>

                <View style={tw`flex-1`}>
                  <Text style={tw`text-base font-semibold text-white`}>
                    {al.title}
                  </Text>
                  <Text style={tw`text-sm text-gray-400 mt-1`}>
                    {al.message}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={tw`h-14`} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}
