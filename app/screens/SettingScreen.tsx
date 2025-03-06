import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Switch,
    ScrollView,
    Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../firebase";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigation } from "@react-navigation/native";

const SettingsScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [hasStripeAccount, setHasStripeAccount] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [contractNotificationsEnabled, setContractNotificationsEnabled] = useState(true);
    const APP_VERSION = "1.0.0"; // App version

    interface BankDetails {
        accountName?: string;
        bankName?: string;
        accountNumber?: string;
        routingNumber?: string;
    }
    
    const [bankDetails, setBankDetails] = useState<BankDetails>({});
    const [bankModalVisible, setBankModalVisible] = useState(false);
    const [viewBankDetailsModal, setViewBankDetailsModal] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const userId = auth.currentUser?.uid;
    const userEmail = auth.currentUser?.email || "";

    useEffect(() => {
        const fetchUserData = async () => {
            if (!userId) return;
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                setHasStripeAccount(!!data.stripeAccountId);
                setBankDetails(data.bankDetails || {});
                setNotificationsEnabled(data.notificationsEnabled !== false);
                setContractNotificationsEnabled(data.contractNotificationsEnabled !== false);
            }
        };
        fetchUserData();
    }, [userId]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            Alert.alert("Success", "You have been logged out.");
            navigation.reset({ index: 0, routes: [{ name: "Login" as never }] });
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const handleStripeConnect = () => {
        if (hasStripeAccount) {
            Alert.alert("Info", "You are already connected to Stripe.");
            return;
        }
        navigation.navigate("StripeOnboardingScreen");
    };

    const saveBankDetails = async (details) => {
        if (!userId) return;
        try { 
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { bankDetails: details });
            setBankDetails(details);
            setBankModalVisible(false);
            Alert.alert("Success", "Bank details saved successfully!");
        } catch (error: any) {
            Alert.alert("Error", "Failed to save bank details: " + error.message);
        }
    };

    const saveNotificationSettings = async (key, value) => {
        if (!userId) return;
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { [key]: value });
            Alert.alert("Success", "Notification settings updated!");
        } catch (error: any) {
            Alert.alert("Error", "Failed to update settings: " + error.message);
        }
    };

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords don't match");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                throw new Error("User not found");
            }

            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPassword);
            
            Alert.alert("Success", "Password updated successfully");
            setPasswordModalVisible(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            let errorMessage = "Failed to update password";
            if (error.code === "auth/wrong-password") {
                errorMessage = "Current password is incorrect";
            }
            Alert.alert("Error", errorMessage);
        }
    };

    const rateApp = () => {
        // Platform-specific logic for app rating
        const storeUrl = Platform.OS === 'ios' 
            ? 'https://apps.apple.com/app/yourappid' 
            : 'https://play.google.com/store/apps/details?id=your.app.package';
            
        Alert.alert(
            "Rate our App",
            "Would you like to rate our app in the app store?",
            [
                { text: "Not Now", style: "cancel" },
                { text: "Rate App", onPress: () => {
                    // Logic to open app store would go here
                    Alert.alert("Thanks!", "You would be redirected to the store");
                }}
            ]
        );
    };

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <TouchableOpacity 
                style={styles.settingOption} 
                onPress={() => setViewBankDetailsModal(true)}>
                <Text style={styles.optionText}>Name, Email, Security</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.settingOption}
                onPress={() => setPasswordModalVisible(true)}>
                <Text style={styles.optionText}>Change your current password</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Payment Settings</Text>
            <TouchableOpacity style={styles.settingOption} onPress={handleStripeConnect}>
                <Text style={styles.optionText}>{hasStripeAccount ? "Stripe Connected" : "Connect to Stripe"}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.settingOption} 
                onPress={() => setBankModalVisible(true)}>
                <Text style={styles.optionText}>{bankDetails.accountName ? "Edit Bank Account" : "Add Bank Account"}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Notification Settings</Text>
            <View style={styles.toggleOption}>
                <Text style={styles.optionText}>Enable Notifications</Text>
                <Switch
                    value={notificationsEnabled}
                    onValueChange={(value) => {
                        setNotificationsEnabled(value);
                        saveNotificationSettings("notificationsEnabled", value);
                    }}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                    thumbColor={notificationsEnabled ? "#4CAF50" : "#f4f3f4"}
                />
            </View>


            <Text style={styles.sectionTitle}>General</Text>
            <TouchableOpacity style={styles.settingOption} onPress={rateApp}>
                <Text style={styles.optionText}>Rate & Review Us</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.settingOption}>
                <Text style={styles.optionText}>Version {APP_VERSION}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            {/* Bank Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={bankModalVisible}
                onRequestClose={() => setBankModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add/Edit Bank Account</Text>
                        <TextInput placeholder="Account Name" style={styles.input} value={bankDetails.accountName} onChangeText={(text) => setBankDetails({ ...bankDetails, accountName: text })} />
                        <TextInput placeholder="Bank Name" style={styles.input} value={bankDetails.bankName} onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })} />
                        <TextInput placeholder="Account Number" keyboardType="number-pad" style={styles.input} value={bankDetails.accountNumber} onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })} />
                        <TextInput placeholder="Routing Number" keyboardType="number-pad" style={styles.input} value={bankDetails.routingNumber} onChangeText={(text) => setBankDetails({ ...bankDetails, routingNumber: text })} />
                        <TouchableOpacity style={styles.saveButton} onPress={() => saveBankDetails(bankDetails)}>
                            <Text style={styles.buttonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setBankModalVisible(false)}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* View Bank Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={viewBankDetailsModal}
                onRequestClose={() => setViewBankDetailsModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Account Information</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Email:</Text>
                            <Text style={styles.infoValue}>{userEmail}</Text>
                        </View>
                        <Text style={[styles.modalTitle, {marginTop: 20}]}>Bank Account Details</Text>
                        {bankDetails.accountName ? (
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Account Name:</Text>
                                    <Text style={styles.infoValue}>{bankDetails.accountName}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Bank Name:</Text>
                                    <Text style={styles.infoValue}>{bankDetails.bankName}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Account Number:</Text>
                                    <Text style={styles.infoValue}>
                                        {bankDetails.accountNumber ? 
                                            "xxxx" + bankDetails.accountNumber.slice(-4) : ""}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Routing Number:</Text>
                                    <Text style={styles.infoValue}>
                                        {bankDetails.routingNumber ? 
                                            "xxxx" + bankDetails.routingNumber.slice(-4) : ""}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.noDataText}>No bank account details added</Text>
                        )}
                        <TouchableOpacity 
                            style={[styles.saveButton, {marginTop: 20}]} 
                            onPress={() => {
                                setViewBankDetailsModal(false);
                                setBankModalVisible(true);
                            }}>
                            <Text style={styles.buttonText}>
                                {bankDetails.accountName ? "Edit Bank Details" : "Add Bank Details"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setViewBankDetailsModal(false)}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Password Change Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={passwordModalVisible}
                onRequestClose={() => setPasswordModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <TextInput 
                            placeholder="Current Password" 
                            secureTextEntry 
                            style={styles.input} 
                            value={currentPassword} 
                            onChangeText={setCurrentPassword} 
                        />
                        <TextInput 
                            placeholder="New Password" 
                            secureTextEntry 
                            style={styles.input} 
                            value={newPassword} 
                            onChangeText={setNewPassword} 
                        />
                        <TextInput 
                            placeholder="Confirm New Password" 
                            secureTextEntry 
                            style={styles.input} 
                            value={confirmPassword} 
                            onChangeText={setConfirmPassword} 
                        />
                        <TouchableOpacity style={styles.saveButton} onPress={handlePasswordChange}>
                            <Text style={styles.buttonText}>Update Password</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setPasswordModalVisible(false)}>
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 25 },
    sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginVertical: 16 },
    settingOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
    toggleOption: { 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: "#E0E0E0",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    optionText: { fontSize: 16, color: "#4B5563" },
    logoutButton: { backgroundColor: "#FF3B30", alignItems: "center", paddingVertical: 12, borderRadius: 8, marginTop: 40, marginBottom: 40 },
    logoutText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
    modalContainer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.5)" },
    modalContent: { backgroundColor: "white", padding: 20, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 15, color: "#333" },
    input: { borderBottomWidth: 1, borderColor: "#E0E0E0", marginBottom: 10, paddingVertical: 8 },
    saveButton: { backgroundColor: "#4CAF50", padding: 12, alignItems: "center", borderRadius: 8, marginBottom: 10 },
    cancelButton: { backgroundColor: "#FF3B30", padding: 12, alignItems: "center", borderRadius: 8 },
    buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
    infoRow: { flexDirection: "row", marginBottom: 10 },
    infoLabel: { fontSize: 16, fontWeight: "500", width: "40%", color: "#333" },
    infoValue: { fontSize: 16, flex: 1, color: "#4B5563" },
    noDataText: { fontSize: 16, color: "#9CA3AF", fontStyle: "italic", marginTop: 5, marginBottom: 15 }
});

export default SettingsScreen;