// DeviceCard.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface DeviceCardProps {
  name: string;
  status: string;
  battery: string;
  location: string;
  onTrack: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  name,
  status,
  battery,
  location,
  onTrack,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.deviceName}>{name}</Text>
      <Text>Status: {status}</Text>
      <Text>Battery: {battery}</Text>
      <Text>Location: {location}</Text>

      <TouchableOpacity style={styles.trackButton} onPress={onTrack}>
        <Text style={styles.trackButtonText}>Track</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    elevation: 3,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  trackButton: {
    backgroundColor: "#6200EE",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  trackButtonText: {
    color: "#fff",
    textAlign: "center",
  },
});

export default DeviceCard;
