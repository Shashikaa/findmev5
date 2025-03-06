import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs"; // Lightweight library for date formatting
import utc from "dayjs/plugin/utc"; // Plugin to handle UTC
import timezone from "dayjs/plugin/timezone"; // Plugin to handle timezone
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Kolkata");

interface CardProps {
  id: string; // Add post ID for reporting
  image: string | any; // Image URL as a string for the post
  profilePhoto: string | any; // Image URL as a string for the user's profile photo
  itemName: string;
  description: string;
  location: string;
  dateLost: string;
  reward: string;
  userName: string;
  createdAt: any; // Firestore Timestamp or ISO string
  onCall: () => void;
  onMessage: () => void; // Ensure this prop is passed correctly
}

const Card: React.FC<CardProps> = ({
  id,
  image,
  profilePhoto,
  itemName,
  description,
  location,
  dateLost,
  reward,
  userName,
  createdAt,
  onCall,
  onMessage,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleModal = () => setModalVisible(!modalVisible);
  const toggleReportModal = () => {
    setReportModalVisible(!reportModalVisible);
    if (modalVisible) toggleModal();
  };

  // Function to handle Firestore Timestamp or ISO string
  const formatTimestamp = (timestamp: any) => {
    try {
      if (timestamp && typeof timestamp === "object" && "seconds" in timestamp) {
        // Handle Firestore Timestamp object
        const date = new Date(timestamp.seconds * 1000); // Convert seconds to milliseconds
        return dayjs(date).format("DD MMM YYYY [at] hh:mm A");
      } else if (typeof timestamp === "string") {
        // Handle ISO string
        return dayjs(timestamp).format("DD MMM YYYY [at] hh:mm A");
      }
      return "Date unavailable";
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Date unavailable";
    }
  };

  // Format the timestamp for display
  const formattedTime = formatTimestamp(createdAt);

  // Function to submit report to Firestore
  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Error", "Please provide a reason for reporting.");
      return;
    }
    
    // Add validation for postId
    if (!id) {
      Alert.alert("Error", "Cannot identify post. Please try again later.");
      console.error("Missing post ID when attempting to submit report");
      return;
    }
    setIsSubmitting(true);

    try {
      // Save report to Firestore using v9 syntax
      await addDoc(collection(db, 'reports'), {
        postId: id,
        postTitle: itemName,
        reportReason: reportReason,
        reportedBy: auth.currentUser?.uid || 'anonymous',
        reportedAt: serverTimestamp(),
        status: 'pending',
        postDetails: {
          userName,
          location,
          createdAt
        }
      });

      // Close modal and show success message
      setReportModalVisible(false);
      setReportReason("");
      Alert.alert(
        "Report Submitted", 
        "Thank you for your report. We will review it shortly.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert(
        "Error", 
        "Failed to submit your report. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to share the post
  const handleShare = async (platform: "whatsapp" | "facebook") => {
    try {
      // Create a shareable message
      const shareMessage = `Check out this post!\n\nItem: ${itemName}\nDescription: ${description}\nLocation: ${location}\nDate Lost: ${dateLost}\nReward: ${reward}\nPosted by: ${userName}`;

      if (platform === "whatsapp") {
        // Share to WhatsApp
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
        const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);

        if (canOpenWhatsApp) {
          await Linking.openURL(whatsappUrl);
        } else {
          Alert.alert("Error", "WhatsApp is not installed on your device.");
        }
      } else if (platform === "facebook") {
        // Share to Facebook
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          shareMessage
        )}`;
        const canOpenFacebook = await Linking.canOpenURL(facebookUrl);

        if (canOpenFacebook) {
          await Linking.openURL(facebookUrl);
        } else {
          Alert.alert("Error", "Facebook is not installed on your device.");
        }
      }
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert("Error", "Failed to share the post.");
    }
  };

  // Function to show platform selection dialog
  const showPlatformSelection = () => {
    Alert.alert(
      "Share Post",
      "Choose a platform to share this post:",
      [
        {
          text: "WhatsApp",
          onPress: () => handleShare("whatsapp"),
        },
        {
          text: "Facebook",
          onPress: () => handleShare("facebook"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {/* Profile Photo */}
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.defaultProfileImage}></View>
          )}
          <View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.sharedTime}>{formattedTime}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={toggleModal} style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Image Section */}
      <Image source={{ uri: image }} style={styles.cardImage} />

      {/* Content Section */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{itemName}</Text>
        <Text style={styles.cardDescription}>Description: {description}</Text>
        <Text style={styles.cardLocation}>Location: {location}</Text>
        {dateLost && <Text style={styles.cardDate}>Date Lost: {dateLost}</Text>}
        {reward && <Text style={styles.cardReward}>Reward $: {reward}</Text>}
      </View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={toggleModal}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={toggleModal}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => {
                toggleModal();
                showPlatformSelection();
              }}
            >
              <Text style={styles.modalOption}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleReportModal}
            >
              <Text style={styles.modalOption}>Report Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={toggleReportModal}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            <Text style={styles.reportModalTitle}>Report Post</Text>
            <Text style={styles.reportModalSubtitle}>
              Please tell us why you're reporting this post:
            </Text>
            
            <TextInput
              style={styles.reportInput}
              placeholder="Enter reason for reporting..."
              multiline
              numberOfLines={4}
              value={reportReason}
              onChangeText={setReportReason}
              editable={!isSubmitting}
            />
            
            <View style={styles.reportButtonsContainer}>
              <TouchableOpacity
                style={[styles.reportButton, styles.reportCancelButton]}
                onPress={toggleReportModal}
                disabled={isSubmitting}
              >
                <Text style={styles.reportButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.reportButton, 
                  styles.reportSubmitButton,
                  isSubmitting && styles.disabledButton
                ]}
                onPress={submitReport}
                disabled={isSubmitting}
              >
                <Text style={styles.reportButtonText}>
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  defaultProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sharedTime: {
    fontSize: 12,
    color: "#666",
  },
  iconButton: {
    padding: 8,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardReward: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  callButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  messageButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 8,
  },
  actionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    width: "80%",
  },
  modalOption: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
  },
  // Report Modal Styles
  reportModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 16,
  },
  reportModalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  reportModalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fafafa",
    textAlignVertical: "top",
    height: 100,
    marginBottom: 16,
  },
  reportButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reportButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  reportCancelButton: {
    backgroundColor: "#9e9e9e",
    marginRight: 8,
  },
  reportSubmitButton: {
    backgroundColor: "#ff5252",
    marginLeft: 8,
  },
  reportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default Card;