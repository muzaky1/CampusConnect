import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../services/firebase";
import { registerForPushNotifications } from "../notificationService";

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      // Save this device's Expo push token to Firestore so other
      // users can send real push notifications to it.
      registerForPushNotifications(currentUser.uid);
    });

    return unsubscribe;
  }, [router]);

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#168EAC" />
        <Text style={styles.loadingText}>Loading CampusConnect...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  const firstName = user.displayName?.trim().split(" ")[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome{firstName ? `, ${firstName}` : ""} 👋
            </Text>

            <Text style={styles.appTitle}>
              CampusConnect
            </Text>

            <Text style={styles.subtitle}>
              Your campus, connected.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
          >
            <Text style={styles.notificationIcon}>
              🔔
            </Text>
          </TouchableOpacity>
        </View>

        {/* WELCOME CARD */}

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeCardContent}>
            <Text style={styles.welcomeCardTitle}>
              Stay Connected
            </Text>

            <Text style={styles.welcomeCardText}>
              Explore your campus, find important locations and stay updated
              with campus announcements.
            </Text>

            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push("/map")}
              activeOpacity={0.7}
            >
              <Text style={styles.exploreButtonText}>
                Explore Campus
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* QUICK ACTIONS */}

        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/map")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>🗺️</Text>
            </View>

            <Text style={styles.actionTitle}>
              Campus Map
            </Text>

            <Text style={styles.actionDescription}>
              Find your way around campus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>🔔</Text>
            </View>

            <Text style={styles.actionTitle}>
              Notifications
            </Text>

            <Text style={styles.actionDescription}>
              Stay updated with alerts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/profile")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>👤</Text>
            </View>

            <Text style={styles.actionTitle}>
              Profile
            </Text>

            <Text style={styles.actionDescription}>
              Manage your account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/map")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📍</Text>
            </View>

            <Text style={styles.actionTitle}>
              My Location
            </Text>

            <Text style={styles.actionDescription}>
              See your current position
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/messages")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>💬</Text>
            </View>

            <Text style={styles.actionTitle}>
              Messages
            </Text>

            <Text style={styles.actionDescription}>
              Chat with people on campus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/web-service")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>🌐</Text>
            </View>

            <Text style={styles.actionTitle}>
              Network Services
            </Text>

            <Text style={styles.actionDescription}>
              HTTP & Web Services
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/sms")}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📱</Text>
            </View>

            <Text style={styles.actionTitle}>
              SMS Services
            </Text>

            <Text style={styles.actionDescription}>
              Send SMS using your device
            </Text>
          </TouchableOpacity>
        </View>

        {/* CAMPUS INFORMATION */}

        <Text style={styles.sectionTitle}>
          Campus Information
        </Text>

        <TouchableOpacity
          style={styles.infoCard}
          onPress={() => router.push("/notifications")}
          activeOpacity={0.7}
        >
          <View style={styles.infoIconContainer}>
            <Text style={styles.infoIcon}>📢</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Campus Updates
            </Text>

            <Text style={styles.infoText}>
              Check the latest announcements and important campus information.
            </Text>
          </View>
        </TouchableOpacity>

        {/* MESSAGING INFORMATION */}

        <TouchableOpacity
          style={styles.messageInfoCard}
          onPress={() => router.push("/messages")}
          activeOpacity={0.7}
        >
          <View style={styles.messageInfoIconContainer}>
            <Text style={styles.messageInfoIcon}>💬</Text>
          </View>

          <View style={styles.messageInfoContent}>
            <Text style={styles.messageInfoTitle}>
              Campus Messaging
            </Text>

            <Text style={styles.messageInfoText}>
              Chat with other CampusConnect users and communicate with people
              on campus.
            </Text>
          </View>
        </TouchableOpacity>

        {/* PROFILE SHORTCUT */}

        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push("/profile")}
          activeOpacity={0.7}
        >
          <View style={styles.profileIconContainer}>
            <Text style={styles.profileIcon}>👤</Text>
          </View>

          <View style={styles.profileContent}>
            <Text style={styles.profileTitle}>
              Your Profile
            </Text>

            <Text style={styles.profileText}>
              View and manage your profile.
            </Text>
          </View>
        </TouchableOpacity>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CampusConnect
          </Text>

          <Text style={styles.footerSubtext}>
            Making campus life easier.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  header: {
    marginTop: 25,
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  welcomeText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 4,
  },

  appTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#182033",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 3,
  },

  notificationButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  notificationIcon: {
    fontSize: 24,
  },

  welcomeCard: {
    backgroundColor: "#168EAC",
    borderRadius: 25,
    padding: 24,
    marginBottom: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  welcomeCardContent: {
    flex: 1,
  },

  welcomeCardTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
  },

  welcomeCardText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#E8F8FC",
    maxWidth: 320,
  },

  exploreButton: {
    alignSelf: "flex-start",
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  exploreButtonText: {
    color: "#168EAC",
    fontSize: 14,
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#182033",
    marginBottom: 15,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    minHeight: 170,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F7FB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  actionIcon: {
    fontSize: 25,
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 6,
  },

  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },

  infoIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#FFF5E6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  infoIcon: {
    fontSize: 25,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 5,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },

  messageInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  messageInfoIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#E8F7FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  messageInfoIcon: {
    fontSize: 25,
  },

  messageInfoContent: {
    flex: 1,
  },

  messageInfoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 5,
  },

  messageInfoText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },

  profileIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#F0EAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  profileIcon: {
    fontSize: 25,
  },

  profileContent: {
    flex: 1,
  },

  profileTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 5,
  },

  profileText: {
    fontSize: 13,
    color: "#6B7280",
  },

  footer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 20,
  },

  footerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9CA3AF",
  },

  footerSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
});