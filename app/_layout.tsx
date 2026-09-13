import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import {
  addNotification,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from "../notificationService";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Foreground: notification arrives while app is open.
    // Records it so the Notifications screen reflects real incoming pushes.
    // No-ops in Expo Go where expo-notifications is unavailable.
    const receivedSub = addNotificationReceivedListener(
      (notification: any) => {
        const { title, body, data } = notification.request.content;

        addNotification({
          title: title || "New Message",
          message: body || "",
          data: data || null,
        });
      }
    );

    // Tap: user presses notification from system tray.
    // Records it AND deep-links straight into the chat thread.
    const responseSub =
      addNotificationResponseReceivedListener((response: any) => {
        const { title, body, data } = response.notification.request.content;

        addNotification({
          title: title || "New Message",
          message: body || "",
          data: data || null,
        });

        if (data?.userId && data?.name) {
          router.push({
            pathname: "/chat",
            params: {
              userId: String(data.userId),
              name: String(data.name),
            },
          });
        }
      });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="map" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="sms" />
        <Stack.Screen name="web-service" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="campus-updates" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
