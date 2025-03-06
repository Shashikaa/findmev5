import React, { useState, useEffect } from 'react';
import { 
  View, TextInput, Button, Alert, StyleSheet, ScrollView, 
  Text, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import * as Location from 'expo-location';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';

const RegisterDeviceScreen = ({ navigation }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('phone');
  const [trackerInfo, setTrackerInfo] = useState({
    serialNumber: '',
    model: '',
  });
  const [safeZoneName, setSafeZoneName] = useState('');
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const requestLocationPermission = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to track this device.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
    };
    requestLocationPermission();
  }, []);

  const startLiveLocation = async (deviceId) => {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10
      },
      async (location) => {
        const deviceRef = doc(db, 'devices', deviceId);
        await setDoc(deviceRef, {
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
          },
          lastUpdated: Date.now(),
        }, { merge: true });
      }
    );
  };

  const registerDevice = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name');
      return;
    }

    try {
      const devicesRef = collection(db, 'devices');
      const deviceData: {
        userId: string;
        deviceName: string;
        deviceType: string;
        createdAt: number;
        location: null;
        isTracking: boolean;
        trackerInfo?: {
          serialNumber: string;
          model: string;
        };
      } = {
        userId: auth.currentUser ? auth.currentUser.uid : '',
        deviceName: deviceName.trim(),
        deviceType: deviceType,
        createdAt: Date.now(),
        location: null,
        isTracking: false,
      };

      if (deviceType === 'gps_tracker') {
        if (!trackerInfo.serialNumber || !trackerInfo.model) {
          Alert.alert('Error', 'Please enter GPS tracker details');
          return;
        }
        deviceData.trackerInfo = trackerInfo;
      }

      const newDeviceRef = await addDoc(devicesRef, deviceData);
      
      if (deviceType === 'phone') {
        startLiveLocation(newDeviceRef.id);
      }

      Alert.alert('Success', 'Device registered successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error registering device:', error);
      Alert.alert('Error', 'Failed to register device. Please try again.');
    }
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Register Device</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Registration</Text>
            <TextInput
              placeholder="Enter device name"
              style={styles.input}
              value={deviceName}
              onChangeText={setDeviceName}
            />
      
            <View style={styles.deviceTypeContainer}>
              <TouchableOpacity
                style={[styles.deviceTypeButton, deviceType === 'phone' && styles.selectedType]}
                onPress={() => setDeviceType('phone')}
              >
                <Ionicons name="phone-portrait" size={24} color={deviceType === 'phone' ? '#fff' : '#000'} />
                <Text style={deviceType === 'phone' ? styles.selectedTypeText : styles.typeText}>Phone</Text>
              </TouchableOpacity>
      
              <TouchableOpacity
                style={[styles.deviceTypeButton, deviceType === 'gps_tracker' && styles.selectedType]}
                onPress={() => setDeviceType('gps_tracker')}
              >
                <Ionicons name="location" size={24} color={deviceType === 'gps_tracker' ? '#fff' : '#000'} />
                <Text style={deviceType === 'gps_tracker' ? styles.selectedTypeText : styles.typeText}>GPS Tracker</Text>
              </TouchableOpacity>
            </View>
      
            {deviceType === 'gps_tracker' && (
              <View style={styles.trackerInfoContainer}>
                <TextInput
                  placeholder="Serial Number"
                  style={styles.input}
                  value={trackerInfo.serialNumber}
                  onChangeText={(text) => setTrackerInfo(prev => ({ ...prev, serialNumber: text }))}
                />
                <TextInput
                  placeholder="Model"
                  style={styles.input}
                  value={trackerInfo.model}
                  onChangeText={(text) => setTrackerInfo(prev => ({ ...prev, model: text }))}
                />
              </View>
            )}
      
            <Button title="Register Device" onPress={registerDevice} />
          </View>
      

      
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Or Register via Web</Text>
            <TouchableOpacity
              style={styles.webLinkButton}
              onPress={() => Linking.openURL('https://findme-tracker.netlify.app/')}
            >
              <Text style={styles.webLinkText}>Register on Web</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  deviceTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  deviceTypeButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    width: '45%',
  },
  selectedType: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeText: {
    marginTop: 5,
    color: '#000',
  },
  selectedTypeText: {
    marginTop: 5,
    color: '#fff',
  },
  trackerInfoContainer: {
    marginBottom: 15,
  },
  locationText: {
    marginBottom: 10,
    color: '#666',
  },
  webLinkButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#28a745',
    alignItems: 'center',
    marginTop: 10,
  },
  webLinkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegisterDeviceScreen;
