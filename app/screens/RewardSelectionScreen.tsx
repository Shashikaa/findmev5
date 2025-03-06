import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    Animated,
    SafeAreaView,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Button,
} from "react-native";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    getDoc
} from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: string;
    name: string;
    profilePhoto?: string;
    stars?: number;
    totalRatings?: number;
    stripeSetupComplete?: boolean;
}

interface RewardSelectionScreenProps {
    route: any;
    navigation: any;
}

const RewardSelectionScreen: React.FC<RewardSelectionScreenProps> = ({ route, navigation }) => {
    const { post } = route.params;
    const auth = getAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [rating, setRating] = useState(0);
    const starScale = new Animated.Value(1);
    const [isOwner, setIsOwner] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);

    // Simplified navigation without complex listeners
    const handleGoBackWithoutReward = () => {
        navigation.navigate('ProfileScreen', {
            rewardGiven: false,
            postId: post.id
        });
    };

    const handleSubmitRating = async () => {
        if (!selectedUser) {
            Alert.alert("Error", "Please select a user to rate.");
            return;
        }

        if (rating === 0) {
            Alert.alert("Error", "Please give at least 1 star rating.");
            return;
        }

        try {
            setIsSubmitting(true);
            const userRef = doc(db, "users", selectedUser.id);
            await updateDoc(userRef, {
                stars: (selectedUser.stars || 0) + rating,
                totalRatings: (selectedUser.totalRatings || 0) + 1,
            });

            const postRef = doc(db, post.collectionName || "lostItems", post.id);
            await updateDoc(postRef, {
                rewarded: true,
                rewardPending: false,
                found: true,
            });

            Alert.alert(
                "Success!",
                `${rating} stars given to ${selectedUser.name}`,
                [{
                    text: "OK",
                    onPress: () => navigation.goBack({
                        rewardGiven: true,
                        postId: post.id,
                    }),
                }]
            );
        } catch (error) {
            console.error("Error updating rating:", error);
            Alert.alert("Error", "Failed to submit rating.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);

            if (searchQuery.trim() === "") {
                setUsers([]);
                setIsLoading(false);
                return;
            }

            try {
                const q = query(
                    collection(db, "users"),
                    where("name", ">=", searchQuery),
                    where("name", "<=", searchQuery + "\uf8ff")
                );
                const querySnapshot = await getDocs(q);
                const fetchedUsers = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name || "Unknown",
                    profilePhoto: doc.data().profilePhoto || "",
                    stars: doc.data().stars || 0,
                    totalRatings: doc.data().totalRatings || 0,
                    stripeSetupComplete: doc.data().stripeSetupComplete || false,
                }));
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
                Alert.alert("Error", "Failed to fetch users.");
            } finally {
                setIsLoading(false);
            }
        };

        const debounceSearch = setTimeout(() => fetchUsers(), 300);
        return () => clearTimeout(debounceSearch);
    }, [searchQuery]);

    useEffect(() => {
        setIsOwner(auth.currentUser?.uid === post.uid);
    }, [post.uid]);

    useEffect(() => {
        const checkIfModalSeen = async () => {
            try {
                const hasSeenModal = await AsyncStorage.getItem('hasSeenModal');
                if (!hasSeenModal) {
                    setIsModalVisible(true);
                    await AsyncStorage.setItem('hasSeenModal', 'true');
                }
            } catch (error) {
                console.error('Error checking AsyncStorage:', error);
            }
        };
        checkIfModalSeen();
    }, []);

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const handleClosePaymentModal = () => {
        setIsPaymentModalVisible(false);
    };

    const animateStar = () => {
        Animated.sequence([
            Animated.timing(starScale, {
                toValue: 1.2,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(starScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleStarPress = (selectedRating: number) => {
        setRating(selectedRating);
        animateStar();
    };

    const renderStarIcon = (starNumber: number) => (
        <TouchableOpacity
            key={starNumber}
            onPress={() => handleStarPress(starNumber)}
            activeOpacity={0.7}
        >
            <Animated.View style={{ transform: [{ scale: rating >= starNumber ? starScale : 1 }] }}>
                <View style={styles.starIconContainer}>
                    <Ionicons
                        name={rating >= starNumber ? "star" : "star-outline"}
                        size={32}
                        color={rating >= starNumber ? "#FFD700" : "#D1D5DB"}
                    />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
    
    const renderUserStats = (stars: number | undefined, totalRatings: number | undefined) => {
        const avgRating = totalRatings && totalRatings > 0 ? (stars || 0) / totalRatings : 0;
        return (
            <View style={styles.statsContainer}>
                <Text style={styles.userStats}>
                    ⭐ {(stars || 0).toFixed(0)} ({avgRating.toFixed(1)})
                </Text>
            </View>
        );
    };

    const handleShowPaymentOptions = () => {
        if (!selectedUser) {
            Alert.alert("Error", "Please select a user first.");
            return;
        }
        setIsPaymentModalVisible(true);
    };

    const handleStripePayment = () => {
        handleClosePaymentModal();
        // Navigate to the Stripe payment screen
        navigation.navigate('StripeTransferScreen', {
            recipientId: selectedUser?.id,
            recipientName: selectedUser?.name,
            postId: post.id
        });
    };

    const handleBankTransfer = () => {
        handleClosePaymentModal();
        // Navigate to the bank transfer screen
        navigation.navigate('BankTransferScreen', {
            recipientId: selectedUser?.id,
            recipientName: selectedUser?.name,
            postId: post.id
        });
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                {/* Introduction Modal */}
                <Modal
                    visible={isModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={handleCloseModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Give Rating To Founder</Text>
                            <Text style={styles.modalText}>
                                After your lost item is found, you can rate the user who found it.
                                You can rate users from 1 to 5 stars and submit your rating. Once you submit, the reward will be marked as given.
                            </Text>
                            <Button title="Got it!" onPress={handleCloseModal} />
                        </View>
                    </View>
                </Modal>

                {/* Payment Options Modal */}
                <Modal
                    visible={isPaymentModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={handleClosePaymentModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.paymentModalContent}>
                            <Text style={styles.modalTitle}>Choose Payment Method</Text>
                            <Text style={styles.modalText}>
                                How would you like to pay {selectedUser?.name}?
                            </Text>
                            
                            <TouchableOpacity 
                                style={styles.paymentOptionButton} 
                                onPress={handleStripePayment}
                            >
                                <View style={styles.paymentOptionContent}>
                                    <Ionicons name="card-outline" size={24} color="white" />
                                    <Text style={styles.paymentOptionText}>Pay with Stripe</Text>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.paymentOptionButton, {marginTop: 10}]} 
                                onPress={handleBankTransfer}
                            >
                                <View style={styles.paymentOptionContent}>
                                    <Ionicons name="cash-outline" size={24} color="white" />
                                    <Text style={styles.paymentOptionText}>Bank Transfer & Upload Receipt</Text>
                                </View>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={styles.cancelButton} 
                                onPress={handleClosePaymentModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.searchContainer}>
                    <View style={styles.searchIconContainer}>
                        <Ionicons
                            name={searchQuery.trim() === "" ? "search" : "close-circle-outline"}
                            size={20}
                            color="#6B7280"
                            onPress={() => {
                                if (searchQuery.trim() !== "") {
                                    setSearchQuery("");
                                    Keyboard.dismiss();
                                }
                            }}
                        />
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search user by name"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#6B7280"
                    />
                </View>

                {isLoading && <ActivityIndicator size="small" color="#0000ff" />}
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.userItem, selectedUser?.id === item.id && styles.selectedUserItem]}
                            onPress={() => setSelectedUser(item)}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={{ uri: item.profilePhoto || "https://via.placeholder.com/40" }}
                                style={styles.avatar}
                            />
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{item.name}</Text>
                                {renderUserStats(item.stars, item.totalRatings)}
                            </View>
                            {selectedUser?.id === item.id && (
                                <View style={styles.checkmarkContainer}>
                                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                </View>
                            )}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        !isLoading && searchQuery.trim() !== "" ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No users found</Text>
                            </View>
                        ) : null
                    }
                />

                {selectedUser && (
                    <View style={styles.rewardPanel}>
                        <Text style={styles.rewardTitle}>Rate {selectedUser.name}</Text>
                        <View style={styles.starContainer}>
                            {[1, 2, 3, 4, 5].map((star) => renderStarIcon(star))}
                        </View>
                        <TouchableOpacity
                            style={[styles.submitButton, !rating && styles.submitButtonDisabled]}
                            onPress={handleSubmitRating}
                            disabled={!rating || isSubmitting}
                        >
                            <View style={styles.submitContent}>
                                <Ionicons name="star-outline" size={24} color="white" />
                                <Text style={styles.submitText}>
                                    {isSubmitting ? "Submitting..." : "Submit Rating"}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.paymentButton}
                            onPress={handleShowPaymentOptions}
                        >
                            <View style={styles.submitContent}>
                                <Ionicons name="cash-outline" size={24} color="white" />
                                <Text style={styles.submitText}>
                                    Give Payment
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIconContainer: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    userItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    selectedUserItem: {
        backgroundColor: "#F0FDF4",
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
    },
    userStats: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2,
    },
    emptyContainer: {
        padding: 20,
        alignItems: "center",
    },
    emptyText: {
        textAlign: "center",
        color: "#6B7280",
        marginTop: 20,
    },
    rewardPanel: {
        backgroundColor: "white",
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    rewardTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#111827",
        marginBottom: 16,
    },
    starContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 24,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10B981",
        padding: 16,
        borderRadius: 12,
    },
    submitButtonDisabled: {
        backgroundColor: "#A7F3D0",
    },
    submitContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    submitText: {
        color: "white",
        marginLeft: 8,
        fontSize: 16,
        fontWeight: "600",
    },
    paymentButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10B981",
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    stripeConnected: {
        color: "green",
        fontSize: 12,
    },
    stripeNotConnected: {
        color: "red",
        fontSize: 12,
    },
    statsContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    checkmarkContainer: {
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    paymentModalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    starIconContainer: {
        // Style for the star icon container
    },
    paymentOptionButton: {
        width: '100%',
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10B981",
        padding: 16,
        borderRadius: 12,
    },
    paymentOptionContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    paymentOptionText: {
        color: "white",
        marginLeft: 8,
        fontSize: 16,
        fontWeight: "600",
    },
    cancelButton: {
        marginTop: 16,
        padding: 12,
    },
    cancelButtonText: {
        color: "#6B7280",
        fontSize: 16,
        fontWeight: "500",
    },
});

export default RewardSelectionScreen;