// notificationService.js
// expo-notifications remote push is unavailable in Expo Go on Android
// from SDK 53+. Static `import * as Notifications` throws at load time
// in Expo Go and takes down the whole router. Lazy-load it instead so
// the app still runs (in-app notifications keep working).

import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";

import { db } from "./services/firebase";

let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (_e) {
  console.log(
    "expo-notifications unavailable (Expo Go has no remote push since SDK 53). In-app notifications still work."
  );
}

export const isNotificationsAvailable = () => !!Notifications;

// ==================================================
// NOTIFICATION HANDLER
// ==================================================

if (Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.log("Could not set notification handler:", e?.message);
  }
}

// No-op subscription shape matching expo-notifications EventSubscription.
const noopSubscription = () => ({ remove: () => {} });

export const addNotificationReceivedListener = (listener) => {
  if (!Notifications?.addNotificationReceivedListener) {
    return noopSubscription();
  }
  try {
    return Notifications.addNotificationReceivedListener(listener);
  } catch (e) {
    console.log("addNotificationReceivedListener failed:", e?.message);
    return noopSubscription();
  }
};

export const addNotificationResponseReceivedListener = (listener) => {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return noopSubscription();
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(listener);
  } catch (e) {
    console.log("addNotificationResponseReceivedListener failed:", e?.message);
    return noopSubscription();
  }
};

// ==================================================
// ANDROID NOTIFICATION CHANNEL
// ==================================================

export const setupNotifications = async () => {
  if (!Notifications) {
    // Expo Go: no native notification module — in-app list still works.
    return false;
  }
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
  if (!Notifications) {
    console.log("Push notifications unavailable in Expo Go — skipping token registration.");
    return null;
  }
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
  if (!Notifications) {
    // Expo Go: record in-app only; caller already did addNotification().
    return false;
  }
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