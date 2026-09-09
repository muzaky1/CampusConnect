// notificationService.js

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";

import { db } from "./services/firebase";

// ==================================================
// NOTIFICATION HANDLER
// ==================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ==================================================
// ANDROID NOTIFICATION CHANNEL
// ==================================================

export const setupNotifications = async () => {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "campusconnect",
        {
          name: "CampusConnect Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        }
      );
    }

    const { status } =
      await Notifications.getPermissionsAsync();

    if (status !== "granted") {
      const permissionResponse =
        await Notifications.requestPermissionsAsync();

      if (permissionResponse.status !== "granted") {
        console.log(
          "Notification permission was not granted."
        );

        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(
      "Notification setup error:",
      error
    );

    return false;
  }
};

// ==================================================
// EXPO PUSH TOKEN REGISTRATION
// ==================================================

/**
 * Call once after the user logs in.
 * Gets the device's Expo push token and saves it to Firestore
 * so other users can send this device real push notifications.
 */
export const registerForPushNotifications = async (userId) => {
  if (!Device.isDevice) {
    // Push tokens only exist on real hardware
    console.log("Push notifications require a physical device.");
    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied.");
      return null;
    }

    // Get the Expo push token bound to this EAS project
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "3a974fe5-3372-45d6-954d-7d03fd4249d4",
    });

    const token = tokenData.data;

    // Persist token so other users can look it up and notify this device
    if (userId && token) {
      await setDoc(
        doc(db, "publicProfiles", userId),
        { expoPushToken: token },
        { merge: true }
      );

      console.log("Push token saved:", token);
    }

    return token;
  } catch (error) {
    console.error("Push token registration failed:", error);
    return null;
  }
};

// ==================================================
// SEND REAL PUSH NOTIFICATION VIA EXPO PUSH API
// ==================================================

/**
 * Sends a push notification to another device using Expo's managed
 * push service.  Works even when the target app is in the background.
 *
 * @param {object} opts
 * @param {string} opts.to   - Recipient's Expo push token
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {object} [opts.data] - Extra payload (e.g. { userId, name })
 */
export const sendPushNotification = async ({
  to,
  title,
  body,
  data = {},
}) => {
  if (!to) {
    return;
  }

  try {
    const response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to,
          title,
          body,
          data,
          sound: "default",
          priority: "high",
          channelId: "campusconnect",
        }),
      }
    );

    const result = await response.json();

    if (result?.data?.status === "error") {
      console.warn("Expo push error:", result.data.message);
    }
  } catch (error) {
    // Non-critical — a failed notification should never break the chat
    console.error("sendPushNotification failed:", error);
  }
};

// ==================================================
// IN-APP NOTIFICATION STORAGE
// ==================================================

let notifications = [];

// Add notification to the CampusConnect notification screen
export const addNotification = (notification) => {
  const newNotification = {
    id: Date.now().toString(),
    title: notification.title || "Campus Alert",
    message: notification.message || "",
    // data carries deep-link payload e.g. { userId, name } from chat pushes
    data: notification.data || null,
    createdAt: new Date().toISOString(),
    read: false,
  };

  notifications = [
    newNotification,
    ...notifications,
  ];

  return newNotification;
};

// Get all in-app notifications
export const getNotifications = () => {
  return notifications;
};

// Mark notification as read
export const markNotificationAsRead = (id) => {
  notifications = notifications.map(
    (notification) =>
      notification.id === id
        ? {
            ...notification,
            read: true,
          }
        : notification
  );
};

// Clear all notifications
export const clearNotifications = () => {
  notifications = [];
};

// ==================================================
// DEVICE / LOCAL NOTIFICATION
// ==================================================

export const sendDeviceNotification = async ({
  title,
  message,
}) => {
  try {
    // Prepare notification system
    const ready = await setupNotifications();

    if (!ready) {
      return false;
    }

    // Schedule notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "CampusConnect",
        body:
          message ||
          "You have a new notification.",
        sound: "default",
      },

      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
        channelId: "campusconnect",
      },
    });

    console.log(
      "Device notification scheduled successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "Device notification error:",
      error
    );

    return false;
  }
};