import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

import {
  addNotification,
} from "../notificationService";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // ── Foreground: notification arrives while app is open ──────────────────
    // Automatically adds it to the in-app notification list so the
    // Notifications screen always reflects real incoming pushes.
    const receivedSub =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          const { title, body, data } =
            notification.request.content;

          addNotification({
            title: title || "New Message",
            message: body || "",
            data: data || null,
          });
        }
      );

    // ── Tap: user presses notification from system tray ─────────────────────
    // Adds it to the list AND navigates straight into the chat thread.
    const responseSub =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const { title, body, data } =
            response.notification.request.content;

          // Record it so it shows on the Notifications screen
          addNotification({
            title: title || "New Message",
            message: body || "",
            data: data || null,
          });

          // Deep-link into the correct chat
          if (data?.userId && data?.name) {
            router.push({
              pathname: "/chat",
              params: {
                userId: data.userId,
                name: data.name,
              },
            });
          }
        }
      );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}