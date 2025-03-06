// AdminSettings.tsx
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const AdminSettings = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Settings</Text>
      <Text style={styles.description}>
        This is a placeholder for the admin settings screen. 
        You can add settings options here, such as managing app configurations, 
        updating content, or other administrative tasks.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f4f4',
    paddingTop: Platform.OS === 'ios' ? 45 : 25,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
});

export default AdminSettings;
