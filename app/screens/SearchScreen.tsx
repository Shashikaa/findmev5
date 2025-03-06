import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc,
  query,
  where,
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../../firebase"
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Card from "../../components/Card";
import { Ionicons, Feather } from "@expo/vector-icons";

const GOOGLE_VISION_API_KEY = "AIzaSyCWD8f7lr9B4rPQ9Wn-yqLvBTVKQhLNzow";
const SIMILARITY_THRESHOLD = 0.5;

interface Item {
  id: string;
  category: string;
  itemName: string;
  description: string;
  image: string;
  phoneNumber: string;
  uid: string;
  similarityScore?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  profilePhoto: string;
  phoneNumber: string;
}

interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: any;
  createdAt: any;
}
const SearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<"items" | "users">("items");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const insets = useSafeAreaInsets();
  const currentUserId = auth.currentUser?.uid;

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [currentUserId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, "lostItems")),
        getDocs(collection(db, "users")),
      ]);

      const fetchedItems = itemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Item));
      
      const fetchedUsers = usersSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as User))
        .filter((user) => user.id !== currentUserId);

      setItems(fetchedItems);
      setSearchResults(fetchedItems);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to fetch data.");
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant camera roll permissions to use this feature.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
        await analyzeImage(result.assets[0].base64 || '');
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setIsLoading(true);
    try {
      const visionResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          requests: [{
            image: { content: base64Image },
            features: [{ type: "LABEL_DETECTION", maxResults: 5 }]
          }]
        }
      );

      const labels = visionResponse.data.responses[0].labelAnnotations.map(
        (label: any) => label.description.toLowerCase()
      );

      const itemsWithScores = await Promise.all(
        items.map(async (item) => {
          try {
            const itemResponse = await axios.post(
              `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
              {
                requests: [{
                  image: { source: { imageUri: item.image } },
                  features: [{ type: "LABEL_DETECTION", maxResults: 5 }]
                }]
              }
            );

            const itemLabels = itemResponse.data.responses[0].labelAnnotations.map(
              (label: any) => label.description.toLowerCase()
            );

            const matchingLabels = labels.filter(label => itemLabels.includes(label));
            const score = matchingLabels.length / labels.length;

            return { ...item, similarityScore: score };
          } catch (error) {
            return { ...item, similarityScore: 0 };
          }
        })
      );

      const filteredItems = itemsWithScores
        .filter(item => item.similarityScore! >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.similarityScore! - a.similarityScore!);

      setSearchResults(filteredItems);
    } catch (error) {
      console.error("Vision API error:", error);
      Alert.alert("Error", "Failed to analyze image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults(items);
      return;
    }

    if (activeTab === "items") {
      const filtered = items.filter(item =>
        item.itemName.toLowerCase().includes(text.toLowerCase()) ||
        item.category.toLowerCase().includes(text.toLowerCase()) ||
        item.description.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMessageUser = async (targetUser: User) => {
    try {
      if (!auth.currentUser) {
        Alert.alert("Error", "You must be logged in to send messages");
        return;
      }
  
      const currentUserId = auth.currentUser.uid;
      
      // Create a unique chat ID by sorting user IDs
      const chatId = [currentUserId, targetUser.id].sort().join('_');
  
      // Check if chat already exists
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
  
      if (!chatDoc.exists()) {
        // Create new chat room if it doesn't exist
        const chatRoom: ChatRoom = {
          id: chatId,
          participants: [currentUserId, targetUser.id],
          createdAt: serverTimestamp(),
        };
  
        await setDoc(chatRef, chatRoom);
  
        // Create initial message
        const messagesRef = collection(db, "chats", chatId, "messages");
        await setDoc(doc(messagesRef), {
          text: "Chat started",
          senderId: currentUserId,
          timestamp: serverTimestamp(),
          system: true
        });
      }
  
      // Get current user's details for navigation
      const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
      const currentUserData = currentUserDoc.data();
  
      // Navigate to chat screen with required params
      navigation.navigate("ChatScreen", {
        chatId,
        recipientId: targetUser.id,
        recipientName: targetUser.name,
        recipientPhoto: targetUser.profilePhoto,
        currentUserName: currentUserData?.name || "",
        currentUserPhoto: currentUserData?.profilePhoto || ""
      });
  
    } catch (error) {
      console.error("Error creating chat:", error);
      Alert.alert("Error", "Failed to start chat. Please try again.");
    }
  };

  const handleMessageItemOwner = async (item: Item) => {
    try {
      // Get owner's user document
      const userQuery = query(collection(db, "users"), where("uid", "==", item.uid));
      const userSnapshot = await getDocs(userQuery);
  
      if (userSnapshot.empty) {
        Alert.alert("Error", "Could not find item owner");
        return;
      }
  
      const ownerDoc = userSnapshot.docs[0];
      const ownerData = ownerDoc.data();
      
      // Create user object from owner data
      const ownerUser: User = {
        id: ownerDoc.id,
        name: ownerData.name,
        email: ownerData.email,
        profilePhoto: ownerData.profilePhoto,
        phoneNumber: ownerData.phoneNumber
      };
  
      // Use the same handleMessageUser function
      await handleMessageUser(ownerUser);
  
    } catch (error) {
      console.error("Error messaging item owner:", error);
      Alert.alert("Error", "Failed to message item owner. Please try again.");
    }
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <LinearGradient colors={["#ffffff", "#f8f9fa"]} style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "items" && styles.activeTab]}
            onPress={() => setActiveTab("items")}
          >
            <Text style={[styles.tabText, activeTab === "items" && styles.activeTabText]}>Items</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "users" && styles.activeTab]}
            onPress={() => setActiveTab("users")}
          >
            <Text style={[styles.tabText, activeTab === "users" && styles.activeTabText]}>Users</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === "items" ? "Search items..." : "Search users..."}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleTextSearch}
          />
        </View>
        {activeTab === "items" && (
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Search by Image</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator size="large" color="#6a11cb" style={styles.loader} />
      ) : (
        <FlatList
          data={activeTab === "items" ? searchResults : (filteredUsers as unknown as Item[])}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            activeTab === "items" ? (
<Card
              profilePhoto={undefined} location={""} dateLost={""} reward={""} userName={""} createdAt={undefined} {...(item as Item)}
              onCall={() => Alert.alert("Call", `Calling ${(item as Item).phoneNumber}`)}
              onMessage={() => handleMessageItemOwner(item as Item)}/>
            ) : (
              <View style={styles.userCard}>
                <Image
                  source={{ uri: (item as unknown as User).profilePhoto || "https://via.placeholder.com/50" }}
                  style={styles.userImage}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{(item as unknown as User).name}</Text>
                  <Text style={styles.userEmail}>{(item as unknown as User).email}</Text>
                </View>
                <TouchableOpacity
  style={styles.messageButton}
  onPress={() => handleMessageUser(item as unknown as User)}
>
                  <Feather name="message-circle" size={24} color="#6a11cb" />
                </TouchableOpacity>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery || image ? "No results found" : "Start searching..."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#6a11cb",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#6a11cb",
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6a11cb",
    borderRadius: 8,
    padding: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  loader: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  messageButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default SearchScreen;