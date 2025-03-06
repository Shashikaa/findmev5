import React, { useState, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NavigatorWrapper from "../navigations/AppNavigator";
import { SafeZoneProvider } from "./screens/SafeZoneContext";
import usePushNotifications from "../hooks/usePushNotifications";
import { auth, db } from "../firebase";
import SplashScreen from "./screens/SplashScreen";
import { doc, setDoc } from "firebase/firestore";
import { User } from 'firebase/auth';
import * as Location from 'expo-location';
import { getRiskLevel } from '../predictRisk';  // Import the getRiskLevel function


interface StorePushTokenProps {
  userId: string;
  token: string;
}

const App: React.FC = () => {
  const { expoPushToken } = usePushNotifications("Your message here");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // Fetch user's location
  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    };

    getLocation();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storeToken = async () => {
      if (expoPushToken && user) {
        await storePushToken({
          userId: user.uid,
          token: expoPushToken
        });
      }
    };

    storeToken();
  }, [expoPushToken, user]);

  const storePushToken = async ({ userId, token }: StorePushTokenProps) => {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          pushToken: token,
        },
        { merge: true }
      );

      console.log("Push token stored successfully for user:", userId);
    } catch (error) {
      console.error("Error storing push token:", error instanceof Error ? error.message : "Unknown error");
    }
  };

  // Function to handle risk level
  const handleRiskLevel = async () => {
    if (location) {
      const userData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        time_of_day: new Date().getHours(),  // Current hour for time_of_day
        user_activity: 1,  // Example: Walking (change based on actual activity)
        proximity: 50,  // Example proximity (adjust as needed)
        past_incidents: 3,  // Example incidents count (adjust based on real data)
      };

      try {
        const riskLevel = await getRiskLevel(userData);

        // Log the risk level for now
        console.log('Risk Level:', riskLevel);
      } catch (error) {
        console.error('Error getting risk level:', error);
      }
    }
  };

  useEffect(() => {
    // Fetch risk level when location is available
    if (location) {
      handleRiskLevel();
    }
  }, [location]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <SafeZoneProvider>
      
        <NavigatorWrapper />

      </SafeZoneProvider>
    </SafeAreaProvider>
  );
};

export default App;
