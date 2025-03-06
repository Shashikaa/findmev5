import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Platform } from "react-native";
import HomeScreen from "../app/screens/HomeScreen";
import SearchScreen from "../app/screens/SearchScreen";
import AddScreen from "../app/screens/AddScreen";
import DevicesScreen from "../app/screens/DeviceScreen";
import ProfileScreen from "../app/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.navBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const Icon = () => {
          switch (route.name) {
            case "Home":
              return <Ionicons name="home" size={24} color={isFocused ? "#7C3AED" : "#4B5563"} />;
            case "Search":
              return <Ionicons name="search" size={24} color={isFocused ? "#7C3AED" : "#4B5563"} />;
            case "Add":
              return <Ionicons name="add-circle" size={48} color={isFocused ? "#7C3AED" : "#4B5563"} />;
            case "Devices":
              return <MaterialIcons name="devices-other" size={24} color={isFocused ? "#7C3AED" : "#4B5563"} />;
            case "Profile":
              return <Ionicons name="person" size={24} color={isFocused ? "#7C3AED" : "#4B5563"} />;
            default:
              return null;
          }
        };

        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={route.name === "Add" ? styles.addButton : styles.navItem}
          >
            <Icon />
            <Text style={[styles.navText, isFocused && styles.activeNavText]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    zIndex: 100, // Ensure it sits on top of other elements
    elevation: 10, // For Android shadow effect
    ...(Platform.OS === "ios" ? { paddingBottom: 10 } : {}), // Adjust padding for iOS
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
  },
  activeNavText: {
    color: "#7C3AED",
  },
  addButton: {
    alignItems: "center",
    marginBottom: 10,
  },
});

export default TabNavigator;
