// AppNavigator.tsx
import React, { useEffect } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import LoginScreen from "../app/screens/LoginScreen";
import RegisterScreen from "../app/screens/RegisterScreen";
import TabNavigator from "./TabNavigator";
import TrackDeviceScreen from "../app/screens/TrackingScreen";
import SettingsScreen from "../app/screens/SettingScreen";
import EditPostScreen from "../app/screens/EditPostScreen";
import ProfileScreen from "../app/screens/ProfileScreen";
import MessagesScreen from "../app/screens/MessagesScreen";
import ChatScreen from "../app/screens/ChatScreen";
import RewardSelectionScreen from "../app/screens/RewardSelectionScreen";
import RegisterDeviceScreen from "../app/screens/RegisterDeviceScreen";
import DeviceScreen from "../app/screens/DeviceScreen";
import * as Notifications from "expo-notifications";
import { StackNavigationProp } from "@react-navigation/stack";
import NotificationsScreen from "../app/screens/NotificationsScreen";
import ChatbotScreen from "../app/screens/ChatbotScreen";
import StripeTransferScreen from "../app/screens/PaymentScreen";
import StripeOnboardingScreen from "../app/screens/StripeOnboardingScreen";
import BankTransferScreen from "../app/screens/BankTransferScreen";
import AdminDashboard from "../app/screens/admin/AdminDashboard"; // Import AdminDashboard
import ManageUsers from "../app/screens/admin/ManageUsers";
import ManageFoundItems from "../app/screens/admin/ManageFoundItems";
import ManageLostItems from "../app/screens/admin/ManageLostItems";
import ManageReports from "../app/screens/admin/ManageReports";
import ManageUsersScreen from "../app/screens/admin/ManageUsers";
import ManageFoundItemsScreen from "../app/screens/admin/ManageFoundItems";
import AdminSettings from "../app/screens/admin/AdminSettings";
import ManagePayments from "../app/screens/admin/ManagePayment";
// Define RootStackParamList
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  AdminDashboard: undefined; // Add AdminDashboard to the param list
  Tracking: undefined;
  SettingScreen: undefined;
  EditPostScreen: undefined;
  ProfileScreen: undefined;
  MessagesScreen: undefined;
  ChatScreen: { chatId: string; recipientName: string };
  RewardSelectionScreen: undefined;
  RegisterDevice: undefined;
  DeviceScreen: undefined;
  ChatbotScreen: undefined;
  NotificationsScreen: undefined;
  BankTransferScreen: undefined;
  StripeTransferScreen: undefined;
  StripeOnboardingScreen: undefined;
  ManageUsers: undefined;
  ManageFoundItems: undefined;
  ManageLostItems: undefined;
  ManageReports: undefined;
  ManageUsersScreen: undefined;
  ManageFoundItemsScreen: undefined;
  AdminSettings: undefined;
  ManagePayments: undefined;
  TrackDeviceScreen: {
    device: {
      id: string;
      deviceName: string;
      location?: { latitude: number; longitude: number };
    };
  };
};

const Stack = createStackNavigator<RootStackParamList>();

// Route Configuration
const routes: {
  name: keyof RootStackParamList;
  component: React.ComponentType<any>;
  options?: any;
}[] = [
  { name: "Login", component: LoginScreen },
  { name: "Register", component: RegisterScreen },
  { name: "Main", component: TabNavigator },
  { name: "AdminDashboard", component: AdminDashboard }, // Add AdminDashboard route
  { name: "TrackDeviceScreen", component: TrackDeviceScreen },
  { name: "SettingScreen", component: SettingsScreen },
  { name: "EditPostScreen", component: EditPostScreen },
  { name: "ProfileScreen", component: ProfileScreen },
  { name: "MessagesScreen", component: MessagesScreen },
  { name: "ChatScreen", component: ChatScreen },
  { name: "RewardSelectionScreen", component: RewardSelectionScreen },
  { name: "RegisterDevice", component: RegisterDeviceScreen },
  { name: "ChatbotScreen", component: ChatbotScreen },
  { name: "StripeTransferScreen", component: StripeTransferScreen },
  { name: "StripeOnboardingScreen", component: StripeOnboardingScreen },
  { name: "BankTransferScreen", component: BankTransferScreen },
  { name: "ManageUsers", component: ManageUsers }, 
  { name: "ManageFoundItems", component: ManageFoundItems },
  { name: "ManageLostItems", component: ManageLostItems },
  { name: "ManageReports", component: ManageReports },
  { name: "ManageUsersScreen", component: ManageUsersScreen },
  { name: "ManageFoundItemsScreen", component: ManageFoundItemsScreen },
  { name: "AdminSettings", component: AdminSettings },
  { name: "ManagePayments", component: ManagePayments },
  {
    name: "DeviceScreen",
    component: DeviceScreen,
    options: { title: "Device" },
  },
  {
    name: "NotificationsScreen",
    component: NotificationsScreen,
  },
];

// AppNavigator Component
const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {routes.map((route) => (
        <Stack.Screen
          key={route.name}
          name={route.name}
          component={route.component}
          options={route.options}
        />
      ))}
    </Stack.Navigator>
  );
};

// Notification Handler
function NotificationHandler() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.request.content;

        if (data && data.chatId && data.recipientName) {
          navigation.navigate("ChatScreen", {
            chatId: data.chatId,
            recipientName: data.recipientName,
          });
        }
      }
    );

    return () => subscription.remove();
  }, [navigation]);

  return null;
}

const NavigatorWrapper: React.FC = () => {
  return (
    <>
      <NotificationHandler />
      <AppNavigator />
    </>
  );
};

export default NavigatorWrapper;
