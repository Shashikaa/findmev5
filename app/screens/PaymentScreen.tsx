import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import axios from 'axios';
import { CardField, useStripe, useConfirmPayment } from '@stripe/stripe-react-native';

interface TransferScreenProps {
  route: any;
  navigation: any;
}

const StripeTransferScreen: React.FC<TransferScreenProps> = ({ route, navigation }) => {
  const stripe = useStripe();
  const { confirmPayment } = useConfirmPayment();
  const { userStripeId, userName, userEmail } = route.params || {};
  
  const [amount, setAmount] = useState<string>('100');
  const [recipientStripeId, setRecipientStripeId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cardComplete, setCardComplete] = useState<boolean>(false);
  
  // Server URL - replace with your server endpoint
  const API_URL = 'https://tranquil-forest-88658-c68fe352689e.herokuapp.com';
  
  const fetchRecipientDetails = async (id: string) => {
    try {
      // This would be your API endpoint to get user details by Stripe ID
      const response = await axios.get(`${API_URL}/user/${id}`);
      if (response.data) {
        setRecipientName(response.data.name);
      }
    } catch (error) {
      console.error('Error fetching recipient details:', error);
    }
  };
  
  useEffect(() => {
    if (recipientStripeId) {
      fetchRecipientDetails(recipientStripeId);
    }
  }, [recipientStripeId]);
  
  const validateForm = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return false;
    }
    
    if (!recipientStripeId) {
      Alert.alert('Missing Recipient', 'Please enter a recipient Stripe ID.');
      return false;
    }
    
    if (!cardComplete) {
      Alert.alert('Incomplete Card Details', 'Please complete your card information.');
      return false;
    }
    
    return true;
  };
  
  const handlePayment = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      // Step 1: Create a payment intent on your server
      const response = await axios.post(`${API_URL}/create-transfer`, {
        amount: Number(amount),
        senderStripeId: userStripeId,
        recipientStripeId: recipientStripeId,
        description: description || `Payment from ${userName} to ${recipientName}`
      });
      
      console.log('Payment intent created:', response.data);
      
      if (!response.data.clientSecret) {
        throw new Error('Failed to create payment intent');
      }
      
      // Step 2: Confirm the payment with Stripe
      const { error, paymentIntent } = await confirmPayment(response.data.clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: userEmail,
          },
        },
      });
      
      if (error) {
        throw new Error(error.message);
      } else if (paymentIntent) {
        Alert.alert(
          'Payment Successful',
          `You have sent ${amount} LKR to ${recipientName}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('PaymentSuccess', {
                amount,
                recipientName,
                transactionId: paymentIntent.id
              })
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'An error occurred during payment processing');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Send Money</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Recipient Stripe ID</Text>
        <TextInput
          style={styles.input}
          value={recipientStripeId}
          onChangeText={setRecipientStripeId}
          placeholder="Enter recipient's Stripe ID"
        />
        
        {recipientName && (
          <Text style={styles.recipientName}>
            Sending to: {recipientName}
          </Text>
        )}
        
        <Text style={styles.label}>Amount (LKR)</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
        />
        
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this payment for?"
          multiline
        />
        
        <Text style={styles.label}>Card Details</Text>
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={styles.cardField}
          style={styles.cardContainer}
          onCardChange={(cardDetails) => {
            setCardComplete(cardDetails.complete);
          }}
        />
        
        <TouchableOpacity
          style={[
            styles.payButton,
            (isProcessing || !cardComplete) ? styles.payButtonDisabled : {}
          ]}
          onPress={handlePayment}
          disabled={isProcessing || !cardComplete}
        >
          <Text style={styles.payButtonText}>
            {isProcessing ? 'Processing...' : 'Send Money'}
          </Text>
        </TouchableOpacity>
        
        {isProcessing && (
          <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  recipientName: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  cardContainer: {
    height: 50,
    marginBottom: 30,
  },
  cardField: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  payButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  payButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
});

export default StripeTransferScreen;