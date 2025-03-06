import React, { useState, useEffect } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { updateDoc, doc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase"; // Firestore instance
import { getAuth } from "firebase/auth";
import { useNavigation } from '@react-navigation/native';  // Use the navigation hook
import { RouteProp, useRoute } from "@react-navigation/native";

type Post = {
  id: string;
  itemType: "Lost" | "Found";
  itemName: string;
  category: string;
  description: string;
  location: string;
  phoneNumber: string;
  date: string;
  image: string | null;
};

type EditPostScreenRouteProp = RouteProp<{ EditPostScreen: { post: Post } }, 'EditPostScreen'>;

const EditPostScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const route = useRoute<EditPostScreenRouteProp>();
  const { post } = route.params;
  // Use the navigation hook

  const [itemType, setItemType] = useState<"Lost" | "Found">(post.itemType);
  const [itemName, setItemName] = useState(post.itemName);
  const [category, setCategory] = useState(post.category);
  const [description, setDescription] = useState(post.description);
  const [location, setLocation] = useState(post.location);
  const [phoneNumber, setPhoneNumber] = useState(post.phoneNumber);
  const [date, setDate] = useState(new Date(post.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [image, setImage] = useState<string | null>(post.image);

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(new Date(selectedDate.setHours(date.getHours(), date.getMinutes())));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setDate(new Date(date.setHours(selectedTime.getHours(), selectedTime.getMinutes())));
    }
  };

  const handleSubmit = async () => {
    const auth = getAuth(); // Get the current user's auth instance
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Authentication Error", "You need to be signed in to edit a post.");
      return;
    }

    const { uid } = currentUser; // Get the user's unique identifier

    try {
      const collectionName = itemType === "Lost" ? "lostItems" : "foundItems";
      const postRef = doc(db, collectionName, post.id); // Reference to the post document

      await updateDoc(postRef, {
        uid, // Update the user's UID
        itemType,
        itemName,
        category,
        description,
        location,
        phoneNumber,
        date: date.toISOString(),
        image,
      });

      Alert.alert("Success", "Your post has been updated.");

      // Use navigation to go to ProfileScreen after successful post update
      navigation.goBack();
    } catch (error) {
      console.error("Error updating document: ", error);
      Alert.alert("Error", "Failed to update the post.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Edit Post</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setItemType("Lost")}
              style={[styles.toggleButton, itemType === "Lost" && styles.activeToggleButton]}
            >
              <Text style={itemType === "Lost" ? styles.activeToggleText : styles.toggleText}>
                Lost Item
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setItemType("Found")}
              style={[styles.toggleButton, itemType === "Found" && styles.activeToggleButton]}
            >
              <Text style={itemType === "Found" ? styles.activeToggleText : styles.toggleText}>
                Found Item
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Item Name"
            value={itemName}
            onChangeText={setItemName}
          />
          <TextInput
            style={styles.input}
            placeholder="Category"
            value={category}
            onChangeText={setCategory}
          />
          <TextInput
            style={styles.textArea}
            placeholder="Item Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <View style={styles.datePickerContainer}>
            <Text style={styles.label}>Lost Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateButtonText}>
                  {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={date}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>
          <View style={styles.uploadContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <TouchableOpacity style={styles.uploadBox} onPress={handleImageUpload}>
                <Text style={styles.uploadText}>Upload Item Image</Text>
                <Text style={styles.uploadHint}>
                  Attach file. File size should not exceed 10MB.
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Update</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  toggleContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  toggleButton: { flex: 1, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#ccc" },
  activeToggleButton: { backgroundColor: "#3498db" },
  toggleText: { fontSize: 16 },
  activeToggleText: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10 },
  textArea: { borderWidth: 1, borderColor: "#ccc", padding: 10, height: 100, marginBottom: 10 },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  datePickerContainer: { marginBottom: 10 },
  dateTimeRow: { flexDirection: "row", justifyContent: "space-between" },
  dateButton: { padding: 10, backgroundColor: "#ddd" },
  dateButtonText: { fontSize: 16 },
  uploadContainer: { alignItems: "center", marginBottom: 20 },
  previewImage: { width: 100, height: 100, marginBottom: 10 },
  uploadBox: { padding: 20, borderWidth: 1, borderColor: "#ccc" },
  uploadText: { fontSize: 16 },
  uploadHint: { fontSize: 12, color: "gray" },
  submitButton: { backgroundColor: "#3498db", padding: 15, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 18 }
});

export default EditPostScreen;
