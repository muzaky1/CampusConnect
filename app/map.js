import { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";

import * as Location from "expo-location";
import { router } from "expo-router";

export default function MapScreen() {
  // ==========================================
  // CAMPUS LOCATIONS
  // ==========================================

  const campusLocations = [
    {
      id: "1",
      name: "Main Gate",
      description: "Main entrance to the campus",
      category: "Entrance",
      latitude: 6.5192,
      longitude: 3.3705,
    },

    {
      id: "2",
      name: "Campus Library",
      description: "Library and academic resources",
      category: "Academic",
      latitude: 6.5182,
      longitude: 3.3728,
    },

    {
      id: "3",
      name: "ICT Centre",
      description: "Computer and technology facilities",
      category: "Technology",
      latitude: 6.5177,
      longitude: 3.3715,
    },

    {
      id: "4",
      name: "Medical Centre",
      description: "Campus health and medical services",
      category: "Health",
      latitude: 6.5190,
      longitude: 3.3735,
    },
  ];

  // ==========================================
  // STATES
  // ==========================================

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // NEW:
  // This stores the marker the user taps
  const [selectedPlace, setSelectedPlace] = useState(null);

  // ==========================================
  // GET LOCATION WHEN SCREEN OPENS
  // ==========================================

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // ==========================================
  // GET CURRENT LOCATION
  // ==========================================

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMsg(
          "Location permission was not granted."
        );

        setLoading(false);
        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      setLocation(currentLocation.coords);
    } catch (error) {
      console.log(error);

      setErrorMsg(
        "Unable to get your current location."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // OPEN GOOGLE MAPS DIRECTIONS
  // ==========================================

  const getDirections = async () => {
    if (!selectedPlace) {
      return;
    }

    const latitude = selectedPlace.latitude;
    const longitude = selectedPlace.longitude;

    const googleMapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&destination=${latitude},${longitude}`;

    try {
      const supported = await Linking.canOpenURL(
        googleMapsUrl
      );

      if (supported) {
        await Linking.openURL(googleMapsUrl);
      } else {
        console.log(
          "Cannot open Google Maps URL"
        );
      }
    } catch (error) {
      console.log(
        "Error opening directions:",
        error
      );
    }
  };

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#168AAD"
        />

        <Text style={styles.loadingText}>
          Getting your location...
        </Text>
      </View>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>
          📍
        </Text>

        <Text style={styles.errorTitle}>
          Location unavailable
        </Text>

        <Text style={styles.errorText}>
          {errorMsg}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={getCurrentLocation}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </Pressable>

        <Pressable
          style={styles.backButtonError}
          onPress={() => router.back()}
        >
          <Text style={styles.backTextError}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  // ==========================================
  // MAP
  // ==========================================

  return (
    <View style={styles.container}>

      {/* ======================================
          MAP
      ====================================== */}

      <MapView
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={() => {
          // Tap empty area of map to close card
          setSelectedPlace(null);
        }}
      >

        {/* ====================================
            CAMPUS MARKERS
        ==================================== */}

        {campusLocations.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            title={place.name}
            onPress={() => {
              setSelectedPlace(place);
            }}
          />
        ))}

      </MapView>

      {/* ======================================
          TOP HEADER
      ====================================== */}

      <View style={styles.header}>

        <Pressable
          style={styles.backCircle}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </Pressable>

        <View style={styles.headerTitleContainer}>

          <Text style={styles.headerTitle}>
            Campus Map
          </Text>

          <Text style={styles.headerSubtitle}>
            Tap a marker to view information
          </Text>

        </View>

      </View>

      {/* ======================================
          SELECTED PLACE CARD
      ====================================== */}

      {selectedPlace && (
        <View style={styles.placeCard}>

          {/* Close button */}

          <Pressable
            style={styles.closeButton}
            onPress={() => {
              setSelectedPlace(null);
            }}
          >
            <Text style={styles.closeText}>
              ×
            </Text>
          </Pressable>

          {/* Location icon */}

          <View style={styles.placeIcon}>
            <Text style={styles.placeEmoji}>
              📍
            </Text>
          </View>

          {/* Information */}

          <View style={styles.placeInfo}>

            <Text style={styles.placeTitle}>
              {selectedPlace.name}
            </Text>

            <Text style={styles.placeCategory}>
              {selectedPlace.category}
            </Text>

            <Text style={styles.placeDescription}>
              {selectedPlace.description}
            </Text>

          </View>

          {/* ==================================
              GET DIRECTIONS BUTTON
          ================================== */}

          <Pressable
            style={styles.directionButton}
            onPress={getDirections}
          >
            <Text style={styles.directionIcon}>
              🧭
            </Text>

            <Text style={styles.directionText}>
              Get Directions
            </Text>
          </Pressable>

        </View>
      )}

      {/* ======================================
          CURRENT LOCATION CARD
      ====================================== */}

      {!selectedPlace && (
        <View style={styles.locationCard}>

          <View style={styles.locationIcon}>
            <Text style={styles.locationEmoji}>
              📍
            </Text>
          </View>

          <View style={styles.locationInfo}>

            <Text style={styles.locationTitle}>
              My Location
            </Text>

            <Text style={styles.coordinates}>
              {location.latitude.toFixed(6)},{" "}
              {location.longitude.toFixed(6)}
            </Text>

          </View>

          {/* Refresh */}

          <Pressable
            style={styles.refreshButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.refreshText}>
              ↻
            </Text>
          </Pressable>

        </View>
      )}

    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({

  // ==========================================
  // MAIN
  // ==========================================

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  map: {
    flex: 1,
  },

  // ==========================================
  // LOADING
  // ==========================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#4B5563",
  },

  // ==========================================
  // ERROR
  // ==========================================

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#F7F9FC",
  },

  errorIcon: {
    fontSize: 50,
    marginBottom: 15,
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 25,
  },

  retryButton: {
    backgroundColor: "#168AAD",
    paddingVertical: 13,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 12,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  backButtonError: {
    paddingVertical: 10,
    paddingHorizontal: 25,
  },

  backTextError: {
    color: "#168AAD",
    fontWeight: "600",
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  backCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",

    elevation: 5,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  backIcon: {
    fontSize: 32,
    color: "#111827",
    marginTop: -4,
  },

  headerTitleContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginLeft: 10,

    elevation: 5,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // ==========================================
  // SELECTED PLACE CARD
  // ==========================================

  placeCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,

    backgroundColor: "#FFFFFF",
    borderRadius: 20,

    padding: 18,

    elevation: 10,

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  closeButton: {
    position: "absolute",
    right: 12,
    top: 12,

    width: 32,
    height: 32,
    borderRadius: 16,

    backgroundColor: "#F1F5F9",

    justifyContent: "center",
    alignItems: "center",

    zIndex: 10,
  },

  closeText: {
    fontSize: 24,
    color: "#475569",
    lineHeight: 26,
  },

  placeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,

    backgroundColor: "#E8F7FA",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 10,
  },

  placeEmoji: {
    fontSize: 24,
  },

  placeInfo: {
    paddingRight: 35,
  },

  placeTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111827",
  },

  placeCategory: {
    fontSize: 13,
    fontWeight: "700",
    color: "#168AAD",
    marginTop: 4,
  },

  placeDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 15,
  },

  // ==========================================
  // DIRECTIONS BUTTON
  // ==========================================

  directionButton: {
    backgroundColor: "#168AAD",

    height: 50,

    borderRadius: 12,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  directionIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  directionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // ==========================================
  // CURRENT LOCATION CARD
  // ==========================================

  locationCard: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,

    backgroundColor: "#FFFFFF",
    borderRadius: 18,

    padding: 15,

    flexDirection: "row",
    alignItems: "center",

    elevation: 6,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  locationIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,

    backgroundColor: "#E8F7FA",

    justifyContent: "center",
    alignItems: "center",
  },

  locationEmoji: {
    fontSize: 20,
  },

  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },

  locationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  coordinates: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },

  // ==========================================
  // REFRESH BUTTON
  // ==========================================

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,

    backgroundColor: "#168AAD",

    justifyContent: "center",
    alignItems: "center",
  },

  refreshText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
  },
});