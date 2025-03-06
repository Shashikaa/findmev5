import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";


const Header: React.FC = () => {
  const navigation = useNavigation();
  const unreadCount = useUnreadNotifications() || 0; // Ensure it's a number

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Image source={require("../assets/images/logo.png")} style={styles.logo} />
        <Text style={styles.headerTitle}>FindMe</Text>
      </View>
      <View style={styles.headerIcons}>
        {/* Notifications Icon */}
        <TouchableOpacity onPress={() => navigation.navigate("NotificationsScreen")}>
          <View>
            <Ionicons name="notifications-outline" size={28} color="#333" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Messages Icon */}
        <TouchableOpacity onPress={() => navigation.navigate("MessagesScreen")} style={styles.iconSpacing}>
          <Ionicons name="mail-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconSpacing: {
    marginLeft: 16,
  },
  badge: {
    position: "absolute",
    right: -8,
    top: -4,
    backgroundColor: "red",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default Header;
