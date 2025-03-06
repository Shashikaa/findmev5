// ManagePayments.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase'; // Import the Firestore instance from your firebase config file
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    ManagePayments: undefined;
};

type ManagePaymentsProps = {
    navigation: StackNavigationProp<RootStackParamList, 'ManagePayments'>;
};

interface Payment {
    id: string;
    amount: number;
    method: string;
    notes: string;
    postId: string;
    receiptUrl: string;
    recipientName: string;
    recipientUid: string;
    senderUid: string;
    status: 'pending' | 'completed' | 'rejected';
    timestamp: any;
}

const ManagePayments: React.FC<ManagePaymentsProps> = ({ navigation }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const paymentsCollection = collection(db, 'payments'); // Use modular v9 SDK
            
            // Fetch data
            const querySnapshot = await getDocs(paymentsCollection);

            // Map data
            const paymentsData = querySnapshot.docs.map(doc => {
                return {
                    id: doc.id,
                    ...doc.data(),
                } as Payment; // Type assert
            });

            setPayments(paymentsData);
        } catch (error) {
            console.error("Error fetching payments:", error);
            Alert.alert("Error", "Failed to load payments");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPayments();
    };

    const handleVerifyPayment = async (paymentId: string) => {
        try {
            const paymentDocRef = doc(db, 'payments', paymentId);
            await updateDoc(paymentDocRef, { status: 'completed' });
            
            setPayments(payments.map(payment =>
                payment.id === paymentId ? { ...payment, status: 'completed' } : payment
            ));
            Alert.alert("Success", "Payment verified successfully");
        } catch (error) {
            console.error("Error verifying payment:", error);
            Alert.alert("Error", "Failed to verify payment");
        }
    };

    const handleRejectPayment = async (paymentId: string) => {
        try {
            const paymentDocRef = doc(db, 'payments', paymentId);
            await updateDoc(paymentDocRef, { status: 'rejected' });
            
            setPayments(payments.map(payment =>
                payment.id === paymentId ? { ...payment, status: 'rejected' } : payment
            ));
            Alert.alert("Success", "Payment rejected successfully");
        } catch (error) {
            console.error("Error rejecting payment:", error);
            Alert.alert("Error", "Failed to reject payment");
        }
    };

    const renderPaymentItem = ({ item }: { item: Payment }) => (
        <View style={styles.paymentItem}>
            <Text style={styles.paymentAmount}>Amount: {item.amount}</Text>
            <Text>Method: {item.method}</Text>
            <Text>Notes: {item.notes}</Text>
            <Text>Recipient: {item.recipientName}</Text>
            <Text>Status: {item.status}</Text>
            <Image source={{ uri: item.receiptUrl }} style={{width: 100, height: 100}}/>
            <View style={styles.paymentActions}>
                {item.status === 'pending' && (
                    <>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                            onPress={() => handleVerifyPayment(item.id)}
                        >
                            <Text style={styles.actionButtonText}>Verify</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                            onPress={() => handleRejectPayment(item.id)}
                        >
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={payments}
                renderItem={renderPaymentItem}
                keyExtractor={item => item.id}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={<Text>No payments found.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f4f4f4',
    },
    paymentItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 3,
    },
    paymentAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    paymentActions: {
        flexDirection: 'row',
        marginTop: 10
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginLeft: 10,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default ManagePayments;