import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Pressable,
  StatusBar,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { addDoc, collection, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";

const AddScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [itemType, setItemType] = useState<"Lost" | "Found">("Lost");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reward, setReward] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false); // For iOS modal picker

  const categories = [
    "Electronics",
    "Clothing",
    "Documents",
    "Accessories",
    "Others",
  ];

  const handleImageUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Please grant media library permissions to proceed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleImageRemove = () => {
    setImage(null);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleRefresh = () => {
    setItemType("Lost");
    setItemName("");
    setCategory("Electronics");
    setDescription("");
    setLocation("");
    setPhoneNumber("");
    setImage(null);
    setDate(new Date());
    setReward("");
  };

  const uploadImageToStorage = async (uri: string) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Authentication Error", "You need to be signed in to upload images.");
      return null;
    }

    const { uid } = currentUser;
    const filename = `post_${Date.now()}.jpg`;
    const storageRef = ref(getStorage(), `images/posts/${uid}/${filename}`);

    setUploading(true);
    const response = await fetch(uri);
    const blob = await response.blob();

    try {
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image: ", error);
      Alert.alert("Upload Failed", "Failed to upload image.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
  
    if (!currentUser) {
      Alert.alert("Authentication Error", "You need to be signed in to create a post.");
      return;
    }
  
    const { uid } = currentUser;
  
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) {
        Alert.alert("Error", "User data not found.");
        return;
      }
  
      const userData = userDoc.data();
      const userName = userData?.name || "Anonymous";
      const profilePhoto = userData?.profilePhoto || "";
  
      let imageUrl = "";
      if (image) {
        const uploadedImageUrl = await uploadImageToStorage(image);
        if (!uploadedImageUrl) {
          Alert.alert("Error", "Failed to upload image.");
          return;
        }
        imageUrl = uploadedImageUrl;
      }
  
      // Generate a custom post ID
      const postId = `${itemType.toLowerCase()}_${uid}_${Date.now()}`;
  
      const collectionName = itemType === "Lost" ? "lostItems" : "foundItems";
      await addDoc(collection(db, collectionName), {
        uid,
        postId, // Add the custom post ID here
        userName,
        profilePhoto,
        itemType,
        itemName,
        category,
        description,
        location,
        phoneNumber,
        date: date.toISOString(),
        image: imageUrl,
        reward,
        createdAt: serverTimestamp(),
      });
  
      Alert.alert("Success", "Your post has been submitted.");
      handleRefresh();
    } catch (error) {
      console.error("Error adding document: ", error);
      Alert.alert("Error", "Failed to submit the post.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
       <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Create New Post</Text>

            {/* Toggle Buttons */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  itemType === "Lost" && styles.activeToggleButton,
                ]}
                onPress={() => setItemType("Lost")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    itemType === "Lost" && styles.activeToggleText,
                  ]}
                >
                  Lost Item
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  itemType === "Found" && styles.activeToggleButton,
                ]}
                onPress={() => setItemType("Found")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    itemType === "Found" && styles.activeToggleText,
                  ]}
                >
                  Found Item
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Fields */}
            <TextInput
              style={styles.input}
              placeholder="Item Name"
              placeholderTextColor="#999"
              value={itemName}
              onChangeText={setItemName}
            />

            {/* Category Picker */}
            {Platform.OS === "ios" ? (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Text style={styles.categoryText}>{category}</Text>
                </TouchableOpacity>
                <Modal
                  visible={showCategoryPicker}
                  transparent
                  animationType="slide"
                >
                  <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                      {categories.map((cat) => (
                        <Pressable
                          key={cat}
                          style={styles.modalOption}
                          onPress={() => {
                            setCategory(cat);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Text style={styles.modalOptionText}>{cat}</Text>
                        </Pressable>
                      ))}
                      <Pressable
                        style={styles.modalCancel}
                        onPress={() => setShowCategoryPicker(false)}
                      >
                        <Text style={styles.modalCancelText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                </Modal>
              </>
            ) : (
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Category</Text>
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                  style={styles.picker}
                  dropdownIconColor="#6200EA"
                >
                  {categories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            )}

            <TextInput
              style={styles.textArea}
              placeholder="Item Description"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <TextInput
              style={styles.input}
              placeholder="Reward $ (Optional)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={reward}
              onChangeText={setReward}
            />

            {/* Date Picker */}
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {date.toLocaleDateString()} - {date.toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            {/* Image Upload */}
            <TouchableOpacity style={styles.imageButton} onPress={handleImageUpload}>
              <Ionicons name="image-outline" size={24} color="#6200EA" />
              <Text style={styles.imageButtonText}>Upload Image</Text>
            </TouchableOpacity>
            {image && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleImageRemove}
                >
                  <Text style={styles.removeImageButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={uploading}
            >
              <Text style={styles.submitButtonText}>
                {uploading ? "Uploading..." : "Submit Post"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 110,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#FFF",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 15,
    alignItems: "center",
  },
  activeToggleButton: {
    backgroundColor: "#6200EA",
  },
  toggleText: {
    fontSize: 16,
    color: "#666",
  },
  activeToggleText: {
    color: "#FFF",
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryText: {
    fontSize: 16,
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    width: "80%",
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
  },
  modalCancel: {
    padding: 15,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#FF4444",
  },

  textArea: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
    height: 100,
    textAlignVertical: "top",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerContainer: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  picker: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    color: "#666",
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  dateButton: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageButtonText: {
    fontSize: 16,
    color: "#6200EA",
    marginLeft: 10,
  },
  imagePreviewContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  removeImageButton: {
    backgroundColor: "#FF4444",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  removeImageButtonText: {
    color: "#FFF",
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#6200EA",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AddScreen;