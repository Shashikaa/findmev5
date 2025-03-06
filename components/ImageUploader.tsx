import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ImageUploaderProps {
  imageUri: string;
  onImageUpload: () => void;
  onImageRemove: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageUri,
  onImageUpload,
  onImageRemove,
}) => {
  return (
    <View>
      <TouchableOpacity style={styles.imageButton} onPress={onImageUpload}>
        <Ionicons name="image-outline" size={24} color="#6200EA" />
        <Text style={styles.imageButtonText}>Upload Image</Text>
      </TouchableOpacity>
      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={onImageRemove}
          >
            <Text style={styles.removeImageButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    justifyContent: "center",
  },
  imageButtonText: {
    fontSize: 16,
    color: "#6200EA",
    marginLeft: 5,
  },
  imagePreviewContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 5,
  },
  removeImageButton: {
    backgroundColor: "#ff5252",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  removeImageButtonText: {
    color: "white",
  },
});

export default ImageUploader;
