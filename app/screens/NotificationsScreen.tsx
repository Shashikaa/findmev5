import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  where,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useIsFocused } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!currentUserId) return;

    const notificationsRef = collection(db, 'users', currentUserId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
      setNotifications(notificationsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUserId]);

  useEffect(() => {
    if (isFocused) {
      markNotificationsAsRead();
    }
  }, [isFocused]);

  const markNotificationsAsRead = async () => {
    if (!currentUserId) return;

    const notificationsRef = collection(db, 'users', currentUserId, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));
    const snapshot = await getDocs(q);

    const updates = snapshot.docs.map(doc => updateDoc(doc.ref, { read: true }));
    await Promise.all(updates);
  };

  const clearAllNotifications = async () => {
    if (!currentUserId) return;

    Alert.alert("Clear Notifications", "Are you sure you want to delete all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        onPress: async () => {
          const notificationsRef = collection(db, 'users', currentUserId, 'notifications');
          const snapshot = await getDocs(notificationsRef);
          const deletions = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletions);
          setNotifications([]);
        }
      }
    ]);
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity style={styles.notificationItem} onPress={() => console.log('Notification tapped:', item)}>
      <Image source={{ uri: item.senderPhoto || 'https://via.placeholder.com/150' }} style={styles.senderPhoto} />
      <View style={styles.notificationText}>
        <Text style={styles.senderName}>{item.senderName || 'Unknown'}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{formatDistanceToNow(item.createdAt)} ago</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <AntDesign name="delete" size={24} color="red" />
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={styles.loadingIndicator} />
      ) : notifications.length === 0 ? (
        <Text style={styles.emptyMessage}>No notifications available.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingIndicator: {
    marginTop: '50%',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
    marginTop: '50%',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  senderPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  notificationText: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  message: {
    fontSize: 16,
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default NotificationsScreen;
