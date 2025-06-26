import React, { useEffect, useMemo, useState } from "react";
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
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from "firebase/firestore";
import { auth } from "../.expo/config/firebase";

type Level = "critical" | "warning" | "info";
interface AlertDoc {
  id: string;
  ts?: { seconds: number };
  level: Level;
  title: string;
  message: string;
}

const levelPalette = {
  critical: { color: "#FF453A", icon: "alert-circle" },
  warning:  { color: "#FFCC00", icon: "alert" },
  info:     { color: "#0A84FF", icon: "information-circle" },
} as const;

const tabs = [
  { name: "Home",    icon: "home",          route: "/home" },
  { name: "Devices", icon: "list",          route: "/devices" },
  { name: "Power",   icon: "stats-chart",   route: "/powergraphs" },
  { name: "Alerts",  icon: "notifications", route: "/alerts" },
  { name: "Settings",icon: "settings",      route: "/settings" },
] as const;

const BottomNav = () => {
  const router = useRouter();
  const segs   = useSegments();
  const here   = `/${segs.join("/")}`;
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        tw`flex-row justify-between bg-[#1C1C1E] px-4`,
        { paddingBottom: insets.bottom + 6, paddingTop: 6 },
      ]}
    >
      {tabs.map(t => {
        const active = here.startsWith(t.route);
        return (
          <Pressable
            key={t.route}
            style={tw`flex-1 items-center`}
            onPress={() => !active && router.replace(t.route)}
          >
            <Ionicons
              name={t.icon}
              size={22}
              color={active ? "#0A84FF" : "#8E8E93"}
            />
            <Text style={tw`text-xs ${active ? "text-blue-500" : "text-gray-400"}`}>
              {t.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const fetchDeviceIds = async () => {
  const user = auth.currentUser;
  if (!user) return [] as string[];
  const db   = getFirestore();
  const snap = await getDocs(collection(db, "users", user.uid, "devices"));
  return snap.docs.map(d => d.id);
};

const fetchAllAlerts = async (): Promise<AlertDoc[]> => {
  const db   = getFirestore();
  const ids  = await fetchDeviceIds();
  const out: AlertDoc[] = [];

  for (const id of ids) {
    const ref = collection(db, "devices", id, "alerts");
    const q   = query(ref, orderBy("ts", "desc"));
    const snap = await getDocs(q);
    snap.forEach(d => {
      const data = d.data() as Omit<AlertDoc, "id">;

      if (!data.ts) data.ts = { seconds: Math.floor(Date.now() / 1000) };

      out.push({ id: d.id, ...data });
    });
  }
  return out;
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Level | "all">("all");

    useEffect(() => {
    let cancel = false;

    const load = async () => {
      setLoading(true);
      try {
        const list = await fetchAllAlerts();
        if (!cancel) setAlerts(list);
      } catch (err) {
        console.error("fetchAllAlerts", err);
        if (!cancel) setAlerts([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 60000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, []);


  const filtered = useMemo(
    () => alerts.filter(a => filter === "all" || a.level === filter),
    [alerts, filter],
  );

  const markResolved = async (a: AlertDoc) => {

    setAlerts(prev => prev.filter(p => p.id !== a.id));

    try {
      const ids = await fetchDeviceIds();
      const db  = getFirestore();
      for (const did of ids) {
        await deleteDoc(doc(db, "devices", did, "alerts", a.id));
      }
    } catch (err) {
      console.error("delete alert", err);
    }
  };

  const FilterTab = ({ label, val }:{label:string; val:Level|"all"}) => (
    <Pressable
      onPress={() => setFilter(val)}
      style={[
        tw`px-4 py-2 mr-2 rounded-2xl`,
        val===filter ? { backgroundColor:"#0A84FF" }:{ backgroundColor:"#1C1C1E" },
      ]}
    >
      <Text style={tw`font-semibold ${val===filter?"text-white":"text-gray-300"}`}>
        {label}
      </Text>
    </Pressable>
  );

  const ago = (secs:number) => {
    const diff = Date.now() - secs*1000;
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    return h ? `${h}h ago` : `${m}m ago`;
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top","left","right"]}>
      <Stack.Screen options={{ title:"Notifications", animation:"none" }} />

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={tw`pb-20`}>

          <View style={tw`px-6 pt-4`}>
            <Text style={tw`text-4xl font-bold text-white`}>Notifications</Text>
            <Text style={tw`text-lg text-gray-400 mt-1`}>
              {alerts.length} unresolved alerts
            </Text>

            <View style={tw`flex-row mt-6`}>
              <FilterTab label="All"      val="all"      />
              <FilterTab label="Critical" val="critical" />
              <FilterTab label="Warning"  val="warning"  />
              <FilterTab label="Info"     val="info"     />
            </View>
          </View>

          <View style={tw`mt-6 px-6`}>
            {filtered.length === 0 ? (
              <Text style={tw`text-gray-400`}>No alerts 🎉</Text>
            ) : (
              filtered.map(a => (
                <View
                  key={a.id}
                  style={[
                    tw`mb-6 p-5 rounded-3xl`,
                    {
                      backgroundColor: "#1C1C1E",
                      borderLeftWidth: 4,
                      borderLeftColor: levelPalette[a.level].color,
                    },
                  ]}
                >
                  <View style={tw`flex-row items-center`}>
                    <View
                      style={[
                        tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                        { backgroundColor: levelPalette[a.level].color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={levelPalette[a.level].icon}
                        size={20}
                        color={levelPalette[a.level].color}
                      />
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-base font-semibold text-white`}>
                        {a.title}
                      </Text>
                      <Text style={tw`text-sm text-gray-400 mt-1`}>
                        {a.message}
                      </Text>
                    </View>
                  </View>

                  <View style={tw`flex-row items-center justify-between mt-4`}>
                    <Text style={tw`text-gray-400 text-xs`}>
                      {a.ts ? ago(a.ts.seconds) : ""}
                    </Text>
                    <Pressable
                      onPress={() => markResolved(a)}
                      style={[
                        tw`px-4 py-1 rounded-2xl`,
                        { backgroundColor: "#0A84FF" },
                      ]}
                    >
                      <Text style={tw`text-white text-sm`}>Mark Resolved</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}
