// ManageUsers.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../../firebase';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    ManageUsers: undefined;
    // Add other routes here if needed
};

interface Props {
    navigation: StackNavigationProp<RootStackParamList, 'ManageUsers'>;
}

interface User {
    id: string;
    displayName?: string;
    email: string;
    role?: string;
    isActive: boolean;
}

const ManageUsers: React.FC<Props> = ({ navigation }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);

            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];

            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
            Alert.alert("Error", "Failed to load users");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleToggleStatus = async (userId: string, isActive: boolean) => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                isActive: !isActive
            });

            // Update local state
            setUsers(users.map(user =>
                user.id === userId ? { ...user, isActive: !isActive } : user
            ));

            Alert.alert("Success", `User ${isActive ? 'deactivated' : 'activated'} successfully`);
        } catch (error) {
            console.error("Error updating user status:", error);
            Alert.alert("Error", "Failed to update user status");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this user? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', userId));
                            setUsers(users.filter(user => user.id !== userId));
                            Alert.alert("Success", "User deleted successfully");
                        } catch (error) {
                            console.error("Error deleting user:", error);
                            Alert.alert("Error", "Failed to delete user");
                        }
                    }
                }
            ]
        );
    };

    const filteredUsers = searchQuery
        ? users.filter(user =>
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : users;

    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userItem}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.displayName || 'No Name'}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userDetails}>
                    Role: {item.role || 'user'} •
                    Status: <Text style={{ color: item.isActive ? 'green' : 'red' }}>
                        {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                </Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: item.isActive ? '#FF6B6B' : '#4CAF50' }]}
                    onPress={() => handleToggleStatus(item.id, item.isActive)}
                >
                    <Text style={styles.actionButtonText}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => handleDeleteUser(item.id)}
                >
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.usersList}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'No users matching your search' : 'No users found'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f4f4f4',
        paddingTop: Platform.OS === 'ios' ? 45 : 25,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: 40,
    },
    usersList: {
        paddingBottom: 20,
    },
    userItem: {
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
    userInfo: {
        marginBottom: 10,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    userDetails: {
        fontSize: 14,
        color: '#777',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
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
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#777',
    },
});

export default ManageUsers;
