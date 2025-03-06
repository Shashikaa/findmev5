import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeZone } from './SafeZoneContext';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { StackNavigationProp } from '@react-navigation/stack';
import usePushNotifications from '../../hooks/usePushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl } from 'react-native';

interface Device {
  id: string;
  userId: string;
  deviceName: string;
  status: 'online' | 'offline';
  location?: { latitude: number; longitude: number; timestamp: number };
  pushToken?: string;
}

interface DeviceLocationState {
  isInside: boolean;
  lastTransitionTime: number;
  consecutiveReadings: {
    inside: number;
    outside: number;
  }
}

interface SafeZone {
  id: string;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  expirationDate?: number;
}

interface TrackDeviceScreenParams {
  device: Device;
}

type RootStackParamList = {
  TrackDeviceScreen: TrackDeviceScreenParams; 
  RegisterDevice: undefined;
};


type TrackDeviceScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TrackDeviceScreen'>;

interface Props {
  selectedDevice?: Device | null; 
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DeviceScreen: React.FC<Props> = ({ selectedDevice: initialSelectedDevice }) => { 
  const navigation = useNavigation<TrackDeviceScreenNavigationProp>();

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(initialSelectedDevice || null);
  const [deviceOptionsVisible, setDeviceOptionsVisible] = useState(false);
  const [editDeviceNameModalVisible, setEditDeviceNameModalVisible] =useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [createSafeZoneModalVisible, setCreateSafeZoneModalVisible] =useState(false);
  const [newSafeZoneName, setNewSafeZoneName] = useState('');
  const [safeZoneRadius, setSafeZoneRadius] = useState('100');
  const { expoPushToken } = usePushNotifications('message');
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { createSafeZone, deleteSafeZone } = useSafeZone();
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [deviceInsideSafeZone, setDeviceInsideSafeZone] = useState<
    { [deviceId: string]: boolean }
  >({});

  const locationWatchId = useRef<Location.LocationSubscription | null>(null);
  const [deviceLocationStates, setDeviceLocationStates] = useState<{
    [deviceId: string]: DeviceLocationState;
  }>({});

  const REQUIRED_CONSECUTIVE_READINGS = 3; // Number of consistent readings required
  const MINIMUM_TRANSITION_INTERVAL = 30000; // Minimum time (ms) between state changes
  const BUFFER_ZONE_METERS = 10


  // Function to calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Radius of the earth in meters
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
  };

 const checkDeviceLocation = useCallback(
    (device: Device, safeZones: SafeZone[], location: Location.LocationObject) => {
      const deviceId = device.id;
      
      // Check if device is inside any of its safe zones with buffer
      const isInsideAnySafeZone = safeZones.some((safeZone) => {
        if (safeZone.deviceId === deviceId) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            safeZone.latitude,
            safeZone.longitude
          );
          
          // Add buffer zone to prevent flickering at the boundary
          const effectiveRadius = safeZone.radius + BUFFER_ZONE_METERS;
          return distance <= effectiveRadius;
        }
        return false;
      });

