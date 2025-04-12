import React, { useState, useEffect } from 'react';
import { TouchableOpacity, SafeAreaView, ScrollView, StyleSheet, View, FlatList, Text, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'; 
import { getAuth } from 'firebase/auth';
import Ionicons from "react-native-vector-icons/Ionicons";

interface ErrorLog {
  id: string;
  errorCode: string;
  errorMessage: string;
  timestamp: string;
  category: string;
}

export default function ErrorLogScreen() {
  const router = useRouter();
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitErrorsOpen, setUnitErrorsOpen] = useState(false);
  const [filterErrorsOpen, setFilterErrorsOpen] = useState(false);
  const [gasErrorsOpen, setGasErrorsOpen] = useState(false);


  const fetchErrorLogs = async () => {
    try {
      const response = await fetch('https://HVASee.azurewebsites.net/api/getColor');
      if (!response.ok) {
        throw new Error(`Failed to fetch error logs. Status: ${response.status}`);
      }
      const data: ErrorLog[] = await response.json();
      setErrorLogs(data);
    } catch (error) {
      console.error('Error fetching error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorLogs();
  }, []);

  const renderErrorLogItem = ({ item }: { item: ErrorLog }) => (
    <View style={styles.errorCard}>
      <Text style={styles.errorCode}>Error Code: {item.errorCode}</Text>
      <Text style={styles.errorMessage}>Message: {item.errorMessage}</Text>
      <Text style={styles.timestamp}>Timestamp: {item.timestamp}</Text>
    </View>
  );

  const filterLogsByCategory = (category: string) => {
    return errorLogs.filter((log) => log.category === category);
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading error logs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
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
          <Text style={styles.headerHome}>Error Log</Text>
      </View>

      <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => setUnitErrorsOpen(!unitErrorsOpen)}
        >
          <Text style={styles.sectionTitle}>Unit Errors</Text>
          <Ionicons name={unitErrorsOpen ? "chevron-up" : "chevron-down"} size={20} color="#aaa" />
        </TouchableOpacity>
        {unitErrorsOpen && (
            <FlatList
              data={filterLogsByCategory("unit")}
              keyExtractor={(item) => item.id}
              renderItem={renderErrorLogItem}
              contentContainerStyle={styles.listContainer}
            />
        )}

        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => setFilterErrorsOpen(!filterErrorsOpen)}
        >
          <Text style={styles.sectionTitle}>Filter Errors</Text>
          <Ionicons name={filterErrorsOpen ? "chevron-up" : "chevron-down"} size={20} color="#aaa" />
        </TouchableOpacity>
        {filterErrorsOpen && (
          <FlatList
            data={filterLogsByCategory("filter")}
            keyExtractor={(item) => item.id}
            renderItem={renderErrorLogItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
        
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 0,  
  },
  headerWrapper: {
    backgroundColor: '#49aae6',
    padding: 16,
    alignItems: 'center',
  },
  headerBold: {
    fontWeight: 'bold',
  },
  headerItalic: {
    fontStyle: 'italic',
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
  headerHome: {
    fontSize: 16,
    color: '#fff',
    marginTop: 0,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  listContainer: {
    paddingTop: 20,
  },
  errorCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  errorCode: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  errorMessage: {
    fontSize: 14,
    color: '#555',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  backButton: {
    position: 'absolute',
    top: 20, 
    left: 10,
    padding: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});
