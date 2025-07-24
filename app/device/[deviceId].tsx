import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Dimensions,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import { auth } from "../../src/config/firebase";
import {
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryTheme,
  VictoryClipContainer
} from "victory-native";

type SystemStatus = "good" | "warning" | "failure";
interface TelemetryDoc {
  ts: Timestamp;
  amp: number;
  gasPpm: number;
  tempF: number;
  humidity: number;
  rpm: number;
}
interface MetaData {
  deviceBrand?: string;
  deviceName?: string;
  location?: string;
}
interface ScreenState {
  meta: MetaData;
  latest: TelemetryDoc | null;
  history: TelemetryDoc[];
  errorDetail?: string;
  solutionSteps?: string;
}

const statusPalette = {
  good: { color: "#32D74B", icon: "checkmark-circle" },
  warning: { color: "#FFCC00", icon: "alert-circle" },
  failure: { color: "#FF453A", icon: "close-circle" },
} as const;

const deriveStatus = (err: string | undefined, gas: number): SystemStatus => {
  if (err) {
    const first = err.split(" ")[0].replace(":", "").toLowerCase();
    if (first === "failure") return "failure";
    if (first === "warning") return "warning";
  }
  return gas < 0 ? "warning" : "good";
};

const fmt = (n: number | undefined | null, d = 1) =>
  n == null || isNaN(n) ? "--" : n.toFixed(d);

