import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Button,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { toZonedTime } from 'date-fns-tz';
import { LineChart } from 'react-native-chart-kit';

interface AmpReading {
  ts: Date; 
  amp: number;
}

type Period = 'day' | 'month' | 'year';

const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(73, 170, 230, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#49aae6' },
  propsForBackgroundLines: { stroke: '#e0e0e0' },
  propsForLabels: { fontSize: 12 },
};

const formatLabel = (d: Date, p: Period) => {
  if (p === 'day') return d.toLocaleTimeString([], { hour: 'numeric' });
  if (p === 'month') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short' });
};

const processReadings = (readings: AmpReading[], period: Period) => {
  const now = new Date();
  const end = now.getTime();
  let start: Date;
  let bins: number;

  if (period === 'day') {
    start = new Date(end - 24 * 60 * 60 * 1000);
    bins = 8;
  } else if (period === 'month') {
    start = new Date(end - 30 * 24 * 60 * 60 * 1000);
    bins = 10;
  } else {
    start = new Date(end - 365 * 24 * 60 * 60 * 1000);
    bins = 12;
  }

  const intervalDur = (end - start.getTime()) / bins;
  const sums = new Array(bins).fill(0) as number[];
  const counts = new Array(bins).fill(0) as number[];

  readings.forEach(({ ts, amp }) => {
    const t = ts.getTime();
    if (t < start.getTime() || t > end) return;
    const rawIdx = (t - start.getTime()) / intervalDur;
    const idx = Math.min(Math.max(Math.floor(rawIdx), 0), bins - 1);
    sums[idx] += amp;
    counts[idx] += 1;
  });

  const data = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
  const labels = Array.from({ length: bins }, (_, i) => {
    if (i === 0) return formatLabel(start, period);
    if (i === bins - 1) return formatLabel(now, period);
    return '';
  });

  return { labels, datasets: [{ data, strokeWidth: 2 }] };
};

export default function PowerGraph() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();

  const [timePeriod, setTimePeriod] = useState<Period>('month');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReadings = async (period: Period): Promise<AmpReading[]> => {
    if (!deviceId) return [];
    const db = getFirestore();
    const now = new Date();

    if (period === 'day') {
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const teleRef = collection(db, 'devices', deviceId, 'telemetry');
      const q = query(
        teleRef,
        where('ts', '>=', Timestamp.fromDate(since)),
        orderBy('ts'),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const { ts, amp } = d.data() as { ts: Timestamp; amp: number };
        return { ts: ts.toDate(), amp };
      });
    }

    const dailyRef = collection(db, 'devices', deviceId, 'daily');
    const snap = await getDocs(dailyRef);
    const limitMs = period === 'month' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000;
    const since = new Date(now.getTime() - limitMs);

    return snap.docs
      .map((d) => {
        const data = d.data() as { date?: string; ampAvg?: number };
        const dateStr = data.date ?? d.id; 
        const [y, m, day] = dateStr.split('-').map(Number);
        const ts = new Date(Date.UTC(y, m - 1, day));
        return { ts, amp: data.ampAvg ?? 0 };
      })
      .filter(({ ts }) => ts >= since && ts <= now);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const readings = await fetchReadings(timePeriod);
      setChartData(processReadings(readings, timePeriod));
      setLoading(false);
    };
    load();
  }, [deviceId, timePeriod]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: '#49aae6' }} edges={['left', 'right']}>
        <View style={styles.headerBar}>
          <Ionicons
            name="arrow-back"
            size={25}
            color="white"
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text style={styles.headerText}>
            <Text style={styles.headerBold}>HVA</Text>
            <Text style={styles.headerItalic}>See</Text>
          </Text>
        </View>
      </SafeAreaView>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Power Consumption</Text>
        <View style={styles.filterButtons}>
          <Button title="Day" onPress={() => setTimePeriod('day')} />
          <Button title="Month" onPress={() => setTimePeriod('month')} />
          <Button title="Year" onPress={() => setTimePeriod('year')} />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#49aae6" style={styles.loadingIndicator} />
        ) : chartData ? (
          <View style={styles.graphContainer}>
            <LineChart
              data={chartData}
              width={Dimensions.get('window').width - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              fromZero
              style={styles.chartStyle}
            />
          </View>
        ) : (
          <Text style={styles.errorText}>No power consumption data available.</Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: '#fff',
  },
  headerBar: {
    backgroundColor: '#49aae6',
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
    position: 'relative',
  },
  backButton: { position: 'absolute', top: 20, left: 10, padding: 10 },
  headerText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerBold: { fontWeight: 'bold' },
  headerItalic: { fontStyle: 'italic' },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 10 },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 20,
  },
  graphContainer: { alignItems: 'center', justifyContent: 'center' },
  chartStyle: { borderRadius: 16, marginVertical: 8 },
  loadingIndicator: { marginTop: 40 },
  errorText: { fontSize: 16, color: '#ff3b30', textAlign: 'center', marginTop: 20 },
});
