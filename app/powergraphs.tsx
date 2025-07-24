import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryTheme,
} from "victory-native";
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  doc,
} from "firebase/firestore";
import { auth } from "../src/config/firebase";

interface Telemetry {
  ts: Timestamp;
  amp: number;
  gasPpm: number;
}

const tabs = [
  { name: "Home", icon: "home", route: "/home" },
  { name: "Devices", icon: "list", route: "/devices" },
  { name: "Power", icon: "stats-chart", route: "/powergraphs" },
  { name: "Alerts", icon: "notifications", route: "/alerts" },
  { name: "Settings", icon: "settings", route: "/settings" },
] as const;
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
            onPress={() => !active && router.replace(it.route)}
          >
            <Ionicons name={it.icon} size={22} color={active ? "#0A84FF" : "#8E8E93"} />
            <Text style={tw`text-xs ${active ? "text-blue-500" : "text-gray-400"}`}>
              {it.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const fetchDeviceIds = async (): Promise<string[]> => {
  const user = auth.currentUser;
  if (!user) return [];
  const db = getFirestore();
  const snap = await getDocs(collection(db, "users", user.uid, "devices"));
  return snap.docs.map((d) => d.id);
};

const bucketKey = (d: Date, range: Range): string =>
  range === "day"
    ? d.getHours().toString().padStart(2, "0")
    : d.toISOString().slice(0, 10);

type Range = "day" | "week" | "month";
interface Series { x: string | number; y: number }

const useAggregated = (range: Range) => {
  const [loading, setLoading] = useState(true);
  const [power, setPower] = useState<Series[]>([]);
  const [gas, setGas] = useState<Series[]>([]);
  const [lastAmp, setLastAmp] = useState<number>(0);
  const [lastGas, setLastGas] = useState<number>(0);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      try {
        const ids = await fetchDeviceIds();
        const db = getFirestore();
        const sinceDate =
          range === "day"
            ? new Date(Date.now() - 24 * 60 * 60 * 1000)
            : range === "week"
            ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const since = Timestamp.fromDate(sinceDate);

        const ampMap = new Map<string, number>();
        const gasMap = new Map<string, number>();

        for (const id of ids) {
          const ref = collection(db, "devices", id, "telemetry");
          const q = query(ref, where("ts", ">=", since), orderBy("ts"));
          const snap = await getDocs(q);
          snap.forEach((s) => {
            const d = s.data() as Telemetry;
            const key = bucketKey(d.ts.toDate(), range);
            ampMap.set(key, (ampMap.get(key) ?? 0) + d.amp);
            gasMap.set(key, (gasMap.get(key) ?? 0) + d.gasPpm);
          });
        }

        const sortedKeys = Array.from(ampMap.keys()).sort();
        const ampSeries: Series[] = sortedKeys.map((k, i) => ({
          x: range === "day" ? parseInt(k) : i + 1,
          y: ampMap.get(k)!,
        }));
        const gasSeries: Series[] = sortedKeys.map((k, i) => ({
          x: range === "day" ? parseInt(k) : i + 1,
          y: gasMap.get(k)!,
        }));

        if (!cancel) {
          setPower(ampSeries);
          setGas(gasSeries);
          if (ampSeries.length) setLastAmp(ampSeries[ampSeries.length - 1].y);
          if (gasSeries.length) setLastGas(gasSeries[gasSeries.length - 1].y);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    load();
    return () => {
      cancel = true;
    };
  }, [range]);

  return { loading, power, gas, lastAmp, lastGas };
};

const Tab = ({ label, val, cur, set }: any) => (
  <Pressable
    onPress={() => set(val)}
    style={[
      tw`flex-1 py-2 mx-1 rounded-2xl items-center`,
      val === cur ? { backgroundColor: "#0A84FF" } : { backgroundColor: "#1C1C1E" },
    ]}
  >
    <Text style={tw`font-semibold ${val === cur ? "text-white" : "text-gray-300"}`}>
      {label}
    </Text>
  </Pressable>
);

const TrendCard = ({
  title,
  unit,
  latest,
  color,
  data,
  bg,
}: {
  title: string;
  unit: string;
  latest: number;
  color: string;
  data: Series[];
  bg: string;
}) => (
  <View style={[tw`mb-6 p-4 rounded-3xl`, { backgroundColor: "#1C1C1E" }]}>
    <Text style={tw`text-lg font-semibold text-white mb-2`}>
      {title}{"  "}
      <Text style={{ color }}>{latest.toFixed(1)} {unit}</Text>
    </Text>
    {data.length < 2 ? (
      <Text style={tw`text-center text-gray-400 py-10`}>Not enough data</Text>
    ) : (
      <View style={[tw`overflow-hidden rounded-2xl`, { backgroundColor: bg }]}>
        <VictoryChart
          height={200}
          padding={{ left: 36, right: 20, top: 10, bottom: 30 }}
          domainPadding={{ y: 10 }}
          theme={VictoryTheme.material}
        >
          <VictoryLine data={data} style={{ data: { stroke: color } }} interpolation="monotoneX" />
          <VictoryScatter data={data} size={3} style={{ data: { fill: color } }} />
        </VictoryChart>
      </View>
    )}
  </View>
);

export default function PowerGraphs() {
  const [range, setRange] = useState<Range>("day");
  const { loading, power, gas, lastAmp, lastGas } = useAggregated(range);


const handleExport = async () => {

  const toLabel = (x: number | string) =>
    range === "day" ? `${x}:00` : x.toString();

  const rows = power.map((p, i) => ({
    time: toLabel(p.x),
    power: p.y.toFixed(3),
    gas: gas[i]?.y?.toFixed(3) ?? "",
  }));

  const header = "time,power_amp,gas_ppm";
  const csv = [header, ...rows.map(r => `${r.time},${r.power},${r.gas}`)].join("\n");

  const uri = FileSystem.cacheDirectory + `hvac_${range}_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: "text/csv" });
};

  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Historical Trends", animation: "none" }} />

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView contentContainerStyle={tw`pb-20`}>

          <View style={tw`px-6 pt-4`}>
            <Text style={tw`text-4xl font-bold text-white`}>Historical Trends</Text>
            <Text style={tw`text-lg text-gray-400 mt-1`}>
              Aggregate of all devices
            </Text>

            <View style={tw`flex-row items-center mt-6`}>
              <View style={tw`flex-row flex-1`}>
                <Tab label="Day" val="day" cur={range} set={setRange} />
                <Tab label="Week" val="week" cur={range} set={setRange} />
                <Tab label="Month" val="month" cur={range} set={setRange} />
              </View>
              <Pressable
                style={[
                  tw`ml-3 px-4 py-2 rounded-2xl flex-row items-center justify-center border`,
                  { borderColor: "#555" },
                ]}
                onPress={handleExport}
                >
                <Ionicons name="download" size={18} color="#8E8E93" />
                <Text style={tw`text-gray-300 ml-2`}>Export</Text>
              </Pressable>
            </View>
          </View>

          <View style={tw`mt-8 px-6`}>

            <TrendCard
              title="Power Draw"
              unit="A"
              latest={lastAmp}
              color="#FF9F0A"
              data={power}
              bg="#1A1206"
            />

            {/* <TrendCard
              title="Gas Levels"
              unit="PPM"
              latest={lastGas}
              color="#30D158"
              data={gas}
              bg="#002015"
            /> */}
            <View style={tw`h-12`} />
          </View>
        </ScrollView>
      )}

      <BottomNav />
    </SafeAreaView>
  );
}
