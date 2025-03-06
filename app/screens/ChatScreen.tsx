import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { collection, addDoc, onSnapshot, query, orderBy, doc, getDoc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { RouteProp } from "@react-navigation/native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import usePushNotifications from '../../hooks/usePushNotifications';

type RootStackParamList = {
  ChatScreen: { chatId: string; recipientName: string; recipientPhoto: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, "ChatScreen">;

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

import { StackNavigationProp } from '@react-navigation/stack';

interface ChatScreenProps {
  route: ChatScreenRouteProp;
  navigation: StackNavigationProp<RootStackParamList, "ChatScreen">;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { chatId, recipientName, recipientPhoto } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipientDetails, setRecipientDetails] = useState({
    name: recipientName,
    photo: recipientPhoto,
  });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const currentUserId = auth.currentUser?.uid;
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [recipientId, setRecipientId] = useState<string>('');
  const { sendPushNotification } = usePushNotifications("message");

  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard appears
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const [id1, id2] = chatId.split("_");
    const recipient = currentUserId === id1 ? id2 : id1;
    setRecipientId(recipient);

    const fetchRecipientDetails = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", recipient));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRecipientDetails({
            name: userData?.name || "Unknown",
            photo: userData?.profilePhoto || recipientPhoto,
          });
        }
      } catch (error) {
        console.error("Error fetching recipient details:", error);
      }
    };

    fetchRecipientDetails();
  }, [chatId, currentUserId, recipientPhoto]);

  useEffect(() => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as Message[];
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !auth.currentUser) return;
  
    // Store the message text before clearing the input
    const messageText = newMessage;
    
    // Clear input field immediately
    setNewMessage("");
    
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.data();
  
      const senderName =
        currentUserData?.name ||
        currentUserData?.displayName ||
        auth.currentUser.displayName ||
        "User";
  
      const senderPhoto =
        currentUserData?.profilePhoto ||
        currentUserData?.photoURL ||
        auth.currentUser.photoURL ||
        "";
  
      const messagesRef = collection(db, "chats", chatId, "messages");
      const messageDoc = await addDoc(messagesRef, {
        senderId: auth.currentUser.uid,
        senderName: senderName,
        text: messageText,
        createdAt: new Date(),
      });
  
      // Update the timestamp in the chat document
      const chatRef = doc(db, "chats", chatId);
      await getDoc(chatRef).then(async (docSnap) => {
        if (docSnap.exists()) {
          await updateDoc(chatRef, { 
            timestamp: new Date(),
            lastMessage: messageText 
          });
        } else {
          await setDoc(chatRef, {
            participants: [auth.currentUser ? auth.currentUser.uid : "unknown", recipientId],
            lastMessage: messageText,
            timestamp: new Date(),
          });
        }
      });
  
      const notificationsRef = collection(db, "users", recipientId, "notifications");
      await addDoc(notificationsRef, {
        type: "message",
        message: messageText,
        senderId: currentUserId,
        senderName: senderName,
        senderPhoto: senderPhoto,
        chatId: chatId,
        messageId: messageDoc.id,
        createdAt: new Date(),
        read: false,
      });
  
      if (sendPushNotification) {
        await sendPushNotification(recipientId, `${senderName}: ${messageText}`, chatId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      await deleteDoc(messageRef);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const showDeleteConfirmation = (messageId: string) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel", onPress: () => setSelectedMessage(null) },
      { text: "Delete", style: "destructive", onPress: () => handleDeleteMessage(messageId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient colors={["#F8F9FF", "#FFFFFF"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>

          {recipientDetails.photo ? (
            <Image
              source={{ uri: recipientDetails.photo }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Feather name="user" size={24} color="#FFFFFF" />
            </View>
          )}

          <View style={styles.headerTextContainer}>
            <Text style={styles.recipientName} numberOfLines={1}>
              {recipientDetails.name}
            </Text>
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        {/* Main content with KeyboardAvoidingView wrapper */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={styles.messagesContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatListContent}
              inverted={true}
              renderItem={({ item }) => (
                <TouchableWithoutFeedback
                  onLongPress={() => {
                    if (item.senderId === currentUserId) {
                      setSelectedMessage(item);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      item.senderId === currentUserId
                        ? styles.currentUserMessage
                        : styles.otherUserMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        item.senderId === currentUserId
                          ? styles.currentUserText
                          : styles.otherUserText,
                      ]}
                    >
                      {item.text}
                    </Text>
                    <Text style={styles.messageTime}>
                      {formatDistanceToNow(item.createdAt, {
                        addSuffix: true,
                      })}
                    </Text>
                  </View>
                </TouchableWithoutFeedback>
              )}
            />
          </View>

          {/* Input Area - Outside FlatList but inside KeyboardAvoidingView */}
          <View style={styles.inputArea}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <MaterialIcons name="send" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>

      {selectedMessage && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedMessage(null)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Delete this message?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelectedMessage(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => {
                  if (selectedMessage) {
                    showDeleteConfirmation(selectedMessage.id);
                  }
                }}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    marginRight: 16,
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#A9A9A9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  recipientName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  statusText: {
    fontSize: 14,
    color: "#666",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  flatListContent: {
    paddingVertical: 16,
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  currentUserMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  otherUserMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  currentUserText: {
    color: "#1A1A1A",
  },
  otherUserText: {
    color: "#1A1A1A",
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingBottom: 40,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#007BFF",
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    width: 300,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  modalButtonText: {
    color: '#666',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#FF453A',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default ChatScreen;