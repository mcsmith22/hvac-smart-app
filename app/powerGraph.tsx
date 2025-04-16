import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Button,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LineChart } from 'react-native-chart-kit';
import { toZonedTime } from 'date-fns-tz'

interface Reading {
  deviceId: string;
  date_of_req: string;
  amp_measurement: string; 

}

const convertToISO = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length !== 6) return '1970-01-01T00:00:00Z';
  return toZonedTime(`${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}Z`, "America/New_York").toString();
};

const formatLabel = (date: Date, period: 'day' | 'month' | 'year'): string => {
  if (period === 'day') {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (period === 'month') {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString([], { month: 'short' });
  }
};

const processReadings = (
  readings: Reading[],
  period: 'day' | 'month' | 'year',
  scaleFactor = 1
) => {
  const now = new Date();
  let startTime: Date;
  let binCount: number;
  
  if (period === 'day') {
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    binCount = 16;
  } else if (period === 'month') {
    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    binCount = 16;
  } else {
    startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    binCount = 12;
  }
  
  const totalDuration = now.getTime() - startTime.getTime();
  // const intervalDuration = Math.floor(totalDuration / binCount);
  const intervalDuration = totalDuration / binCount;
  
  const labels: string[] = [];
  const dataPoints: number[] = new Array(binCount).fill(0);
  const counts: number[] = new Array(binCount).fill(0);
  
  readings.forEach(r => {
    const converted = convertToISO(r.date_of_req);
    const readingDate = new Date(converted);
    const readingTime = readingDate.getTime();

    if (readingTime < startTime.getTime() || readingTime > now.getTime()) {
      return;
    }

    const index = Math.floor((readingTime - startTime.getTime()) / intervalDuration);
    
    if (index >= 0 && index < binCount) {
      const ampVal = parseFloat(r.amp_measurement);
      dataPoints[index] += ampVal;
      counts[index] += 1;
    } else {
    }
  });

  for (let i = 0; i < binCount; i++) {
    dataPoints[i] = counts[i] > 0 ? dataPoints[i] / counts[i] : 0;
    const binStart = new Date(startTime.getTime() + i * intervalDuration);
    const label = (i === 0 || i === binCount - 1) ? formatLabel(binStart, period) : '';
    labels.push(label);
  }
  
  const scaledDataPoints = dataPoints.map(val => val * scaleFactor);
  
  return {
    labels,
    datasets: [{ data: scaledDataPoints, strokeWidth: 2 }],
  };
};




const chartConfig = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(73, 170, 230, ${opacity})`, 
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#49aae6', 
  },
  propsForBackgroundLines: {
    stroke: '#e0e0e0',
  },
  propsForLabels: {
    fontSize: 12,
  },
};


export default function PowerGraph() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const [timePeriod, setTimePeriod] = useState<'day' | 'month' | 'year'>('month');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReadings = async (): Promise<Reading[]> => {
    try {
      console.log('Querying API for deviceId:', deviceId);
      const response = await fetch(`https://HVASee.azurewebsites.net/api/getColor?deviceId=${deviceId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      
      const data: Reading[] = Array.isArray(result) ? result : [result];

      return data;
    } catch (error) {
      console.error("Error fetching readings from Azure:", error);
      return [];
    }
  };
  

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const readings = await fetchReadings();
      const processed = processReadings(readings, timePeriod);
      setChartData(processed);
      setLoading(false);
    };
    loadData();
  }, [deviceId, timePeriod]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
              width={350}
              height={220}
              chartConfig={chartConfig}
              bezier
              fromZero={true}
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
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerBold: { fontWeight: 'bold' },
  headerItalic: { fontStyle: 'italic' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 20,
  },
  graphContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartStyle: {
    borderRadius: 16,
    marginVertical: 8,
  },
  loadingIndicator: {
    marginTop: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 20,
  },
});
