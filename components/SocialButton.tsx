import React from "react";
import { TouchableOpacity, Text, StyleSheet, View, Image } from "react-native";
import { colors } from "../constants/Colors";

const SocialButton = ({ iconName, text, onPress }: any) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Image source={iconName} style={styles.icon} />
      </View>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  text: {
    color: colors.black,
    fontWeight: "bold",
  },
});

export default SocialButton;
