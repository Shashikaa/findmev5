import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Modal from "react-native-modal";

const { width } = Dimensions.get('window');

const getTitleAndReward = (totalStars) => {
  if (totalStars >= 300) return { title: "Crown 👑", color: "#FFD700", reward: "Premium Features Unlocked" };
  if (totalStars >= 150) return { title: "Gold 🏅", color: "#FFD700", reward: "Custom Theme Unlocked" };
  if (totalStars >= 50) return { title: "Silver 🥈", color: "#C0C0C0", reward: "Profile Frame Unlocked" };
  return { title: "Bronze 🥉", color: "#CD7F32", reward: "Basic Badge Earned" };
};

const ProfileHeader = ({
  userName,
  imageUri,
  averageRating = 0,
  totalRatings = 0,
  onSettingsPress,
  onAvatarPress,
  isProfileOptionsModalVisible,
  setIsProfileOptionsModalVisible,
  handleImagePick,
  handleDeleteProfilePhoto,
}) => {
  const insets = useSafeAreaInsets();
  const totalStars = Math.round(averageRating * totalRatings);
  const { title, reward, color } = getTitleAndReward(totalStars);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);

  return (
    <LinearGradient 
      colors={['#f8f9fa', '#e9ecef']}
      style={[styles.container, { paddingTop: insets.top + 10 }]}
    >
      {/* Settings Button */}
      <TouchableOpacity 
        onPress={onSettingsPress} 
        style={[styles.settingsIcon, { top: insets.top + 10 }]}
      >
        <Ionicons name="settings-sharp" size={26} color="#4B5563" />
      </TouchableOpacity>

      {/* Profile Content */}
      <View style={styles.profileContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity 
            onPress={() => setIsProfileOptionsModalVisible(true)}
            style={styles.avatarContainer}
          >
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.avatarBackground}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatar} />
              ) : (
                <View style={styles.defaultAvatar}>
                  <Ionicons name="person" size={60} color="#4B5563" />
                </View>
              )}
            </LinearGradient>
            <View style={[styles.avatarBadge, { backgroundColor: color }]}>
              <Text style={styles.badgeText}>{title.split(' ')[0]}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* User Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.displayName}>{userName}</Text>
          
          <TouchableOpacity 
            onPress={() => setIsInfoModalVisible(true)}
            style={styles.ratingContainer}
          >
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= averageRating ? "star" : "star-outline"}
                  size={20}
                  color="#FFD700"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {averageRating.toFixed(1)} ({totalRatings} ratings)
            </Text>
          </TouchableOpacity>

          <View style={styles.rewardContainer}>
            <Ionicons name="trophy" size={18} color={color} />
            <Text style={[styles.rewardText, { color }]}>{reward}</Text>
          </View>
        </View>
      </View>

      {/* Section Title */}
      <Text style={styles.sectionTitle}>Recent Posts</Text>

      {/* Info Modal */}
      <Modal
        isVisible={isInfoModalVisible}
        onBackdropPress={() => setIsInfoModalVisible(false)}
        backdropOpacity={0.4}
      >
        <View style={styles.infoModal}>
          <Text style={styles.modalTitle}>Achievement System</Text>
          <View style={styles.rankItem}>
            <Text style={[styles.rankEmoji, { color: '#CD7F32' }]}>🥉</Text>
            <View>
              <Text style={styles.rankTitle}>Bronze Tier</Text>
              <Text style={styles.rankSubtitle}>0 - 49 stars</Text>
            </View>
          </View>
          <View style={styles.rankItem}>
            <Text style={[styles.rankEmoji, { color: '#C0C0C0' }]}>🥈</Text>
            <View>
              <Text style={styles.rankTitle}>Silver Tier</Text>
              <Text style={styles.rankSubtitle}>50 - 149 stars</Text>
            </View>
          </View>
          <View style={styles.rankItem}>
            <Text style={[styles.rankEmoji, { color: '#FFD700' }]}>🏅</Text>
            <View>
              <Text style={styles.rankTitle}>Gold Tier</Text>
              <Text style={styles.rankSubtitle}>150 - 299 stars</Text>
            </View>
          </View>
          <View style={styles.rankItem}>
            <Text style={[styles.rankEmoji, { color: '#FFD700' }]}>👑</Text>
            <View>
              <Text style={styles.rankTitle}>Crown Tier</Text>
              <Text style={styles.rankSubtitle}>300+ stars</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => setIsInfoModalVisible(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Profile Options Modal */}
      <Modal
        isVisible={isProfileOptionsModalVisible}
        onBackdropPress={() => setIsProfileOptionsModalVisible(false)}
        backdropOpacity={0.4}
      >
        <View style={styles.actionModal}>
          <TouchableOpacity 
            onPress={handleImagePick} 
            style={styles.modalButton}
          >
            <Ionicons name="image" size={22} color="#4B5563" />
            <Text style={styles.modalButtonText}>Change Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleDeleteProfilePhoto} 
            style={[styles.modalButton, styles.deleteButton]}
          >
            <Ionicons name="trash" size={22} color="#dc2626" />
            <Text style={[styles.modalButtonText, { color: '#dc2626' }]}>Remove Photo</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  settingsIcon: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  avatarSection: {
    marginRight: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  defaultAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  infoSection: {
    flex: 1,
  },
  displayName: {
    fontSize: 21,
    fontWeight: '600',
    color: '#1f2937',
    
    marginTop:3,
  },
  ratingContainer: {
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rewardText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 24,
    marginHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rankEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  rankSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  actionModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  modalButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
});

export default ProfileHeader;