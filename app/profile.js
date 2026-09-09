import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth } from "../services/firebase";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return unsubscribe;
  }, [router]);

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out of CampusConnect?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            setLoggingOut(true);

            try {
              await signOut(auth);
              router.replace("/login");
            } catch (error) {
              Alert.alert(
                "Logout failed",
                "We could not log you out. Please try again."
              );
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#168EAC" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const name = user.displayName || "CampusConnect User";
  const email = user.email || "No email address";
  const initial = name.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <View style={{ width: 45 }} />
      </View>

      {/* Profile Picture */}

      <View style={styles.profileSection}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileLetter}>{initial}</Text>
        </View>

        <Text style={styles.name}>{name}</Text>

        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Personal Information */}

      <Text style={styles.sectionTitle}>
        Personal Information
      </Text>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{name}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Student ID</Text>
          <Text style={styles.value}>Not added</Text>
        </View>
      </View>

      {/* Account Options */}

      <Text style={styles.sectionTitle}>
        Account
      </Text>

      <TouchableOpacity
        style={styles.option}
        onPress={() =>
          Alert.alert(
            "Edit Profile",
            "Profile editing will be added next."
          )
        }
      >
        <Text style={styles.optionIcon}>✏️</Text>

        <View>
          <Text style={styles.optionTitle}>
            Edit Profile
          </Text>

          <Text style={styles.optionText}>
            Update your personal information
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() =>
          Alert.alert(
            "Settings",
            "Settings will be added later."
          )
        }
      >
        <Text style={styles.optionIcon}>⚙️</Text>

        <View>
          <Text style={styles.optionTitle}>
            Settings
          </Text>

          <Text style={styles.optionText}>
            Manage your app preferences
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.option}
        onPress={() =>
          Alert.alert(
            "About CampusConnect",
            "CampusConnect helps students find important campus locations and stay updated with campus information."
          )
        }
      >
        <Text style={styles.optionIcon}>ℹ️</Text>

        <View>
          <Text style={styles.optionTitle}>
            About CampusConnect
          </Text>

          <Text style={styles.optionText}>
            Learn more about the application
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, styles.logoutOption]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Text style={styles.optionIcon}>🚪</Text>

        <View>
          <Text style={styles.logoutTitle}>
            {loggingOut ? "Logging out..." : "Log out"}
          </Text>

          <Text style={styles.optionText}>
            Sign out of your account
          </Text>
        </View>

        <Text style={styles.logoutArrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    paddingHorizontal: 25,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  header: {
    marginTop: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#168EAC",
    justifyContent: "center",
    alignItems: "center",
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 35,
    lineHeight: 38,
  },

  headerTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#111827",
  },

  profileSection: {
    alignItems: "center",
    marginTop: 35,
    marginBottom: 35,
  },

  profileCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#168EAC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  profileLetter: {
    color: "#FFFFFF",
    fontSize: 45,
    fontWeight: "bold",
  },

  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },

  email: {
    fontSize: 15,
    color: "#6B7280",
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 15,
    marginTop: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  infoRow: {
    paddingVertical: 12,
  },

  label: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 5,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },

  option: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  logoutOption: {
    marginBottom: 35,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
  },

  optionIcon: {
    fontSize: 27,
    marginRight: 15,
  },

  optionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 5,
  },

  logoutTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 5,
  },

  optionText: {
    fontSize: 13,
    color: "#6B7280",
  },

  arrow: {
    marginLeft: "auto",
    fontSize: 30,
    color: "#168EAC",
  },

  logoutArrow: {
    marginLeft: "auto",
    fontSize: 30,
    color: "#DC2626",
  },
});