// AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../../firebase';
import { collection, getDocs, query, where, orderBy, QuerySnapshot } from 'firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  AdminDashboard: undefined;
  ManageUsers: undefined;
  ManageReports: undefined;
  ManageLostItems: undefined;
  ManageFoundItems: undefined;
  AdminSettings: undefined;
  AdminAuth: undefined;
  ManagePayments: undefined; // Add this
  Login: undefined;
};


interface Props {
  navigation: StackNavigationProp<RootStackParamList, 'AdminDashboard'>;
}

interface Stats {
  totalUsers: number;
  totalReports: number;
  pendingReports: number;
  totalLostItems: number;
  totalFoundItems: number;
  totalPayments: number; // Add this
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen: keyof RootStackParamList;
  count?: number;
  badge?: number;
}

const AdminDashboard: React.FC<Props> = ({ navigation }) => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    totalLostItems: 0,
    totalFoundItems: 0,
    totalPayments:0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total users
        const usersSnapshot: QuerySnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnapshot.size;

        // Get reports stats
        const reportsSnapshot: QuerySnapshot = await getDocs(collection(db, 'reports'));
        const totalReports = reportsSnapshot.size;

        // Get pending reports
        const pendingReportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', 'pending')
        );
        const pendingReportsSnapshot: QuerySnapshot = await getDocs(pendingReportsQuery);
        const pendingReports = pendingReportsSnapshot.size;

        // Get lost items
        const lostItemsQuery = query(
          collection(db, 'lostItems')
         
        );
        const lostItemsSnapshot: QuerySnapshot = await getDocs(lostItemsQuery);
        const totalLostItems = lostItemsSnapshot.size;

        // Get found items
        const foundItemsQuery = query(
          collection(db, 'foundItems')
          
        );
        const foundItemsSnapshot: QuerySnapshot = await getDocs(foundItemsQuery);
        const totalFoundItems = foundItemsSnapshot.size;
         // Get payments
         const paymentsSnapshot: QuerySnapshot = await getDocs(collection(db, 'payments'));
         const totalPayments = paymentsSnapshot.size;

        setStats({
          totalUsers,
          totalReports,
          pendingReports,
          totalLostItems,
          totalFoundItems,
          totalPayments
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigation.navigate('Login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: '1',
      title: 'Manage Users',
      icon: 'people',
      screen: 'ManageUsers',
      count: stats.totalUsers
    },
    {
      id: '2',
      title: 'Reports',
      icon: 'flag',
      screen: 'ManageReports',
      count: stats.totalReports,
      badge: stats.pendingReports
    },
    {
      id: '3',
      title: 'Lost Items',
      icon: 'search',
      screen: 'ManageLostItems',
      count: stats.totalLostItems
    },
    {
      id: '4',
      title: 'Found Items',
      icon: 'checkmark-circle',
      screen: 'ManageFoundItems',
      count: stats.totalFoundItems
    },
    {
        id: '6',
        title: 'Payments',
        icon: 'cash',
        screen: 'ManagePayments',
        count: stats.totalPayments
    },
    {
      id: '5',
      title: 'Settings',
      icon: 'settings',
      screen: 'AdminSettings'
    }
  ];

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={styles.menuContent}>
        <Ionicons name={item.icon as any} size={24} color="#4B0082" />
        <Text style={styles.menuTitle}>{item.title}</Text>
      </View>
      <View style={styles.rightContent}>
        {item.count !== undefined && (
          <Text style={styles.countText}>{item.count}</Text>
        )}
        {item.badge !== undefined && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#4B0082" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.menuList}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  menuList: {
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 18,
    color: '#333',
    marginLeft: 15,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    color: '#666',
    marginRight: 10,
  },
  badge: {
    backgroundColor: '#FF4500',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AdminDashboard;