      return { deviceId, isInside: isInsideAnySafeZone };
    },
    []
  );

  const sendPushNotification = useCallback(async (
    pushToken: string | undefined,
    deviceName: string
  ) => {
    if (!pushToken) {
      console.log('No push token for device:', deviceName);
      return;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title: 'Safe Zone Alert',
      body: `${deviceName} has exited the safe zone!`,
      data: { someData: 'goes here' },
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Failed to send push notification:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error body:', errorText);
      } else {
        console.log('Push notification sent successfully!');
      }
    } catch (error: any) {
      console.error('Error sending push notification:', error);
    }
  }, []);

  const handleLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const currentTime = Date.now();

      devices.forEach((device) => {
        const { deviceId, isInside } = checkDeviceLocation(device, safeZones, location);
        
        setDeviceLocationStates((prevStates) => {
          const currentState = prevStates[deviceId] || {
            isInside: isInside,
            lastTransitionTime: currentTime,
            consecutiveReadings: {
              inside: 0,
              outside: 0,
            },
          };

          // Update consecutive readings
          const newConsecutiveReadings = {
            inside: isInside ? currentState.consecutiveReadings.inside + 1 : 0,
            outside: !isInside ? currentState.consecutiveReadings.outside + 1 : 0,
          };

          // Check if we should update the state
          const timeSinceLastTransition = currentTime - currentState.lastTransitionTime;
          const hasEnoughReadings = isInside
            ? newConsecutiveReadings.inside >= REQUIRED_CONSECUTIVE_READINGS
            : newConsecutiveReadings.outside >= REQUIRED_CONSECUTIVE_READINGS;
          const canTransition = timeSinceLastTransition >= MINIMUM_TRANSITION_INTERVAL;

          // Determine if state should change
          let shouldUpdateState = false;
          if (currentState.isInside !== isInside && hasEnoughReadings && canTransition) {
            shouldUpdateState = true;
          }

          // If state is changing and device is leaving safe zone, send notification
          if (shouldUpdateState && currentState.isInside && !isInside) {
            console.log(`Device ${device.deviceName} (ID: ${deviceId}) exited safe zone.`);
            sendPushNotification(device.pushToken, device.deviceName);
          }

          return {
            ...prevStates,
            [deviceId]: {
              isInside: shouldUpdateState ? isInside : currentState.isInside,
              lastTransitionTime: shouldUpdateState ? currentTime : currentState.lastTransitionTime,
              consecutiveReadings: newConsecutiveReadings,
            },
          };
        });

        // Update the deviceInsideSafeZone state for UI purposes
        setDeviceInsideSafeZone((prev) => ({
          ...prev,
          [deviceId]: deviceLocationStates[deviceId]?.isInside ?? isInside,
        }));
      });
    },
    [devices, safeZones, checkDeviceLocation, sendPushNotification, deviceLocationStates]
  );


  useEffect(() => {
    if (!user) return;

    let unsubscribeDevices: (() => void) | undefined;
    let unsubscribeSafeZones: (() => void) | undefined;

    const fetchAndSetDevices = async () => {
      try {
        const devicesQuery = query(
          collection(db, 'devices'),
          where('userId', '==', user.uid)
        );

        unsubscribeDevices = onSnapshot(devicesQuery, async (snapshot) => {
          const deviceList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Device[];

          // Fetch all safe zones for user's devices
          const deviceIds = deviceList.map((d) => d.id);
          if (deviceIds.length === 0) {
            setSafeZones([]);
            setDevices(deviceList);
            return;
          }

          const safeZonesQuery = query(
            collection(db, 'safeZones'),
            where('deviceId', 'in', deviceIds)
          );

          if (unsubscribeSafeZones) {
            unsubscribeSafeZones();
          }

          unsubscribeSafeZones = onSnapshot(
            safeZonesQuery,
            (safeZoneSnapshot) => {
              const safeZoneList = safeZoneSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as SafeZone[];
              setSafeZones(safeZoneList);

              setDeviceInsideSafeZone((prevState) => {
                const newState: { [deviceId: string]: boolean } = {};
                deviceList.forEach((device) => {
                  newState[device.id] = false;
                });
                return newState;
              });
            }
          );

          // Update push tokens for devices
          for (const device of deviceList) {
            if (expoPushToken && device.pushToken !== expoPushToken) {
              try {
                const deviceRef = doc(db, 'devices', device.id);
                await updateDoc(deviceRef, { pushToken: expoPushToken });
                console.log(
                  `Updated push token for device ${device.deviceName} to ${expoPushToken}`
                );
              } catch (error: any) {
                console.error('Error updating push token:', error);
              }
            } else {
              console.log(`Push token for device ${device.deviceName} is up to date or no token available.`);
            }
          }
          setDevices(deviceList);
        });

      } catch (error) {
        console.error('Error in fetchAndSetDevices:', error);
      }
    };

    fetchAndSetDevices();

    // Cleanup function
    return () => {
      if (unsubscribeDevices) {
        unsubscribeDevices();
      }
      if (unsubscribeSafeZones) {
        unsubscribeSafeZones();
      }
    };
  }, [user, expoPushToken]);
  




  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      locationWatchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        handleLocationUpdate
      );
    })();

    return () => {
      if (locationWatchId.current) {
        locationWatchId.current.remove();
      }
    };
  }, [handleLocationUpdate]);

  const handleDevicePress = useCallback((device: Device) => {
    setSelectedDevice(device);
    setDeviceOptionsVisible(true);
  }, []);

  const openEditDeviceNameModal = useCallback(() => {
    setNewDeviceName(selectedDevice?.deviceName || '');
    setEditDeviceNameModalVisible(true);
  }, [selectedDevice]);

  const closeEditDeviceNameModal = useCallback(() => {
    setEditDeviceNameModalVisible(false);
  }, []);

  const saveDeviceName = useCallback(async () => {
    if (!selectedDevice) return;

    try {
      const deviceRef = doc(db, 'devices', selectedDevice.id);
      await updateDoc(deviceRef, { deviceName: newDeviceName });
      setEditDeviceNameModalVisible(false);
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === selectedDevice.id
            ? { ...device, deviceName: newDeviceName }
            : device
        )
      );
      setSelectedDevice({ ...selectedDevice, deviceName: newDeviceName });
      Alert.alert('Device name updated successfully!');
    } catch (error: any) {
      console.error('Error updating device name:', error);
      Alert.alert('Failed to update device name.');
    }
  }, [db, newDeviceName, selectedDevice]);

  const deleteDevice = useCallback(async () => {
    if (!selectedDevice) return;

    Alert.alert(
      'Delete Device',
      'Are you sure you want to delete this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deviceRef = doc(db, 'devices', selectedDevice.id);
              await deleteDoc(deviceRef);
              setSelectedDevice(null);
              setDevices((prevDevices) =>
                prevDevices.filter((device) => device.id !== selectedDevice.id)
              );
              Alert.alert('Device deleted successfully!');
            } catch (error: any) {
              console.error('Error deleting device:', error);
              Alert.alert('Failed to delete device.');
            }
          },
        },
      ]
    );
  }, [db, selectedDevice]);

  const trackDevice = useCallback(() => {
    if (!selectedDevice) {
      console.warn('No device selected for tracking.');
      Alert.alert('No device selected', 'Please select a device to track.');
      return;
    }

    if (!selectedDevice.location) {
      console.warn(`Location is unknown for device: ${selectedDevice.deviceName} (ID: ${selectedDevice.id})`);
      Alert.alert('Location unknown', 'This device location is unknown.');
      return;
    }

    try {
      navigation.navigate('TrackDeviceScreen', { device: selectedDevice });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation failed', 'An error occurred while trying to track the device.');
    }
  }, [navigation, selectedDevice]);
  const openCreateSafeZoneModal = useCallback(() => {
    setCreateSafeZoneModalVisible(true);
  }, []);

  const closeCreateSafeZoneModal = useCallback(() => {
    setCreateSafeZoneModalVisible(false);
  }, []);

  const handleMapPress = useCallback((event: any) => {
    setSelectedCoordinates({
      latitude: event.nativeEvent.coordinate.latitude,
      longitude: event.nativeEvent.coordinate.longitude,
    });
  }, []);

  const handleCreateSafeZone = useCallback(async () => {
    if (
      !selectedDevice ||
      !selectedCoordinates ||
      !newSafeZoneName ||
      !safeZoneRadius
    ) {
      Alert.alert('All fields are required.');
      return;
    }

    if (expirationDate === undefined) {
      Alert.alert('Please select an expiration date');
      return;
    }

    try {
      await createSafeZone(selectedDevice.id, {
        name: newSafeZoneName,
        latitude: selectedCoordinates.latitude,
        longitude: selectedCoordinates.longitude,
        radius: parseFloat(safeZoneRadius),
        expirationDate: expirationDate?.getTime(),
      });
      closeCreateSafeZoneModal();
    } catch (error: any) {
      console.error('Error creating safe zone:', error);
    }
  }, [
    createSafeZone,
    closeCreateSafeZoneModal,
    selectedDevice,
    selectedCoordinates,
    newSafeZoneName,
    safeZoneRadius,
    expirationDate,
  ]);

  const handleDeleteSafeZone = useCallback(
    async (safeZoneId: string) => {
      await deleteSafeZone(safeZoneId);
    },
    [deleteSafeZone]
  );

  const onDateChange = useCallback((event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || expirationDate;
    setShowDatePicker(false);
    setExpirationDate(currentDate);
  }, [expirationDate]);

  const ListHeaderComponent = useCallback(() => (
    <View>
      <Text style={styles.header}>Registered Devices</Text>
    </View>
  ), []);

  const ListFooterComponent = useCallback(() => (
    <View>
      {selectedDevice && (
        <View style={styles.safeZonesContainer}>
          <Text style={styles.safeZonesHeader}>Safe Zones</Text>
          <FlatList
            data={safeZones}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => (
              <View style={styles.safeZoneCard}>
                <Text style={styles.safeZoneName}>{item.name}</Text>
                <Text>Radius: {item.radius} meters</Text>
                <Text>
                  Coordinates: {item.latitude}, {item.longitude}
                </Text>
                <TouchableOpacity
                  style={styles.deleteSafeZoneButton}
                  onPress={() => handleDeleteSafeZone(item.id)}
                >
                  <Text style={styles.deleteSafeZoneText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.createSafeZoneButton}
            onPress={openCreateSafeZoneModal}
          >
            <Text style={styles.createSafeZoneText}>Create New Safe Zone</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [selectedDevice, safeZones, handleDeleteSafeZone, openCreateSafeZoneModal]);

  const handleAddDevice = () => {
    navigation.navigate('RegisterDevice');
  };


  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f7fc" />
    <Modal
      animationType="slide"
      transparent={true}
      visible={editDeviceNameModalVisible}
      onRequestClose={closeEditDeviceNameModal}
    >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Edit Device Name</Text>
            <TextInput
              style={styles.input}
              placeholder="New Device Name"
              value={newDeviceName}
              onChangeText={setNewDeviceName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditDeviceNameModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveDeviceName}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={createSafeZoneModalVisible}
        onRequestClose={closeCreateSafeZoneModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Create New Safe Zone</Text>
            <TextInput
              style={styles.input}
              placeholder="Safe Zone Name"
              value={newSafeZoneName}
              onChangeText={(text) => setNewSafeZoneName(text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Radius (meters)"
              keyboardType="numeric"
              value={safeZoneRadius}
              onChangeText={(text) => setSafeZoneRadius(text)}
            />
            <View>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text>
                  Select Expiration Date:
                  {expirationDate
                    ? expirationDate.toLocaleDateString()
                    : 'No date selected'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={expirationDate || new Date()}
                  mode="date"
                  is24Hour={true}
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>
            {currentLocation ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onPress={handleMapPress}
              >
                {selectedCoordinates && (
                  <Circle
                    center={selectedCoordinates}
                    radius={parseFloat(safeZoneRadius)}
                    fillColor="rgba(255, 0, 0, 0.2)"
                    strokeColor="rgba(255, 0, 0, 0.5)"
                  />
                )}
                {currentLocation && (
                  <Marker coordinate={currentLocation} title="Current Location" />
                )}
                {selectedCoordinates && (
                  <Marker coordinate={selectedCoordinates} title="Safe Zone Center" />
                )}
              </MapView>
            ) : (
              <Text>Loading map...</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeCreateSafeZoneModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateSafeZone}
              >
                <Text style={styles.saveButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
      data={devices}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.deviceCard,
            selectedDevice?.id === item.id && styles.selectedDeviceCard,
          ]}
          onPress={() => handleDevicePress(item)}
        >
          <Text style={styles.deviceName}>{item.deviceName || 'Unnamed Device'}</Text>
          <Text style={styles.deviceStatus}>
            Status: {item.status === 'online' ? 'Online' : 'Offline'}
          </Text>
          {/* Add visual indicator for safe zone status */}
          <View style={[
            styles.statusIndicator,
            deviceInsideSafeZone[item.id] 
              ? styles.insideSafeZone 
              : styles.outsideSafeZone
          ]}>
            <Text style={styles.statusIndicatorText}>
              {deviceInsideSafeZone[item.id] ? 'INSIDE' : 'OUTSIDE'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No devices registered</Text>
      }
    />
      <Modal
        visible={deviceOptionsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeviceOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.bottomSheetContainer}
          activeOpacity={1}
          onPressOut={() => setDeviceOptionsVisible(false)}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.handleBar} />
            <Text style={styles.selectedDeviceHeader}>{selectedDevice?.deviceName}</Text>

            <View style={styles.deviceInfoContainer}>
              <Text style={styles.deviceStatus}>
                Status: {selectedDevice?.status === 'online' ?
                  <Text style={{ color: '#28a745' }}>● Online</Text> :
                  <Text style={{ color: '#dc3545' }}>● Offline</Text>}
              </Text>
              {selectedDevice?.location && (
                <Text style={styles.deviceStatus}>
                  Last Update: {new Date(selectedDevice.location.timestamp).toLocaleString()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setDeviceOptionsVisible(false);
                openEditDeviceNameModal();
              }}
            >
              <Text style={styles.optionText}>✏️ Edit Device Name</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={trackDevice}
            >
              <Text style={styles.optionText}>📍 Track Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setDeviceOptionsVisible(false);
                openCreateSafeZoneModal();
              }}
            >
              <Text style={styles.optionText}>🛡 Create Safe Zone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, { borderBottomWidth: 0 }]}
              onPress={deleteDevice}
            >
              <Text style={[styles.optionText, styles.dangerOption]}>🗑 Delete Device</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <TouchableOpacity
    style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 80 + insets.bottom : 130 + insets.bottom, // Adjust for iOS and Android
        right: 20 + insets.right,
        backgroundColor: '#007AFF',
        width: 60,
        height: 60,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }}
    onPress={handleAddDevice}
>
    <Ionicons name="add" size={30} color="#fff" />
</TouchableOpacity>

      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fc',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  statusIndicator: {
    marginTop: 8,
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  insideSafeZone: {
    backgroundColor: '#28a74520',
    borderColor: '#28a745',
  },
  outsideSafeZone: {
    backgroundColor: '#dc354520',
    borderColor: '#dc3545',
  },
  statusIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50', // Dark blue-gray for better readability
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Helvetica Neue', // Modern font
  },
  deviceCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  selectedDeviceCard: {
    borderColor: '#007bff',
    borderWidth: 2,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deviceName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#34495e', // Darker text for better contrast
    marginBottom: 8,
  },
  deviceStatus: {
    fontSize: 16,
    color: '#7f8c8d', // Grayish text for status
    fontStyle: 'italic',
  },
  selectedDeviceHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fc',
  },
  safeZonesContainer: {
    padding: 16,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  safeZonesHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  safeZoneCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  safeZoneName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
  },
  deleteSafeZoneButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  deleteSafeZoneText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  createSafeZoneButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  createSafeZoneText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    fontSize: 16,
    color: '#34495e',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  bottomSheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheetContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  handleBar: {
    height: 4,
    width: 40,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: 10,
  },
  deviceInfoContainer: {
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  optionButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 17,
    color: '#333',
  },
  dangerOption: {
    color: '#e74c3c',
  },
});

export default DeviceScreen;
