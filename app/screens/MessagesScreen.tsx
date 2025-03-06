// MessagesScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  onSnapshot,
  where,
  deleteDoc,
  doc,
  getDoc,
  orderBy, // Import orderBy
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { auth, db } from "../../firebase";

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  timestamp?: Date;
  unread?: number;
}

interface RecipientDetails {
  [key: string]: {
    name: string;
    profilePhoto?: string;
  };
}

const MessagesScreen = ({ navigation }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [recipientDetails, setRecipientDetails] = useState<RecipientDetails>({});
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUserId),
      
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as Chat[];

      // Sort chats manually in case of server timestamp issues or initial load
      const sortedChats = [...fetchedChats].sort((a, b) => {
        if (!a.timestamp) return 1; // Move chats without timestamp to the end
        if (!b.timestamp) return -1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });


      setChats(sortedChats);
      setLoading(false);

      sortedChats.forEach((chat) => {
        const recipientId = chat.participants.find((id) => id !== currentUserId);
        if (recipientId && !recipientDetails[recipientId]) {
          fetchRecipientDetails(recipientId);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const fetchRecipientDetails = async (recipientId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", recipientId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData) {
          setRecipientDetails((prev) => ({
            ...prev,
            [recipientId]: {
              name: userData.name,
              profilePhoto: userData.profilePhoto,
            },
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching recipient details:", error);
    }
  };

  const handleDeleteChat = (chatId: string) => {
    Alert.alert(
      "Delete Conversation",
      "This will permanently delete the conversation history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "chats", chatId));
              setChats((prev) => prev.filter((chat) => chat.id !== chatId));
            } catch (error) {
              console.error("Error deleting chat:", error);
            }
          },
        },
      ]
    );
  };

  const filteredChats = chats.filter((chat) => {
    const recipientId = chat.participants.find((id) => id !== auth.currentUser?.uid);
    const recipient = recipientDetails[recipientId || ""];
    return recipient?.name?.toLowerCase().includes(searchText.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#F8F9FF", "#FFFFFF"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Search conversations..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const recipientId = item.participants.find((id) => id !== auth.currentUser?.uid) || "";
            const recipient = recipientDetails[recipientId];

            return (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() =>
                  navigation.navigate("ChatScreen", {
                    chatId: item.id,
                    recipientId,
                    recipientName: recipient?.name || "Unknown",
                    recipientPhoto: recipient?.profilePhoto,
                  })
                }
                onLongPress={() => handleDeleteChat(item.id)}
              >
                {recipient?.profilePhoto ? (
                  <Image
                    source={{ uri: recipient.profilePhoto }}
                    style={styles.profilePhoto}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={56}
                    color="#E8E8E8"
                    style={styles.profilePlaceholder}
                  />
                )}

                <View style={styles.chatInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.recipientName} numberOfLines={1}>
                      {recipient?.name || "Unknown"}
                    </Text>
                    {item.timestamp && (
                      <Text style={styles.timestamp}>
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </Text>
                    )}
                  </View>

                  <View style={styles.messageRow}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {item.lastMessage || "Sent a message"}
                    </Text>
                    {item.unread && item.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={100}
                color="#E8E8E8"
              />
              <Text style={styles.emptyText}>No conversations found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#1A1A1A",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profilePhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  profilePlaceholder: {
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    maxWidth: "70%",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    maxWidth: "80%",
  },
  unreadBadge: {
    backgroundColor: "#0066FF",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
});

export default MessagesScreen;
