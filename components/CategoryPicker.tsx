import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

interface CategoryPickerProps {
  selectedValue: string;
  onValueChange: (itemValue: string) => void;
  categories: string[];
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedValue,
  onValueChange,
  categories,
}) => {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  return Platform.OS === "ios" ? (
    <>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowCategoryPicker(true)}
      >
        <Text style={styles.categoryText}>{selectedValue}</Text>
      </TouchableOpacity>
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.modalOption}
                onPress={() => {
                  onValueChange(cat);
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={styles.modalOptionText}>{cat}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  ) : (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>Category</Text>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker}
        dropdownIconColor="#6200EA"
      >
        {categories.map((cat) => (
          <Picker.Item key={cat} label={cat} value={cat} />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  categoryText: {
    fontSize: 16,
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalOption: {
    paddingVertical: 15,
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOptionText: {
    fontSize: 18,
    textAlign: "center",
  },
  modalCancel: {
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 18,
    color: "red",
  },
  pickerContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  label: {
    fontSize: 16,
    paddingLeft: 10,
    marginTop: 5,
    color: "#333",
  },
  picker: {
    height: 40,
  },
});

export default CategoryPicker;
