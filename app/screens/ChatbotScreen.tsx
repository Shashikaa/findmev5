import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    memo
} from "react";
import {
    View,
    TextInput,
    FlatList,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    Linking,
    StatusBar
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator'; // Import image manipulator
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    addDoc,
    collection,
    serverTimestamp,
    getDocs,
    doc,
    getDoc,

    query,
    where,

    setDoc
} from "firebase/firestore";
import { db, auth } from "../../firebase"; // Adjust path if needed
import { sendMessageToGemini } from "../../api";
import Card from '../../components/Card'; // Import the Card component
import { debounce } from 'lodash';
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// Add these constants
const GOOGLE_VISION_API_KEY = "AIzaSyCWD8f7lr9B4rPQ9Wn-yqLvBTVKQhLNzow"; 
const SIMILARITY_THRESHOLD = 0.5;

// Add these interfaces
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

// Update the ChatbotScreen component to accept navigation prop
interface ChatbotScreenProps {
    navigation: any;
}

type Message = {
    sender: "user" | "bot";
    text: string;
    image?: string;
    results?: any[];
    loading?: boolean; // Add a loading flag for optimistic UI
};

const ChatbotScreen: React.FC<ChatbotScreenProps> = ({ navigation }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userMessage, setUserMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [imageUri, setImageUri] = useState<string>("");
    const [itemType, setItemType] = useState<"Lost" | "Found">("Lost");
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("Electronics");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [reward, setReward] = useState("");
    const [items, setItems] = useState<any[]>([]); // State to store items from firebase
    const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
    const [questionQueue, setQuestionQueue] = useState<string[]>([]);
    const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null); // Ref for FlatList

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [lostItemsSnapshot, foundItemsSnapshot] = await Promise.all([
                getDocs(collection(db, "lostItems")),
                getDocs(collection(db, "foundItems")),
            ]);

            const fetchedLostItems = lostItemsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const fetchedFoundItems = foundItemsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            const allItems = [...fetchedLostItems, ...fetchedFoundItems];
            setItems(allItems);
        } catch (error) {
            console.error("Error fetching data:", error);
            Alert.alert("Error", "Failed to fetch items.");
        }
    };

    const analyzeImageAndSearch = async (imageUri: string) => {
        setLoading(true);
        try {
            // Convert image to base64
            const response = await fetch(imageUri);
            const blob = await response.blob();
            const reader = new FileReader();
    
            reader.onloadend = () => {
                if (reader.result) {
                    const base64Image = (reader.result as string).split(',')[1]; // Ensure reader.result is string
    
                    // Log base64 image length
                    console.log("Base64 Image Length:", base64Image.length);
    
                    // Construct the request payload for Google Vision API
                    const requestData = {
                        requests: [{
                            image: { content: base64Image },
                            features: [{ type: "LABEL_DETECTION", maxResults: 5 }]
                        }]
                    };
    
                    // Log request data
                    console.log("Google Vision API Request:", JSON.stringify(requestData));
    
                    // Send to Google Vision API
                    axios.post(
                        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
                        requestData, // Send the constructed request data
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    )
                        .then(visionResponse => {
                            // Log the response from Google Vision API
                            console.log("Google Vision API Response:", JSON.stringify(visionResponse.data));
    
                            const labels = visionResponse.data.responses[0].labelAnnotations.map(
                                (label: any) => label.description.toLowerCase()
                            );
    
                            // Calculate similarity scores for each item
                            Promise.all(
                                items.map(async (item) => {
                                    try {
                                        const itemResponse = await axios.post(
                                            `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
                                            {
                                                requests: [{
                                                    image: { source: { imageUri: item.image } },
                                                    features: [{ type: "LABEL_DETECTION", maxResults: 5 }]
                                                }]
                                            },
                                            {
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                }
                                            }
                                        );
    
                                        const itemLabels = itemResponse.data.responses[0].labelAnnotations.map(
                                            (label: any) => label.description.toLowerCase()
                                        );
    
                                        const matchingLabels = labels.filter(label => itemLabels.includes(label));
                                        const score = matchingLabels.length / labels.length;
    
                                        return { ...item, similarityScore: score };
                                    } catch (itemError) {
                                       
                                        return { ...item, similarityScore: 0 };
                                    }
                                })
                            )
                                .then(itemsWithScores => {
                                    // Filter and sort items
                                    const filteredItems = itemsWithScores
                                        .filter(item => item.similarityScore! >= SIMILARITY_THRESHOLD)
                                        .sort((a, b) => b.similarityScore! - a.similarityScore!);
    
                                    // Update messages with results
                                    const botMessage: Message = {
                                        sender: "bot",
                                        text: `I found ${filteredItems.length} possible matches based on the image.`,
                                        image: imageUri,
                                        results: filteredItems,
                                    };
    
                                    setMessages((prev) => [...prev, botMessage]);
                                })
                                .catch(similarityError => {
                                    console.error("Error calculating similarity scores:", similarityError);
                                    Alert.alert("Error", "Failed to calculate similarity scores.");
                                    setMessages((prev) => [
                                        ...prev,
                                        { sender: "bot", text: "Failed to calculate similarity scores." },
                                    ]);
                                });
                        })
                        .catch(visionError => {
                            console.error("Error analyzing image:", visionError);
                            Alert.alert("Error", "Failed to analyze image.");
                            setMessages((prev) => [
                                ...prev,
                                { sender: "bot", text: "Failed to analyze image." },
                            ]);
                        });
                } else {
                    console.error("Failed to read image as base64");
                    Alert.alert("Error", "Failed to read image as base64.");
                    setMessages((prev) => [
                        ...prev,
                        { sender: "bot", text: "Failed to read image as base64." },
                    ]);
                }
            };
    
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                Alert.alert("Error", "Failed to read the image file.");
                setMessages((prev) => [
                    ...prev,
                    { sender: "bot", text: "Failed to read the image file." },
                ]);
            };
    
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Error analyzing image:", error);
            Alert.alert("Error", "Failed to analyze image.");
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "Failed to analyze image." },
            ]);
        } finally {
            setLoading(false);
        }
    };
    

    const handleImageUpload = async (): Promise<void> => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(
                    "Permission needed",
                    "Please grant camera roll permissions to use this feature."
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.5, // Reduce quality for faster processing
                base64: true,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                let selectedImageUri = result.assets[0].uri;

                // Resize the image *before* sending to Gemini
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    selectedImageUri,
                    [{ resize: { width: 800 } }], // Resize to a maximum width of 800 pixels
                    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Further compress
                );

                selectedImageUri = manipulatedImage.uri;

                setImageUri(selectedImageUri);

                // Optimistic UI update
                setMessages(prevMessages => [...prevMessages, {
                    sender: "bot",
                    text: "Analyzing image...",
                
                    image: selectedImageUri,
                }]);

                // Analyze image and search items
                await analyzeImageAndSearch(selectedImageUri);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image.");
        }
    };

    const uploadImageToStorage = async (uri: string) => {
        if (!auth.currentUser) {
            Alert.alert(
                "Authentication Error",
                "You need to be signed in to create a post."
            );
            return null;
        }

        const filename = `post_${Date.now()}.jpg`;
        const storageRef = ref(getStorage(), `images/posts/${auth.currentUser.uid}/${filename}`);
        setLoading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading image: ", error);
            Alert.alert("Upload Failed", "Failed to upload image.");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const resetItemState = () => {
        setItemType("Lost");
        setItemName("");
        setCategory("Electronics");
        setDescription("");
        setLocation("");
        setPhoneNumber("");
        setImageUri("");
        setReward("");
    };

    const handleSubmit = async () => {
        if (!auth.currentUser) {
            Alert.alert(
                "Authentication Error",
                "You need to be signed in to create a post."
            );
            return;
        }
        if (!auth.currentUser.uid) {
            Alert.alert(
                "Authentication Error",
                "User ID is missing."
            );
            return;
        }

        setLoading(true);
        try {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (!userDoc.exists()) {
                Alert.alert("Error", "User data not found.");
                return;
            }

            const userData = userDoc.data();
            const userName = userData?.name || "Anonymous";
            const profilePhoto = userData?.profilePhoto || "";
            let imageUrl = imageUri;

            if (imageUri && imageUri.startsWith('file://')) {
                const uploadedImageUrl = await uploadImageToStorage(imageUri);
                if (!uploadedImageUrl) {
                    Alert.alert("Error", "Failed to upload image.");
                    return;
                }
                imageUrl = uploadedImageUrl;
            }
            const collectionName = itemType === "Lost" ? "lostItems" : "foundItems";

            if (!itemType || !itemName || !category || !description || !location || !phoneNumber) {
                Alert.alert("Error", "One or more required fields are missing.");
                return;
            }
            await addDoc(collection(db, collectionName), {
                uid: auth.currentUser.uid,
                userName,
                profilePhoto,
                itemType,
                itemName,
                category,
                description,
                location,
                phoneNumber,
                date: new Date().toISOString(),
                image: imageUrl,
                reward,
                createdAt: serverTimestamp(),
            });

            Alert.alert("Success", "Your post has been submitted.");
            resetItemState();
        } catch (error) {
            console.error("Error adding document: ", error);
            Alert.alert("Error", "Failed to submit the post.");
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        Linking.openURL(`tel:${phoneNumber}`)
            .catch(err => console.error('An error occurred while trying to call', err));
    };

    const handleMessageItemOwner = async (item: any) => {
        try {
            const userQuery = query(collection(db, "users"), where("uid", "==", item.uid));
            const userSnapshot = await getDocs(userQuery);

            if (userSnapshot.empty) {
                Alert.alert("Error", "Could not find item owner");
                return;
            }

            const ownerDoc = userSnapshot.docs[0];
            const ownerData = ownerDoc.data();

            const ownerUser: User = {
                id: ownerDoc.id,
                name: ownerData.name,
                email: ownerData.email,
                profilePhoto: ownerData.profilePhoto,
                phoneNumber: ownerData.phoneNumber
            };

            await handleMessageUser(ownerUser);
        } catch (error) {
            console.error("Error messaging item owner:", error);
            Alert.alert("Error", "Failed to message item owner. Please try again.");
        }
    };

    const handleMessageUser = async (targetUser: User) => {
        try {
            if (!auth.currentUser) {
                Alert.alert("Error", "You must be logged in to send messages");
                return;
            }

            const currentUserId = auth.currentUser.uid;
            const chatId = [currentUserId, targetUser.id].sort().join('_');
            const chatRef = doc(db, "chats", chatId);
            const chatDoc = await getDoc(chatRef);

            if (!chatDoc.exists()) {
                const chatRoom: ChatRoom = {
                    id: chatId,
                    participants: [currentUserId, targetUser.id],
                    createdAt: serverTimestamp(),
                };

                await setDoc(chatRef, chatRoom);

                const messagesRef = collection(db, "chats", chatId, "messages");
                await setDoc(doc(messagesRef), {
                    text: "Chat started",
                    senderId: currentUserId,
                    timestamp: serverTimestamp(),
                    system: true
                });
            }

            const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
            const currentUserData = currentUserDoc.data();

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

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === "user";

        // Show loading indicator for the "Analyzing image..." message
        if (item.loading) {
            return (
                <View style={[styles.messageContainer, styles.botMessage]}>
                    <View style={[styles.messageBubble, styles.botBubble]}>
                        <Text style={[styles.messageText, styles.botMessageText]}>
                            Analyzing image...
                        </Text>
                        <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                </View>
            );
        }
        return (
            <View style={[
                styles.messageContainer,
                isUser ? styles.userMessage : styles.botMessage
            ]}>
                <View style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.botBubble
                ]}>
                    <Text style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.botMessageText
                    ]}>{item.text}</Text>
                    {item.image && (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.messageImage}
                            resizeMode="cover"
                        />
                    )}
                    {item.results && item.results.length > 0 && (
                        <View style={{ paddingTop: 20 }}>
                            {item.results.map((result, index) => (
                                <MemoizedCard
                                    key={index}
                                    image={result.image}
                                    profilePhoto={result.profilePhoto}
                                    itemName={result.itemName}
                                    description={result.description}
                                    location={result.location}
                                    dateLost={result.date}
                                    reward={result.reward}
                                    userName={result.userName}
                                    createdAt={result.createdAt}
                                    onCall={() => handleCall(result.phoneNumber)}
                                    onMessage={() => handleMessageItemOwner(result)} id={""}                                />
                            ))}
                        </View>

                    )}
                </View>
            </View>
        );
    };

    const handleSendMessage = async (): Promise<void> => {
        if (userMessage.trim() === "") return;
        // 0. Add user message to the chat
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        setUserMessage("");

        // 1. Check for intent (lost/found report, image search, or general conversation)
        const isReport =
            userMessage.toLowerCase().includes("lost") ||
            userMessage.toLowerCase().includes("missing") ||
            userMessage.toLowerCase().includes("find") ||
            userMessage.toLowerCase().includes("found");

        // 2. Handle image upload (if there is an image URI)
        if (imageUri) {
            handleImageUpload(); // This will call analyzeImageAndSearch to handle the image and display results
            setImageUri(""); 
            return;
        }

        // 3. If there are active questions, process the user response
        if (isAwaitingResponse) {
            await processUserResponse(userMessage);
            return;
        }

        // 4. If a report is initiated, start the detail collection flow
        if (isReport) {
            await startReportProcess();
            return;
        }
        // 5. Default case: Send the message to Gemini if it's none of the above
        setLoading(true);
        try {
            const response = await sendMessageToGemini(userMessage, imageUri);
            setMessages((prev) => [...prev, { sender: "bot", text: response }]);
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "Sorry, I encountered an error." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const processUserResponse = async (response: string): Promise<void> => {
        setIsAwaitingResponse(false);
        if (currentQuestion === "itemType") {
            if (response.toLowerCase().includes("lost")) {
                setItemType("Lost");
            } else {
                setItemType("Found");
            }
            setItemName("")
            setMessages((prev) => [...prev, { sender: "user", text: response }]);
            askQuestion("itemName", "What is the name of the item?");
        } else if (currentQuestion === "itemName") {
            setItemName(response);
            setMessages((prev) => [...prev, { sender: "user", text: response }]);
            askQuestion("category", "What category does the item belong to?");

        } else if (currentQuestion === "category") {
            setCategory(response);
            setMessages((prev) => [...prev, { sender: "user", text: response }]);

            askQuestion("description", "Please provide a description of the item:");
        } else if (currentQuestion === "description") {
            setDescription(response);
            setMessages((prev) => [...prev, { sender: "user", text: response }]);
            askQuestion("location", "Where was the item lost or found?");
        } else if (currentQuestion === "location") {
            setLocation(response);
            setMessages((prev) => [...prev, { sender: "user", text: response }]);
            askQuestion("phoneNumber", "Please enter your phone number:");
        } else if (currentQuestion === "phoneNumber") {
            setPhoneNumber(response);
            setMessages((prev) => [...prev, { sender: "user", text: response }]);
            askQuestion("reward", "Is there a reward offered? If so, please specify:");
        } else if (currentQuestion === "reward") {
            setReward(response);
            setMessages((prev) => [...prev, { sender: "user", text: response }]);

            // After the reward question, you can submit the report automatically
            handleSubmit();

        }
        else {
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "Sorry, I didn't understand your response." },
            ]);
            setQuestionQueue([]);
            setCurrentQuestion(null);
            setIsAwaitingResponse(false);
        }
    };

    const askQuestion = (field: string, question: string) => {
        setCurrentQuestion(field);
        setMessages((prev) => [...prev, { sender: "bot", text: question }]);
        setIsAwaitingResponse(true);
    };

    const startReportProcess = async (): Promise<void> => {
        // Initial questions for creating a report
        resetItemState();
        askQuestion("itemType", "Was the item lost or found?");
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>

           
            <View style={styles.header}>
                <Image
                    source={require('../../assets/images/chatbot.png')}  // Replace with your image path
                    style={{ width: 45, height: 38 }} // Adjust size as needed
                />
            <View>
                    <Text style={styles.headerTitle}>Chat with FindMe</Text>
                    <Text style={styles.headerSubtitle}>We are online!</Text>
            </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={{
                            paddingBottom: 20,
                            paddingTop: insets.top,
                        }}
                        onContentSizeChange={() =>
                            flatListRef.current?.scrollToEnd({ animated: true })
                        }
                    />

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    )}

                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handleImageUpload}
                        >
                            <Ionicons name="camera" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={userMessage}
                            onChangeText={setUserMessage}
                            onSubmitEditing={handleSendMessage}
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                            <Ionicons name="send" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    messageContainer: {
        flexDirection: "row",
        padding: 10,
    },
    userMessage: {
        justifyContent: "flex-end",
    },
    botMessage: {
        justifyContent: "flex-start",
    },


    messageText: {
        fontSize: 16,
    },
    userMessageText: {
        color: "#000",
    },
    botMessageText: {
        color: "#000",
    },
    messageImage: {
        width: 200,
        height: 150,
        borderRadius: 10,
        marginTop: 5,
    },

    uploadButton: {
        padding: 10,
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    messageBubble: {
        maxWidth: "75%",
        borderRadius: 20,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    userBubble: {
        backgroundColor: "#007AFF",
        alignSelf: "flex-end",
        borderBottomRightRadius: 0,
    },
    botBubble: {
        backgroundColor: "#f0f0f0",
        alignSelf: "flex-start",
        borderBottomLeftRadius: 0,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        
        padding: 55,
      paddingBottom: 30,
        backgroundColor: "#007AFF",
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginTop: Platform.OS === "ios" ? -50 : 0,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
   
    },
    headerTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        marginLeft: 20,
   
    },
    headerSubtitle: {
        color: "#fff",
        fontSize: 14,
        opacity: 0.8,
        marginLeft: 20,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderColor: "#ddd",
    },
    input: {
        flex: 1,
        backgroundColor: "#f7f7f7",
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        borderColor: "#ddd",
        borderWidth: 1,
    },
    sendButton: {
        marginLeft: 10,
        
        borderRadius: 50,
        padding: 10,
    },
    
    
});

// Memoize the Card component to prevent unnecessary re-renders
const MemoizedCard = memo(Card);

export default ChatbotScreen;
