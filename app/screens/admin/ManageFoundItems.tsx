// ManageFoundItems.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, TextInput, Platform } from 'react-native';
import { db } from '../../../firebase';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  where,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';

interface Item {
  postId: string;
  id: string;
  name?: string;
  description?: string;
  createdAt?: any; // Timestamp
  type?: string;
  image?: string; // Image URL
  found?: boolean; // Found status
}

const ManageFoundItems = () => {
  const [foundItems, setFoundItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFoundItems = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'foundItems'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);

      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];

      setFoundItems(itemsData);
      setFilteredItems(itemsData);
    } catch (error) {
      console.error("Error fetching found items:", error);
      Alert.alert("Error", "Failed to load found items");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFoundItems();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFoundItems();
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this item? This action cannot be undone.",
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
              await deleteDoc(doc(db, 'items', itemId));
              setFoundItems(foundItems.filter(item => item.id !== itemId));
              setFilteredItems(filteredItems.filter(item => item.id !== itemId));
              Alert.alert("Success", "Item deleted successfully");
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          }
        }
      ]
    );
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filtered = foundItems.filter(item =>
      item.name?.toLowerCase().includes(text.toLowerCase()) ||
      item.description?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <View style={styles.listItem}>
      <View style={styles.itemInfo}>
        <Image
          source={{ uri: item.image }} // Assuming item.image holds the image URL
          style={styles.itemImage}
        />
        <Text style={styles.itemName}>{item.name || 'No Name'}</Text>
        <Text style={styles.postId}>{item.postId || 'No ID'}</Text>
        <Text style={styles.itemDescription}>{item.description || 'No description'}</Text>
        <Text style={[styles.found, { color: item.found ? '#4CAF50' : '#FF3B30' }]}>
          {item.found ? 'Found' : 'Not Found'}
        </Text>
        <Text style={styles.itemDate}>
          Reported on: {item.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search found items..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No found items found</Text>
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  postId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  itemDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  itemDate: {
    fontSize: 12,
    color: '#888',
  },
  found: {
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
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

export default ManageFoundItems;
