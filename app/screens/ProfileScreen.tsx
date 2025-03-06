import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuth, updateProfile } from "firebase/auth";
import { useFocusEffect } from "@react-navigation/native";
import ProfileHeader from "../../components/ProfileHeader";
import { db } from "../../firebase"; // Import Firestore instance
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import Modal from "react-native-modal"; // For modal pop-up
import * as ImagePicker from "expo-image-picker"; // Importing image picker
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Post {
  id: string;
  itemType: "Lost" | "Found";
  itemName: string;
  description: string;
  image: string;
  date: string;
  found: boolean;
  founderId?: string;
  rewardPending?: boolean;
  rewarded?: boolean;
  collectionName?: string;
}

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Anonymous User");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostOptionsModalVisible, setIsPostOptionsModalVisible] = useState(false);
  const [isProfileOptionsModalVisible, setIsProfileOptionsModalVisible] = useState(false);
  const [isRewardModalVisible, setIsRewardModalVisible] = useState(false);
  const [rewardReceiverId, setRewardReceiverId] = useState<string | null>(null);
  const [stars, setStars] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
    const auth = getAuth();

 
    useEffect(() => {
      const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.name || "Anonymous User");
            setStars(userData.stars || 0);
            setTotalRatings(userData.totalRatings || 0);
            setAverageRating(
              userData.totalRatings 
                ? Number((userData.stars / userData.totalRatings).toFixed(1))
                : 0
            );
          }
          setImageUri(currentUser.photoURL);
          fetchUserPosts();
        } else {
          navigation.navigate("Login");
        }
      });
      return unsubscribe;
    }, [navigation]);

    useFocusEffect(
      React.useCallback(() => {
        const fetchData = async () => {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setStars(userData.stars || 0);
            setTotalRatings(userData.totalRatings || 0);
            setAverageRating(
              userData.totalRatings 
                ? Number((userData.stars / userData.totalRatings).toFixed(1))
                : 0
            );
          }
          fetchUserPosts();
        };
        fetchData();
      }, [])
    );

  const fetchUserPosts = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
  
    try {
      const lostItemsQuery = query(collection(db, "lostItems"), where("uid", "==", currentUser.uid));
      const foundItemsQuery = query(collection(db, "foundItems"), where("uid", "==", currentUser.uid));
      
      const [lostSnapshot, foundSnapshot] = await Promise.all([
        getDocs(lostItemsQuery), 
        getDocs(foundItemsQuery)
      ]);
  
      const allPosts: Post[] = [
        ...lostSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            collectionName: "lostItems",
            rewardPending: data.rewardPending ?? false // Ensure this field is included
          } as Post;
        }),
        ...foundSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            collectionName: "foundItems",
            rewardPending: data.rewardPending ?? false // Ensure this field is included
          } as Post;
        })
      ];
      setPosts(allPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      Alert.alert("Error", "Failed to fetch posts.");
    }
  };
  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const uri = result.assets[0].uri;

      if (auth.currentUser) {
        const user = auth.currentUser;
        const storage = getStorage();
        const fileName = `profilePhoto_${Date.now()}.jpg`;
        const storageRef = ref(storage, `images/profilePhotos/${user.uid}/${fileName}`);

        // Upload image to Firebase Storage
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);

        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // Save URL to Firestore
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          { profilePhoto: downloadURL }, // Add profilePhoto field
          { merge: true }
        );

        // Update user profile with new photo URL
        await updateProfile(user, { photoURL: downloadURL });
        await auth.currentUser.reload();

        // Update state
        setImageUri(downloadURL);

        Alert.alert("Profile Updated", "Your profile picture has been updated!");
      }
    } catch (error) {
      console.error("Error updating profile picture:", error);
      Alert.alert("Error", "Could not update profile picture. Please try again later.");
    }
  };

  const handleDeleteProfilePhoto = async () => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: null });
        await auth.currentUser.reload();

        // Update state
        setImageUri(null);

        Alert.alert("Profile Updated", "Your profile picture has been deleted!");
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      Alert.alert("Error", "Could not delete profile picture. Please try again later.");
    }
  };

  const handleEditPost = (post: Post) => {
    setIsPostOptionsModalVisible(false);
    Alert.alert("Edit Post", `Edit option for post: ${post.itemName}`);
    navigation.navigate("EditPostScreen", { post });
  };

  const handleDeletePost = async (post: Post) => {
    if (!post) return;

    Alert.alert(
      "Delete Post",
      `Are you sure you want to delete the post "${post.itemName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Determine the Firestore collection based on the item type
              const collectionName = post.itemType === "Lost" ? "lostItems" : "foundItems";

              // Reference to the specific document in the Firestore collection
              const postDocRef = doc(db, collectionName, post.id);

              // Delete the document
              await deleteDoc(postDocRef);

              // Update the UI by removing the deleted post from the list
              setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));

              setIsPostOptionsModalVisible(false);

              Alert.alert("Success", "Post deleted successfully.");
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete the post. Please try again.");
            }
          },
        },
      ]
    );
  };

  const openPostOptions = (post: Post) => {
    setSelectedPost(post);
    setIsPostOptionsModalVisible(true);
  };


  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {item.rewardPending && !item.rewarded && (
        <View style={styles.pendingRewardBadge}>
          <Text style={styles.pendingRewardText}>Reward Pending!</Text>
        </View>
      )}
  
      {/* Show both flags when post is found and rewarded */}
      {item.found && item.rewarded && (
        <View style={styles.rewardedBadge}>
          <Text style={styles.rewardedText}>Found and Rewarded!</Text>
        </View>
      )}
  
      <Image source={{ uri: item.image }} style={styles.postImage} />
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{item.itemName}</Text>
        <Text style={styles.postDescription}>{item.description}</Text>
        
        {item.found ? (
          item.rewardPending && !item.rewarded ? (
            <TouchableOpacity 
              style={styles.giveRewardButton}
              onPress={() => navigation.navigate("RewardSelectionScreen", { 
                post: item,
                founderId: item.founderId 
              })}
            >
              <Text style={styles.buttonText}>Give Stars</Text>
            </TouchableOpacity>
          ) : null
        ) : (
          <TouchableOpacity 
            style={styles.markAsFoundButton} 
            onPress={() => markAsFound(item)}
          >
            <Text style={styles.buttonText}>Mark as Found</Text>
          </TouchableOpacity>
        )}
  
        <TouchableOpacity
          onPress={() => openPostOptions(item)}
          style={styles.moreOptionsButton}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>
    </View>
  );
  

  const markAsFound = async (post: Post) => {
    if (!post) return;
  
    Alert.alert("Mark as Found", "Are you sure this item has been found?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            const collectionName = post.itemType === "Lost" ? "lostItems" : "foundItems";
            const postRef = doc(db, collectionName, post.id);
            
            await updateDoc(postRef, { 
              found: true, 
              founderId: auth.currentUser?.uid,
              rewardPending: true
            });
  
            setPosts(prevPosts => 
              prevPosts.map(p => 
                p.id === post.id ? { ...p, found: true, rewardPending: true } : p
              )
            );
  
            // Navigate to RewardSelectionScreen with both post and founderId
            navigation.navigate("RewardSelectionScreen", {
              post: {
                ...post,
                collectionName,
                found: true,
                founderId: auth.currentUser?.uid
              },
              founderId: auth.currentUser?.uid
            });
          } catch (error) {
            console.error("Error updating document: ", error);
            Alert.alert("Error", "Failed to update the post.");
          }
        },
      },
    ]);
  };
  
  
  
  return (
    <View >
       <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
   
   <ProfileHeader
        userName={userName}
        imageUri={imageUri}
        averageRating={averageRating}
        totalRatings={totalRatings}
        onSettingsPress={() => navigation.navigate("SettingScreen")}
        onAvatarPress={() => setIsProfileOptionsModalVisible(true)}
        isProfileOptionsModalVisible={isProfileOptionsModalVisible}
        setIsProfileOptionsModalVisible={setIsProfileOptionsModalVisible}
        handleImagePick={handleImagePick}
        handleDeleteProfilePhoto={handleDeleteProfilePhoto}
      />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={fetchUserPosts} />
        }
        contentContainerStyle={[styles.postsContainer, { paddingBottom: insets.bottom + 400 }]}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>No posts available.</Text>
          </View>
        }
      />

      {/* Modal for Post Options */}
      <Modal
        isVisible={isPostOptionsModalVisible}
        onBackdropPress={() => setIsPostOptionsModalVisible(false)}
        onBackButtonPress={() => setIsPostOptionsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={() => handleEditPost(selectedPost!)}
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonText}>Edit Post</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePost(selectedPost!)}
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonText}>Delete Post</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal for Profile Options */}
      <Modal
        isVisible={isProfileOptionsModalVisible}
        onBackdropPress={() => setIsProfileOptionsModalVisible(false)}
        onBackButtonPress={() => setIsProfileOptionsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            onPress={handleImagePick}
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonText}>Change Profile Picture</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteProfilePhoto}
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonText}>Delete Profile Picture</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({

  postsContainer: {
    paddingHorizontal: 16,
  },
  postCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "row",
    overflow: "hidden",
    padding: 12,
  },
  postImage: {
    width: 100,
    height: 100,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  postContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  postDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginVertical: 4,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postDetails: {
    fontSize: 12,
    color: "#6B7280",
  },

  moreOptionsButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
      // Empty State
      emptyListContainer: {
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
      },
      emptyListText: {
        fontSize: 16,
        color: "#9CA3AF",
      },
          // Loading State
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalButton: {
    backgroundColor: "#4B5563",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 10,
    width: "80%",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  pendingRewardBadge: {
    position: 'absolute',
    top: 20,
    right: 60,
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    zIndex: 1,
  },
  pendingRewardText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  giveRewardButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  markAsFoundButton: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  ratingStar: {
    marginHorizontal: 2,
  },
  ratingText: {
    marginLeft: 8,
    color: "#6B7280",
    fontSize: 14,
  },
  // Badge for Found and Rewarded flags
  rewardedBadge: {
    backgroundColor: "#10B981",  // Green for 'found' and 'rewarded'
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 45,
    alignSelf: "flex-start",
    position: 'absolute',
    top: 10,
    right: 10,
    
   
    zIndex: 1
  },
  rewardedText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },



});

export default ProfileScreen; 