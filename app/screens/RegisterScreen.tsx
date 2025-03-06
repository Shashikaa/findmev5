import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { LinearGradient } from "expo-linear-gradient";

const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        profilePhoto: "",
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Registration successful!");
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe"]} style={styles.gradientBackground}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/images/original.png")} style={styles.logo} />
          <Text style={styles.title}>Register to FindMe</Text>
        </View>

        <View style={styles.formContainer}>
          <InputField placeholder="Full Name" value={name} onChangeText={setName} />
          <InputField placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <InputField placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <InputField placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
          <Button text={loading ? "Registering..." : "Sign Up"} onPress={handleEmailRegister} disabled={loading} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  logoContainer: { alignItems: "center", marginTop: 50 },
  logo: { width: 140, height: 140, resizeMode: "contain" },
  title: { fontSize: 28, fontWeight: "bold", color: "#0369a1", marginTop: 16 },
  formContainer: { width: "100%", marginBottom: 72 },
  footer: { flexDirection: "row", justifyContent: "center", marginBottom: 32 },
  footerText: { color: "#64748b" },
  linkText: { color: "#0284c7", fontWeight: "bold", marginLeft: 4 },
});

export default RegisterScreen;
