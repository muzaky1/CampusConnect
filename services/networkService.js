// notificationService.js

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

// --------------------------------------------------
// NOTIFICATION HANDLER
// --------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --------------------------------------------------
// ANDROID NOTIFICATION CHANNEL
// --------------------------------------------------

export const setupNotifications = async () => {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "campusconnect",
        {
          name: "CampusConnect Notifications",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        }
      );
    }

    if (!Device.isDevice) {
      console.log(
        "Push notifications require a physical device."
      );
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "Notification permission was not granted."
      );
      return false;
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

// --------------------------------------------------
// GET EXPO PUSH TOKEN
// --------------------------------------------------

export const getPushToken = async () => {
  try {
    const ready = await setupNotifications();

    if (!ready) {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error(
        "Expo project ID could not be found."
      );

      return null;
    }

    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    console.log(
      "Expo Push Token:",
      tokenResponse.data
    );

    return tokenResponse.data;
  } catch (error) {
    console.error(
      "Push token error:",
      error
    );

    return null;
  }
};

// --------------------------------------------------
// IN-APP NOTIFICATIONS
// --------------------------------------------------

let notifications = [];

export const addNotification = (notification) => {
  const newNotification = {
    id: Date.now().toString(),
    title: notification.title || "Campus Alert",
    message: notification.message || "",
    createdAt: new Date().toISOString(),
    read: false,
  };

  notifications = [
    newNotification,
    ...notifications,
  ];

  return newNotification;
};

export const getNotifications = () => {
  return notifications;
};

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

export const clearNotifications = () => {
  notifications = [];
};

// --------------------------------------------------
// LOCAL DEVICE NOTIFICATION
// --------------------------------------------------

export const sendDeviceNotification = async ({
  title,
  message,
}) => {
  try {
    const ready = await setupNotifications();

    if (!ready) {
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || "CampusConnect",
        body:
          message ||
          "You have a new notification.",
        sound: "default",
      },

      trigger: {
        seconds: 1,
        channelId: "campusconnect",
      },
    });

    return true;
  } catch (error) {
    console.error(
      "Device notification error:",
      error
    );

    return false;
  }
};