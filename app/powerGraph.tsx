import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ScrollView,
  Button,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getAuth } from 'firebase/auth';
import { LineChart } from 'react-native-chart-kit';
import { routeToScreen } from 'expo-router/build/useScreens';


// Dummy data for the chart

export default function powerGraph () {
    const router = useRouter();
    const auth = getAuth();
    const [user, setUser] = useState(null); 
    const [loading, setLoading] = useState(true);
    const fetchUserData = async () => {
        try {
          const user = auth.currentUser;
          if (!user) {
            console.error("No user signed in.");
            return;
          }
    
          const token = await user.getIdToken();
          console.log("User token:", token); 
    
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
    
      useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
          fetchUserData();
        } else {
          setUser(null);
        }
    
        setLoading(false);
      }, []);

    const allData = {

      day: {
        labels: ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'], 
        datasets: [
          {
            data: [5, 12, 7, 20, 15, 18, 25, 30], 
            strokeWidth: 2,
          },
        ],
      },
      week: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [30, 45, 28, 80, 99, 43, 60], 
            strokeWidth: 2,
          },
        ],
      },
      month: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
        datasets: [
          {
            data: [300, 400, 350, 500, 600, 450, 700, 800, 750, 850, 900, 950], 
            strokeWidth: 2,
          },
        ],
      },
    };
    
    const chartConfig = {
      backgroundColor: '#fff',
      backgroundGradientFrom: '#ff9e00',
      backgroundGradientTo: '#ff2e00',
      decimalPlaces: 2,
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#ffa726',
      },
    };


  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('month');
  const [chartData, setChartData] = useState(allData.month);
  const handleTimePeriodChange = (period: 'day' | 'week' | 'month') => {
    setTimePeriod(period);
    setChartData(allData[period]);
  };

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
        <Button title="Day" onPress={() => handleTimePeriodChange('day')} />
        <Button title="Week" onPress={() => handleTimePeriodChange('week')} />
        <Button title="Month" onPress={() => handleTimePeriodChange('month')} />
      </View>

      <View style={styles.graphContainer}>
          <LineChart
            data={chartData}
            width={350} // Width of the chart
            height={220} // Height of the chart
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        </View>
      
    </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20, 
    left: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  note: {
    fontSize: 14,
    color: 'gray',
    marginTop: 5,
  },
  graphContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartStyle: {
    borderRadius: 16,
    marginVertical: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  headerBar: {
    backgroundColor: '#49aae6',
    paddingTop: 5,
    paddingBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 70,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerBold: {
    fontWeight: 'bold',
  },
  headerItalic: {
    fontStyle: 'italic',
  },
  safeArea: {
    flex: 0,  
  },
  headerHome: {
    fontSize: 16,
    color: '#fff',
    marginTop: 0,
  },
});


