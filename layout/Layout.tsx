import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab }) => {
  return (
    <View style={styles.container}>
      {/* ScrollView for the content */}
      <ScrollView contentContainerStyle={styles.content}>
        {children}
      </ScrollView>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 70, // Ensure content doesn't overlap with the fixed NavBar
  },
});

export default Layout;
