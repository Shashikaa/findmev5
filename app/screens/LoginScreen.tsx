import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import SocialButton from "../../components/SocialButton";
import { doc, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in both fields.");
      return;
    }
  
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === "admin") {
          navigation.reset({ index: 0, routes: [{ name: "AdminDashboard" }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: "Main" }] });
        }
      } else {
        Alert.alert("Error", "User data not found.");
      }
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email to reset your password.");
      return;
    }
  
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent! Check your inbox.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };
  
  const handleAppleSignIn = () => {
    // Implementation would go here when ready
    Alert.alert("Coming Soon", "Apple Sign-In will be available in the next update.");
  };

  const handlePhoneSignIn = () => {
    // Navigate to phone login screen
    navigation.navigate("PhoneLogin");
  };

  return (
    <LinearGradient
      colors={['#f0f9ff', '#e0f2fe']}
      style={styles.gradientBackground}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/images/original.png")} style={styles.logo} />
          <Text style={styles.title}>Welcome to FindMe</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.formContainer}>
        <InputField
    placeholder="Email"
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
    // Remove or comment out the icon prop if not supported
    // icon="mail"
  />
          
          <InputField
    placeholder="Password"
    value={password}
    onChangeText={setPassword}
    secureTextEntry
    // Remove or comment out the icon prop if not supported
    // icon="lock"
  />

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button 
            text={loading ? "Logging In..." : "Sign In"} 
            onPress={handleLogin} 
            disabled={loading}
          />



        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: { 
    flex: 1, 
    padding: 24,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  logo: { 
    width: 140, 
    height: 140, 
    resizeMode: "contain",
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#0369a1", 
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  formContainer: {
    width: "100%",
    marginBottom: 72,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: { 
    color: "#0284c7", 
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    height: 56,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  orText: { 
    paddingHorizontal: 16, 
    color: "#64748b",
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  appleButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    height: 56,
  },
  phoneButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    height: 56,
  },
  socialButtonText: {
    fontWeight: "600",
    color: "#334155",
  },
  footer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginBottom: 32,
  },
  footerText: {
    color: "#64748b",
  },
  linkText: { 
    color: "#0284c7", 
    fontWeight: "bold", 
    marginLeft: 4,
  },
});

export default LoginScreen;