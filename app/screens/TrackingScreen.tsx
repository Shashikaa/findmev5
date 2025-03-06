import React, { useState, useEffect } from 'react';
import { Platform, View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for the back button

// Conditionally import MapView and Marker
let MapViewComponent;
let MarkerComponent;
if (Platform.OS === 'android' || Platform.OS === 'ios') {
    MapViewComponent = require('react-native-maps').default;
    MarkerComponent = require('react-native-maps').Marker;
} else {
    MapViewComponent = () => (
        <View style={styles.noMapContainer}>
            <Text style={styles.noMapText}>Map is not available on web.</Text>
        </View>
    );
    MarkerComponent = () => null;
}

interface Device {
    id: string;
    deviceName: string;
    location?: { latitude: number; longitude: number };
}

interface RouteParams {
    device: Device;
}

const TrackDeviceScreen = ({ route }: { route: { params: RouteParams } }) => {
    const { device } = route.params;
    const [deviceLocation, setDeviceLocation] = useState(device.location);
    const navigation = useNavigation(); // Use the useNavigation hook

    useEffect(() => {
        if (device.location) {
            setDeviceLocation(device.location);
        }
    }, [device.location]);

    const goBack = () => {
        navigation.goBack(); // Function to navigate back
    };

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}> Back</Text>
            </TouchableOpacity>

            {deviceLocation ? (
                <MapViewComponent
                    style={styles.map}
                    initialRegion={{
                        latitude: deviceLocation.latitude,
                        longitude: deviceLocation.longitude,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
                >
                    <MarkerComponent coordinate={deviceLocation} title={device.deviceName} />
                </MapViewComponent>
            ) : (
                <View style={styles.noLocationContainer}>
                    <Text style={styles.noLocationText}>Location not available</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0', // Light background for better readability
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    noLocationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noLocationText: {
        fontSize: 18,
        color: '#888',
    },
    noMapContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noMapText: {
        fontSize: 18,
        color: '#888',
    },
});

export default TrackDeviceScreen;
