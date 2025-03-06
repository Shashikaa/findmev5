import React from "react";
import { TextInput, StyleSheet, View, Platform } from "react-native";

interface SearchInputProps {
  placeholder: string;
  onChange: (text: string) => void;
  value: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ placeholder, onChange, value }) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        onChangeText={onChange}
        value={value}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#999"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15,
    fontSize: 16,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        paddingTop: 10, // Adjust for iOS to have the placeholder in the middle
      },
      android: {
        paddingTop: 0,
      },
    }),
  },
});

export default SearchInput;