const useDeviceData = (deviceId: string | undefined) => {
  const [state, setState] = useState<ScreenState>({
    meta: {},
    latest: null,
    history: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    const db = getFirestore();
    const user = auth.currentUser;
    let cancel = false;

    const load = async () => {
      setLoading(true);
      try {
        const metaSnap = await getDoc(
          doc(db, "users", user!.uid, "devices", deviceId),
        );

        const teleRef = collection(db, "devices", deviceId, "telemetry");
        const latestSnap = await getDocs(
          query(teleRef, orderBy("ts", "desc"), limit(1)),
        );
        const latest = latestSnap.empty
          ? null
          : (latestSnap.docs[0].data() as TelemetryDoc);

        let errStr: string | undefined;
        let stepsStr: string | undefined;

        if (metaSnap.exists() && latest?.flashSequence) {
          const brand = (metaSnap.data() as MetaData).deviceBrand;
          if (brand) {
            const cdSnap = await getDoc(
              doc(db, "codes", brand, "CODES", latest.flashSequence),
            );
            if (cdSnap.exists()) {
              const cd = cdSnap.data();
              errStr = cd.error as string;
              stepsStr = cd.steps as string;
            }
          }
        }

        const since = Timestamp.fromDate(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        );
        const histSnap = await getDocs(
          query(teleRef, where("ts", ">=", since), orderBy("ts", "asc")),
        );
        const history = histSnap.docs.map((d) => d.data() as TelemetryDoc);

        if (!cancel)
          setState({
            meta: metaSnap.exists() ? (metaSnap.data() as MetaData) : {},
            latest,
            history,
            errorDetail: errStr,
            solutionSteps: stepsStr,
          });
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 15000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [deviceId]);

  return { ...state, loading };
};

const MetricBox = ({
  icon,
  value,
  label,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  accent: string;
}) => (
  <View
    style={[
      tw`mb-3 p-4 rounded-2xl items-center`,
      { backgroundColor: "#111113", width: "47%" },
    ]}
  >
    <Ionicons name={icon} size={18} color={accent} />
    <Text style={tw`text-xl font-semibold text-white mt-1`}>{value}</Text>
    <Text style={tw`text-xs text-gray-400 mt-1`}>{label}</Text>
  </View>
);
export default function DeviceScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const router = useRouter();
  const { meta, latest, history, loading, errorDetail, solutionSteps } = useDeviceData(deviceId);

const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);

const status: SystemStatus = deriveStatus(
  errorDetail,
  latest?.gasPpm ?? 0,
);

  const lastUpdated = latest
    ? new Date(latest.ts.toDate()).toLocaleTimeString()
    : "--";

  const now = new Date();
  const start = new Date(now.getTime() - 24*60*60*1000);

  const { width: screenW } = Dimensions.get("window");
  const chartW = screenW - 24 - 32;

  const gasData = history.map((h) => ({
    x: new Date(h.ts.toDate()),
    y: h.gasPpm,
  }));
  const ampData = history.map((h) => ({
    x: new Date(h.ts.toDate()),
    y: h.amp,
  }));

  if (!deviceId)
    return (
      <SafeAreaView style={tw`flex-1 bg-black items-center justify-center`} edges={["top","left","right"]}>
        <Text>No deviceId param</Text>
      </SafeAreaView>
    );

  if (loading)
    return (
      <SafeAreaView style={tw`flex-1 bg-black items-center justify-center`} edges={["top","left","right"]}>
        <ActivityIndicator />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={tw`flex-1 bg-black`} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: meta.deviceName || deviceId, animation: "slide_from_right" }} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={tw`px-6 pt-4`}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="white"
            onPress={() => router.back()}
          />
          <Text style={tw`text-4xl font-extrabold text-white mt-2`}>
            {meta.deviceName || deviceId}
          </Text>
          {!!meta.location && (
            <Text style={tw`text-lg text-gray-400`}>{meta.location}</Text>
          )}
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
              { backgroundColor: statusPalette[status].color + "20" },
            ]}
          >
            <Ionicons
              name={statusPalette[status].icon}
              size={24}
              color={statusPalette[status].color}
            />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-lg text-white`}>
              {status === "good"
                ? "System Running Normally"
                : status === "warning"
                ? "Warning"
                : "Failure"}
            </Text>
            <Text style={tw`text-xs text-gray-400 mt-2`}>
              Last updated: {lastUpdated}
            </Text>
          </View>
        </View>

        {status !== "good" && errorDetail && (
          <>
            <Pressable
              onPress={() => setUnitErrorsOpen((o) => !o)}
              style={[
                tw`mx-6 mt-4 p-4 rounded-3xl flex-row items-center justify-between`,
                { backgroundColor: "#1C1C1E" },
              ]}
            >
              <Text style={tw`text-base text-white flex-1`}>
                {errorDetail.split(" ").slice(1).join(" ")}
              </Text>
              <Ionicons
                name={unitErrorsOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#8E8E93"
              />
            </Pressable>

            {unitErrorsOpen && solutionSteps && (
              <View
                style={[
                  tw`mx-6 mt-4 p-4 rounded-3xl overflow-hidden`,
                  { backgroundColor: "#262628" },
                ]}
              >
                <Text style={tw`text-base font-semibold text-white mb-2`}>
                  Solution Steps
                </Text>
                {solutionSteps
                  .replace(/\\n/g, "\n")
                  .split("\n")
                  .map((line, i) => (
                    <Text key={i} style={tw`text-sm text-gray-300 mb-1`}>
                      • {line}
                    </Text>
                  ))}
              </View>
            )}
          </>
        )}

        {/* action buttons */}
        {/* <View style={tw`flex-row mx-6 mt-4`}>
          <Pressable
            style={[
              tw`flex-1 mr-2 py-4 rounded-2xl items-center`,
              { backgroundColor: "#0A84FF" },
            ]}
          >
            <Ionicons name="play" size={18} color="white" />
            <Text style={tw`text-white font-semibold mt-1`}>Run Diagnostic</Text>
          </Pressable>

          <Pressable
            style={[
              tw`flex-1 ml-2 py-4 rounded-2xl items-center border`,
              { borderColor: "#555" },
            ]}
          >
            <Ionicons name="reload" size={18} color="white" />
            <Text style={tw`text-white font-semibold mt-1`}>Restart</Text>
          </Pressable>
        </View> */}

        {latest && (
          <View
            style={[
              tw`mx-6 mt-8 p-4 rounded-3xl`,
              { backgroundColor: "#1C1C1E" },
            ]}
          >
            <Text style={tw`text-lg font-semibold text-white mb-4`}>
              Live Sensor Data
            </Text>

            <View style={tw`items-center justify-center w-full mt-2`}>
              <MetricBox
                icon="flash"
                value={`${fmt(latest?.amp, 2)}A`}
                label="Amperage"
                accent="#FF9F0A"
              />
              {/* <MetricBox
                icon="speedometer"
                value={`${fmt(latest?.gasPpm)}`}
                label="Gas PPM"
                accent="#30D158"
              /> */}
            </View>

            <Text style={tw`text-center text-xs text-gray-400 mt-4`}>
              Last updated: {lastUpdated}
            </Text>
          </View>
        )}

        <View style={tw`mx-6 mt-10`}>
          <Text style={tw`text-2xl font-semibold text-white`}>
            24-Hour Trends
          </Text>
        </View>

        {/* <View
          style={[
            tw`mx-6 mt-4 p-4 rounded-3xl overflow-hidden`,
            { backgroundColor: "#0D0D12" },
          ]}
        >
          <Text style={tw`text-lg font-semibold text-white mb-2`}>
            Gas PPM{"  "}
            <Text style={tw`text-blue-500`}>
              {fmt(latest?.gasPpm)}
            </Text>
          </Text>

          {gasData.length < 2 ? (
            <Text style={tw`text-gray-400 text-center py-8`}>
              Not enough data
            </Text>
          ) : (
            <VictoryChart
              theme={VictoryTheme.material}
              height={200}
              width={chartW}
              padding={{ left: 40, right: 20, top: 10, bottom: 30 }}
              domainPadding={{ y: 10 }}
              scale={{ x: "time" }}
              domain={{ x: [start, now] }}
              groupComponent={
                <VictoryClipContainer clipPadding={{ top: 0, right: 0, bottom: 0, left: 0 }} />
              }
            >
              <VictoryLine
                data={gasData}
                style={{ data: { stroke: "#0A84FF" } }}
              />
              <VictoryScatter
                data={gasData}
                size={3}
                style={{ data: { fill: "#0A84FF" } }}
              />
            </VictoryChart>
          )}
        </View> */}

        <View
          style={[
            tw`mx-6 mt-4 p-4 rounded-3xl overflow-hidden`,
            { backgroundColor: "#0D0D12" },
          ]}
        >
          <Text style={tw`text-lg font-semibold text-white mb-2`}>
            Power Consumption{"  "}
            <Text style={tw`text-yellow-400`}>
              {fmt(latest?.amp, 2)}A
            </Text>
          </Text>

          {ampData.length < 2 ? (
            <Text style={tw`text-gray-400 text-center py-8`}>
              Not enough data
            </Text>
          ) : (
            <VictoryChart
              theme={VictoryTheme.material}
              height={200}
              width={chartW}
              padding={{ left: 40, right: 20, top: 10, bottom: 30 }}
              domainPadding={{ y: 10 }}
              scale={{ x: "time" }}
              domain={{ x: [start, now] }}
              groupComponent={
                <VictoryClipContainer clipPadding={{ top: 0, right: 0, bottom: 0, left: 0 }} />
              }
            >
              <VictoryLine
                data={ampData}
                style={{ data: { stroke: "#FF9F0A" } }}
              />
              <VictoryScatter
                data={ampData}
                size={3}
                style={{ data: { fill: "#FF9F0A" } }}
              />
            </VictoryChart>
          )}
        </View>

        <View style={tw`h-10`} />
      </ScrollView>
    </SafeAreaView>
  );
}
