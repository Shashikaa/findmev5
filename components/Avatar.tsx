import React from "react";
import { View, Image, StyleSheet, ImageSourcePropType } from "react-native";

interface AvatarProps {
  image: ImageSourcePropType;
}

const Avatar: React.FC<AvatarProps> = ({ image }) => {
  return (
    <View style={styles.container}>
      <Image source={image} style={styles.avatar} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

export default Avatar;
