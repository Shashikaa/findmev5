import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function usePushNotifications(message: string) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  async function registerForPushNotifications() {
    let token;

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      token = await Notifications.getExpoPushTokenAsync({
        projectId: '81d2d2b8-32e2-44a1-914c-acba4ba60b3a',
      });
    } else {
      alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token?.data;
  }

  async function getSenderName() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return "User";

      // Try to get the user document from 'users' collection
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      console.log("User document data:", userDoc.data()); // Debug log

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Check all possible name fields
        const name = userData.name || userData.displayName || userData.username || userData.fullName;

        if (name) return name;
      }

      // Fallback to auth displayName
      const authName = currentUser.displayName;

      if (authName) return authName;

      return "User";
    } catch (error) {
      console.error("Error getting sender name:", error);
      return "User";
    }
  }

  async function sendPushNotification(recipientId: string, message: string, chatId: string) {
    try {
      const senderName = await getSenderName();
     
      // Fetch recipient's push token
      const recipientDoc = await getDoc(doc(db, "users", recipientId));

      if (!recipientDoc.exists()) {
        console.log('Recipient user document not found.');
        return;
      }

      const recipientData = recipientDoc.data();
      const recipientPushToken = recipientData?.pushToken;

      if (!recipientPushToken) {
        console.log('Recipient has no push token.');
        return;
      }

      const pushNotificationData = {
        to: recipientPushToken,
        sound: "default",
        title: `New Message from ${senderName}`,
        body: message,
        data: { 
          chatId: chatId,
          senderId: auth.currentUser?.uid,
          senderName: senderName
        },
      };

      console.log("Sending notification with data:", pushNotificationData); // Debug log

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushNotificationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Push notification failed:', response.status, errorText);
        return;
      }

      console.log('Push notification sent successfully!');
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // New function to send risk notifications
  async function sendRiskNotification(message: string) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Fetch current user's push token
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        console.log('User document not found.');
        return;
      }

      const userData = userDoc.data();
      const pushToken = userData?.pushToken;
      
      if (!pushToken) {
        console.log('User has no push token.');
        return;
      }

      const pushNotificationData = {
        to: pushToken,
        sound: "default",
        title: "Risk Alert!",
        body: message,
        data: { type: "risk_alert" },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushNotificationData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Risk notification failed:', response.status, errorText);
        return;
      }

      console.log('Risk notification sent successfully!');
    } catch (error) {
      console.error('Error sending risk notification:', error);
    }
  }

  return { expoPushToken, notification, sendPushNotification, sendRiskNotification };
}
