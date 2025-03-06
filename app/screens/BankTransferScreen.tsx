import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import usePushNotifications from '../../hooks/usePushNotifications'; // Import the hook

interface BankTransferScreenProps {
  route: any;
  navigation: any;
}

const BankTransferScreen: React.FC<BankTransferScreenProps> = ({ route, navigation }) => {
  const { recipientId, recipientName, postId } = route.params;
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  // New state variables to hold recipient's bank details
  const [recipientAccountName, setRecipientAccountName] = useState('');
  const [recipientBankName, setRecipientBankName] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientRoutingNumber, setRecipientRoutingNumber] = useState('');

  // Use the push notifications hook
  const { sendPushNotification } = usePushNotifications('');

  useEffect(() => {
    // Fetch recipient's bank details
    const fetchRecipientBankDetails = async () => {
      if (!recipientId) return;
      try {
        const userRef = doc(db, 'users', recipientId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setRecipientAccountName(userData.accountName || 'Not provided');
          setRecipientBankName(userData.bankName || 'Not provided');
          setRecipientAccountNumber(userData.accountNumber || 'Not provided');
          setRecipientRoutingNumber(userData.routingNumber || 'Not provided');
        } else {
          console.log('Recipient user document not found');
        }
      } catch (error) {
        console.error('Error fetching recipient bank details:', error);
        Alert.alert('Error', 'Failed to fetch recipient bank details');
      }
    };

    fetchRecipientBankDetails();
  }, [recipientId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your media library');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadReceipt = async () => {
    if (!receiptImage) return null;

    try {
      setIsUploading(true);

      // Convert URI to blob
      const response = await fetch(receiptImage);
      const blob = await response.blob();

      // Create a unique filename
      const filename = `receipts/${auth.currentUser?.uid}_${new Date().getTime()}`;
      const storageRef = ref(storage, filename);

      // Upload the file
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      setIsUploading(false);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      Alert.alert('Error', 'Failed to upload receipt image');
      setIsUploading(false);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!receiptImage) {
      Alert.alert('Error', 'Please upload a receipt image');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload receipt image
      const receiptUrl = await uploadReceipt();

      if (!receiptUrl) {
        Alert.alert('Error', 'Failed to upload receipt image');
        setIsSubmitting(false);
        return;
      }

      // Add payment record to database
      await addDoc(collection(db, 'payments'), {
        senderUid: auth.currentUser?.uid,
        recipientUid: recipientId,
        recipientName: recipientName,
        postId: postId,
        amount: parseFloat(amount),
        notes: notes,
        receiptUrl: receiptUrl,
        method: 'bank_transfer',
        status: 'completed',
        timestamp: serverTimestamp(),
      });

      // Send push notification
      await sendPushNotification(recipientId, `You have received a payment of $${amount}!`, postId);

      // Update post status
      const postRef = doc(db, 'lostItems', postId);
      await updateDoc(postRef, {
        paymentCompleted: true,
        paymentMethod: 'bank_transfer',
        paymentTimestamp: serverTimestamp(),
      });

      Alert.alert(
        'Success',
        'Payment record and receipt uploaded successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main', {
              screen: 'Profile',
              params: {
                paymentGiven: true,
                postId: postId,
              },
            }),
          }
        ]
        
      );
    } catch (error) {
      console.error('Error submitting payment:', error);
      Alert.alert('Error', 'Failed to process payment record');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bank Transfer</Text>
          <Text style={styles.headerSubtitle}>
            Send payment to {recipientName} and upload receipt
          </Text>
        </View>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a message to the recipient"
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>
        </View>

        {/* Display Recipient Bank Information */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Recipient Bank Information</Text>
          <View style={styles.bankInfoContainer}>
            <Text style={styles.bankInfoText}>
              Please send payment to the account below and upload the receipt once complete.
            </Text>
            <View style={styles.bankDetailItem}>
              <Text style={styles.bankDetailLabel}>Account Name:</Text>
              <Text style={styles.bankDetailValue}>{recipientAccountName}</Text>
            </View>
            <View style={styles.bankDetailItem}>
              <Text style={styles.bankDetailLabel}>Bank:</Text>
              <Text style={styles.bankDetailValue}>{recipientBankName}</Text>
            </View>
            <View style={styles.bankDetailItem}>
              <Text style={styles.bankDetailLabel}>Account Number:</Text>
              <Text style={styles.bankDetailValue}>{recipientAccountNumber}</Text>
            </View>
            <View style={styles.bankDetailItem}>
              <Text style={styles.bankDetailLabel}>Routing Number:</Text>
              <Text style={styles.bankDetailValue}>{recipientRoutingNumber}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Upload Receipt</Text>
          <Text style={styles.uploadDescription}>
            Please upload a screenshot or photo of your bank transfer receipt
          </Text>
          
          <TouchableOpacity 
            style={styles.uploadButton} 
            onPress={pickImage}
            disabled={isUploading}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.uploadButtonText}>
              {receiptImage ? 'Change Receipt Image' : 'Select Receipt Image'}
            </Text>
          </TouchableOpacity>
          
          {receiptImage && (
            <View style={styles.receiptPreviewContainer}>
              <Image 
                source={{ uri: receiptImage }} 
                style={styles.receiptPreview} 
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setReceiptImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!amount || !receiptImage || isSubmitting || isUploading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!amount || !receiptImage || isSubmitting || isUploading}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="white" />
              <Text style={styles.submitButtonText}>Confirm Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  currencySymbol: {
    paddingHorizontal: 12,
    fontSize: 18,
    color: '#4B5563',
  },
  
    amountInput: {
      flex: 1,
      paddingVertical: 12,
      paddingRight: 12,
      fontSize: 18,
      color: '#111827',
    },
    notesInput: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: '#111827',
      backgroundColor: '#F9FAFB',
      minHeight: 100,
      textAlignVertical: 'top',
    },
    bankInfoContainer: {
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      padding: 16,
    },
    bankInfoText: {
      fontSize: 14,
      color: '#4B5563',
      marginBottom: 16,
    },
    bankDetailItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    bankDetailLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#4B5563',
    },
    bankDetailValue: {
      fontSize: 14,
      color: '#111827',
    },
    uploadDescription: {
      fontSize: 14,
      color: '#6B7280',
      marginBottom: 16,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3B82F6',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    uploadButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
      marginLeft: 8,
    },
    receiptPreviewContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    receiptPreview: {
      width: '100%',
      height: 200,
      borderRadius: 8,
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 16,
      padding: 4,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#10B981',
      borderRadius: 8,
      padding: 16,
      marginTop: 24,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
    },
  });

export default BankTransferScreen;
