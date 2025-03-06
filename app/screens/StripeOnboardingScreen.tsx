import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView 
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import axios from 'axios';

interface OnboardingScreenProps {
  route: any;
  navigation: any;
}

const StripeOnboardingScreen: React.FC<OnboardingScreenProps> = ({ route, navigation }) => {
  const { userId } = route.params || {};
  
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Server URL - replace with your server endpoint
  const API_URL = 'https://tranquil-forest-88658-c68fe352689e.herokuapp.com';
  
  useEffect(() => {
    // Set up deep linking handler for return from Stripe
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  const handleDeepLink = async (event: { url: string }) => {
    console.log('Deep link received:', event.url);
    
    const { path, queryParams } = Linking.parse(event.url);
    
    if (path === 'return') {
      // User returned from Stripe onboarding
      if (queryParams && queryParams.success === 'true') {
        Alert.alert('Success', 'Your Stripe account was set up successfully!');
        // Navigate to the appropriate screen with the new Stripe account ID
        navigation.navigate('Dashboard', { 
          refreshUserData: true 
        });
      } else {
        Alert.alert('Incomplete', 'Your Stripe account setup is incomplete. Please try again.');
      }
    }
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    
    return true;
  };
  
  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Create a Stripe connected account through your server
      const response = await axios.post(`${API_URL}/create-connected-account`, {
        name,
        email,
        userId // Your internal user ID
      });
      
      console.log('Stripe account created:', response.data);
      
      if (response.data.onboardingUrl) {
        // Store the account ID in your database
        await axios.post(`${API_URL}/update-user`, {
          userId,
          stripeAccountId: response.data.accountId
        });
        
        // Open the Stripe onboarding URL
        const result = await WebBrowser.openBrowserAsync(response.data.onboardingUrl);
        console.log('Browser result:', result);
        
        if (result.type === 'cancel') {
          Alert.alert('Onboarding Cancelled', 'You cancelled the Stripe onboarding process.');
        }
      } else {
        throw new Error('No onboarding URL returned');
      }
    } catch (error: any) {
      console.error('Account creation error:', error);
      Alert.alert('Account Creation Failed', error.message || 'Failed to create Stripe account');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Set Up Your Stripe Account</Text>
      
      <View style={styles.formContainer}>
        <Text style={styles.description}>
          To send and receive money, you need to connect with Stripe. This is a one-time setup process.
        </Text>
        
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
        />
        
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TouchableOpacity
          style={[styles.button, isLoading ? styles.buttonDisabled : {}]}
          onPress={handleCreateAccount}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Setting Up...' : 'Set Up Stripe Account'}
          </Text>
        </TouchableOpacity>
        
        {isLoading && (
          <ActivityIndicator size="large" color="#0066cc" style={styles.loader} />
        )}
        
        <Text style={styles.infoText}>
          Note: You'll be redirected to Stripe to complete your account setup. This will require ID verification as per financial regulations.
        </Text>
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
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
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
  button: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 25,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default StripeOnboardingScreen;