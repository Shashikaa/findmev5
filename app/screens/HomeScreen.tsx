import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Image,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  orderBy,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import Header from "../../components/Header";
import LostItemsList from "../../components/LostItemsList";
import FoundItemsList from "../../components/FoundItemsList";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";


interface Post {
  id: string;
  title: string;
  location: string;
  description: string;
  reward?: string;
  image: string;
  userId: string;
  phoneNumber: string;
  sharedBy?: string;
  itemName: string;
  dateLost: string;
  userName: string;
  createdAt: string;
  profilePhoto: string;
  found: boolean;
}

const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"LostItems" | "FoundItems">("LostItems");
  const [loading, setLoading] = useState({ lost: true, found: true });
  const [lostItems, setLostItems] = useState<Post[]>([]);
  const [foundItems, setFoundItems] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) setCurrentUserId(user.uid);
    return fetchItems();
  }, []);

  const fetchItems = useCallback(() => {
    setLoading({ lost: true, found: true });

    const unsubscribeLost = onSnapshot(
      query(collection(db, "lostItems"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const items: Post[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        setLostItems(
          items
            .filter((item) => !item.found)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        );
        setLoading((prev) => ({ ...prev, lost: false }));
      },
      (error) => handleError(error, "Lost")
    );

    const unsubscribeFound = onSnapshot(
      query(collection(db, "foundItems"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const items: Post[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        setFoundItems(
          items
            .filter((item) => !item.found)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
        );
        setLoading((prev) => ({ ...prev, found: false }));
      },
      (error) => handleError(error, "Found")
    );

    return () => {
      unsubscribeLost();
      unsubscribeFound();
    };
  }, []);

  const handleError = (error: any, itemType: string) => {
    console.error(`Error fetching ${itemType.toLowerCase()} items:`, error);
    Alert.alert("Error", `Failed to load ${itemType.toLowerCase()} items. Please try again later.`);
    setLoading((prev) => ({ ...prev, [itemType.toLowerCase()]: false }));
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("Error", "Phone number not available.");
      return;
    }

    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Your device does not support this feature.");
    });
  };

  const onMessage = async (
    postUserId: string,
    postId: string,
    postUserName: string,
    profilePhoto: string
  ) => {
    if (!currentUserId) return;
  
    try {
      const chatId = [currentUserId, postUserId].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
  
      const chatSnapshot = await getDoc(chatRef);
      if (!chatSnapshot.exists()) {
        await setDoc(chatRef, {
          participants: [currentUserId, postUserId],
          postId,
          createdAt: serverTimestamp(),
        });
      }
  
      // Navigate to ChatScreen with recipient details
      navigation.navigate("ChatScreen", {
        chatId,
        recipientId: postUserId,
        recipientName: postUserName,  
        recipientPhoto: profilePhoto,
      });
    } catch (error) {
      console.error("Error in creating chat:", error);
      Alert.alert("Error", "An error occurred while starting the chat.");
    }
  };
  

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header />

      <View style={styles.tabsContainer}>
        {["LostItems", "FoundItems"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as "LostItems" | "FoundItems")}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.replace("Items", " Items")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading.lost || loading.found} onRefresh={fetchItems} />}
      >
        {activeTab === "LostItems" ? (
          loading.lost ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : lostItems.length > 0 ? (
            <LostItemsList items={lostItems} onCall={handleCall} onMessage={onMessage} />
          ) : (
            <Text style={styles.noItemsText}>No active lost items available.</Text>
          )
        ) : loading.found ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : foundItems.length > 0 ? (
          <FoundItemsList items={foundItems} onCall={handleCall} onMessage={onMessage} />
        ) : (
          <Text style={styles.noItemsText}>No active found items available.</Text>
        )}
      </ScrollView>

      {/* Add Chatbot Button */}
      <TouchableOpacity
      style={styles.chatButton}
      onPress={() => navigation.navigate('ChatbotScreen')}
    >
      <Image
        source={require('../../assets/images/chatbot.png')}  // Replace with your image path
        style={{ width: 28, height: 28 }} // Adjust size as needed
      />
    </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  tabsContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderBottomColor: "#6200EA" },
  tabText: { fontSize: 16, color: "#4B5563" },
  activeTabText: { color: "#6200EA", fontWeight: "600" },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  noItemsText: { fontSize: 16, color: "#666", textAlign: "center", marginTop: 20 },

  // Chat button styles
  chatButton: {
    position: "absolute",
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    backgroundColor: "#fff",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default HomeScreen;