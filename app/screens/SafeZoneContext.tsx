import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { Alert } from 'react-native';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';  // Import onAuthStateChanged

interface SafeZone {
  id: string;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  expirationDate?: number;
}

interface SafeZoneContextProps {
  safeZones: SafeZone[];
  createSafeZone: (deviceId: string, safeZoneData: Omit<SafeZone, 'id' | 'deviceId'>) => Promise<void>;
  deleteSafeZone: (safeZoneId: string) => Promise<void>;
}

const SafeZoneContext = createContext<SafeZoneContextProps | undefined>(undefined);

export const useSafeZone = () => {
  const context = useContext(SafeZoneContext);
  if (!context) {
    throw new Error('useSafeZone must be used within a SafeZoneProvider');
  }
  return context;
};

export const SafeZoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = getFirestore();
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [user, setUser] = useState<User | null>(null); // Add user state

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); // Set user state
    });

    return () => unsubscribe(); // Unsubscribe on unmount
  }, []);

  // Fetch safe zones from Firestore, only if authenticated
  const fetchSafeZones = useCallback(async () => {
    if (!user) {
      console.log('Not authenticated, skipping fetchSafeZones');
      return;
    }

    try {
      // Add where clause so it only fetch data created by the user
      const safeZoneQuery = query(
        collection(db, 'safeZones'),
        where('deviceId', '==', user.uid)
      );
      const querySnapshot = await getDocs(safeZoneQuery);
      const zones: SafeZone[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafeZone));
      setSafeZones(zones);
    } catch (error) {
      console.error('Error fetching safe zones:', error);
      Alert.alert('Error fetching safe zones', 'Please try again later.');
    }
  }, [db, user]);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching safe zones');
      fetchSafeZones();
    }
  }, [user, fetchSafeZones]);

  const createSafeZone = async (deviceId: string, safeZoneData: Omit<SafeZone, 'id' | 'deviceId'>) => {
      if (!user) {
          console.warn('Not authenticated, cannot create safe zone.');
          Alert.alert('Not authenticated', 'You must be logged in to create a safe zone.');
          return;
      }
    try {
      const docRef = await addDoc(collection(db, 'safeZones'), {
        deviceId,
        ...safeZoneData,
      });
      setSafeZones(prevZones => [...prevZones, { id: docRef.id, deviceId, ...safeZoneData }]);
      Alert.alert('Safe zone created successfully!');
    } catch (error) {
      console.error('Error creating safe zone:', error);
      Alert.alert('Failed to create safe zone.');
    }
  };

  const deleteSafeZone = async (safeZoneId: string) => {
    Alert.alert(
      'Delete Safe Zone',
      'Are you sure you want to delete this safe zone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'safeZones', safeZoneId));
              setSafeZones(prevZones => prevZones.filter(zone => zone.id !== safeZoneId));
              Alert.alert('Safe zone deleted successfully!');
            } catch (error) {
              console.error('Error deleting safe zone:', error);
              Alert.alert('Failed to delete safe zone.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeZoneContext.Provider value={{ safeZones, createSafeZone, deleteSafeZone }}>
      {children}
    </SafeZoneContext.Provider>
  );
};

export default SafeZoneContext;
