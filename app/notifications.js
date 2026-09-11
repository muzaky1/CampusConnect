import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";

import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  addNotification,
  getNotifications,
  markNotificationAsRead,
  clearNotifications,
  sendDeviceNotification,
} from "../notificationService";

export default function NotificationScreen() {
  const router = useRouter();

  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Load notifications from notificationService
  const loadNotifications = useCallback(() => {
    setNotifications([...getNotifications()]);
  }, []);

  // Reload whenever the screen becomes active
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  // Send test notification
  const handleSendTestNotification = async () => {
    if (sending) return;

    setSending(true);

    try {
      const title = "CampusConnect 🔔";
      const message =
        "This is a test notification from CampusConnect.";

      // 1. Add notification to the in-app notification list
      addNotification({
        title,
        message,
      });

      // 2. Send actual Android device notification
      const sent = await sendDeviceNotification({
        title,
        message,
      });

      // Refresh notification list
      loadNotifications();

      if (sent) {
        Alert.alert(
          "Notification Sent 🔔",
          "The notification has been added to CampusConnect and sent to your device."
        );
      } else {
        Alert.alert(
          "In-App Notification Added",
          "The notification was added to CampusConnect, but device notification permission was not granted."
        );
      }
    } catch (error) {
      console.error(
        "Test notification error:",
        error
      );

      Alert.alert(
        "Notification Error",
        "Unable to send the device notification."
      );
    } finally {
      setSending(false);
    }
  };

  // Mark notification as read; deep-link into the chat when the
  // notification carries a chat payload (see app/_layout.tsx).
  const handleNotificationPress = (id) => {
    const tapped = notifications.find((n) => n.id === id);

    markNotificationAsRead(id);
    loadNotifications();

    if (tapped?.data?.userId && tapped?.data?.name) {
      router.push({
        pathname: "/chat",
        params: {
          userId: String(tapped.data.userId),
          name: String(tapped.data.name),
        },
      });
    }
  };

  // Clear all notifications
  const handleClearNotifications = () => {
    if (notifications.length === 0) {
      return;
    }

    Alert.alert(
      "Clear Notifications",
      "Are you sure you want to clear all notifications?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearNotifications();
            loadNotifications();
          },
        },
      ]
    );
  };

  // Format notification time
  const formatTime = (createdAt) => {
    if (!createdAt) {
      return "Just now";
    }

    const date = new Date(createdAt);

    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={32}
              color="#172033"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Notifications</Text>

            <Text style={styles.subtitle}>
              Stay updated with campus alerts
            </Text>
          </View>
        </View>

        {/* EMPTY STATE */}
        {notifications.length === 0 ? (
          <View style={styles.notificationCard}>
            <View style={styles.bellCircle}>
              <Text style={styles.bell}>🔔</Text>
            </View>

            <Text style={styles.emptyTitle}>
              No Notifications Yet
            </Text>

            <Text style={styles.emptyText}>
              Important campus announcements and alerts
              {"\n"}
              will appear here.
            </Text>

            <TouchableOpacity
              style={[
                styles.testButton,
                sending && styles.testButtonDisabled,
              ]}
              onPress={handleSendTestNotification}
              disabled={sending}
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#FFFFFF"
              />

              <Text style={styles.testButtonText}>
                {sending
                  ? "Sending..."
                  : "Send Test Notification"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notificationsContainer}>
            {/* NOTIFICATION HEADER */}
            <View style={styles.notificationHeader}>
              <View>
                <Text style={styles.notificationCount}>
                  {notifications.length}{" "}
                  {notifications.length === 1
                    ? "Notification"
                    : "Notifications"}
                </Text>

                <Text style={styles.notificationHeaderSubtitle}>
                  Your latest campus updates
                </Text>
              </View>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearNotifications}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color="#0C6474"
                />

                <Text style={styles.clearButtonText}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {/* NOTIFICATION LIST */}
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read &&
                    styles.unreadNotification,
                ]}
                onPress={() =>
                  handleNotificationPress(notification.id)
                }
                activeOpacity={0.8}
              >
                {/* ICON */}
                <View style={styles.notificationIconCircle}>
                  <Ionicons
                    name={
                      notification.read
                        ? "notifications-outline"
                        : "notifications"
                    }
                    size={24}
                    color="#0C6474"
                  />
                </View>

                {/* CONTENT */}
                <View style={styles.notificationContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notificationTitle}>
                      {notification.title}
                    </Text>

                    {!notification.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>

                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>

                  <Text style={styles.notificationTime}>
                    {formatTime(notification.createdAt)}
                  </Text>

                  <Text style={styles.readStatus}>
                    {notification.read
                      ? "Read"
                      : "Tap to mark as read"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* ADD ANOTHER TEST NOTIFICATION */}
            <TouchableOpacity
              style={[
                styles.testButton,
                styles.anotherButton,
                sending && styles.testButtonDisabled,
              ]}
              onPress={handleSendTestNotification}
              disabled={sending}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={23}
                color="#FFFFFF"
              />

              <Text style={styles.testButtonText}>
                {sending
                  ? "Sending..."
                  : "Add Test Notification"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* INFORMATION CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <Text style={styles.megaphone}>📢</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Stay Connected
            </Text>

            <Text style={styles.infoText}>
              Check this page regularly for important
              updates from your campus.
            </Text>
          </View>
        </View>

        {/* BACK TO HOME */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace("/")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="home-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.homeButtonText}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F8FC",
  },

  container: {
    paddingHorizontal: 40,
    paddingTop: 25,
    paddingBottom: 40,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 35,
  },

  backButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 25,
    elevation: 4,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 31,
    fontWeight: "800",
    color: "#172033",
  },

  subtitle: {
    fontSize: 16,
    color: "#687386",
    marginTop: 5,
  },

  /* EMPTY STATE */
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 35,
    paddingVertical: 55,
    alignItems: "center",
    marginBottom: 30,
    elevation: 5,
  },

  bellCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#E8F7FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 35,
  },

  bell: {
    fontSize: 75,
  },

  emptyTitle: {
    fontSize: 31,
    fontWeight: "800",
    color: "#172033",
    textAlign: "center",
    marginBottom: 18,
  },

  emptyText: {
    fontSize: 20,
    lineHeight: 30,
    color: "#687386",
    textAlign: "center",
    marginBottom: 35,
  },

  /* NOTIFICATION LIST */
  notificationsContainer: {
    marginBottom: 30,
  },

  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  notificationCount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#172033",
  },

  notificationHeaderSubtitle: {
    fontSize: 15,
    color: "#687386",
    marginTop: 4,
  },

  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F7FB",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
  },

  clearButtonText: {
    color: "#0C6474",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 5,
  },

  notificationItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    flexDirection: "row",
    marginBottom: 14,
    elevation: 3,
  },

  unreadNotification: {
    borderWidth: 1,
    borderColor: "#0C6474",
  },

  notificationIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E8F7FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },

  notificationContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#172033",
    marginBottom: 5,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0C6474",
    marginLeft: 8,
    marginBottom: 5,
  },

  notificationMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#526071",
    marginBottom: 6,
  },

  notificationTime: {
    fontSize: 13,
    color: "#8A94A6",
  },

  readStatus: {
    fontSize: 12,
    color: "#0C6474",
    marginTop: 5,
    fontWeight: "600",
  },

  /* TEST BUTTON */
  testButton: {
    width: "100%",
    minHeight: 65,
    borderRadius: 22,
    backgroundColor: "#0C6474",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  anotherButton: {
    marginTop: 5,
  },

  testButtonDisabled: {
    opacity: 0.6,
  },

  testButtonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    marginLeft: 10,
  },

  /* INFORMATION CARD */
  infoCard: {
    backgroundColor: "#E5F7FA",
    borderRadius: 28,
    padding: 30,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  infoIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFF3DF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
  },

  megaphone: {
    fontSize: 35,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: "#087D92",
    fontSize: 23,
    fontWeight: "800",
    marginBottom: 8,
  },

  infoText: {
    color: "#526071",
    fontSize: 17,
    lineHeight: 25,
  },

  /* HOME BUTTON */
  homeButton: {
    height: 65,
    borderRadius: 22,
    backgroundColor: "#0C6474",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 10,
  },
});