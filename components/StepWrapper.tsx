import React from "react";
import { View, StyleSheet } from "react-native";

interface StepWrapperProps {
  children: React.ReactNode;
}

const StepWrapper: React.FC<StepWrapperProps> = ({ children }) => {
  return <View style={styles.stepContainer}>{children}</View>;
};

const styles = StyleSheet.create({
  stepContainer: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    width: "80%",
    alignItems: "center",
  },
});

export default StepWrapper;
