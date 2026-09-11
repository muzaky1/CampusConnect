import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import {
  buildConversationId,
  listenToMessages,
  sendChatMessage,
} from "../services/chatService";
import { sendPushNotification } from "../notificationService";

const PAGE_SIZE_NOTE = "Showing the latest 200 messages.";

function toDateSafe(value) {
  if (!value) return null;
  try {
    // Firestore Timestamp
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;
    // Firestore JSON shape { seconds, nanoseconds }
    if (typeof value.seconds === "number") {
      return new Date(
        value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)
      );
    }
    if (typeof value === "number") return new Date(value);
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  } catch {
    return null;
  }
  return null;
}

function formatMessageTime(timestamp) {
  const date = toDateSafe(timestamp);
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(timestamp) {
  const date = toDateSafe(timestamp);
  if (!date) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const otherUserId = useMemo(
    () => String(params.userId || "").trim(),
    [params.userId]
  );
  const initialName = String(params.name || "New Chat");

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [otherUserName, setOtherUserName] = useState(initialName);
  const [authLoading, setAuthLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [listenerError, setListenerError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);
  const sendInFlight = useRef(false);

  // ── Symmetric conversation ID ──────────────────────────────────────────
  const conversationId = useMemo(
    () => buildConversationId(currentUserId, otherUserId),
    [currentUserId, otherUserId]
  );

  // ── Auth ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(currentUser.uid);
      setCurrentUserName(currentUser.displayName || "");
      setAuthLoading(false);
    });
    return unsubscribe;
  }, [router]);

  // ── Resolve display name for the other participant ─────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!otherUserId) {
      setOtherUserName(initialName);
      return;
    }
    setOtherUserName(initialName);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "publicProfiles", otherUserId));
        const profileName = snap.data()?.name;
        if (!cancelled && profileName) setOtherUserName(profileName);
      } catch {
        // Keep the param name; profile read failure is non-fatal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [otherUserId, initialName]);

  // ── Live message listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    if (!conversationId) {
      // e.g. opened without a valid userId — don't spin forever.
      setMessages([]);
      setLoadingMessages(false);
      setListenerError(null);
      return;
    }

    setLoadingMessages(true);
    setListenerError(null);

    let unsubscribe;
    try {
      unsubscribe = listenToMessages(
        conversationId,
        (firebaseMessages) => {
          const formatted = firebaseMessages.map((item) => ({
            id: item.id,
            text: String(item.text ?? ""),
            sender: item.senderId === currentUserId ? "me" : "other",
            time: formatMessageTime(item.createdAt),
            dayLabel: formatDayLabel(item.createdAt),
            createdAtMs: toDateSafe(item.createdAt)?.getTime() ?? 0,
            pending: false,
          }));
          setMessages(formatted);
          // Drop optimistic bubbles once the server echo arrives.
          setPendingMessages((prev) =>
            prev.filter(
              (p) =>
                !formatted.some(
                  (m) =>
                    !m.pending &&
                    m.text === p.text &&
                    Math.abs(m.createdAtMs - p.createdAtMs) < 15000
                )
            )
          );
          setLoadingMessages(false);
        },
        (error) => {
          console.error("Chat listener failed:", error);
          setListenerError(
            "Couldn't load messages. Check your connection and Firestore rules."
          );
          setLoadingMessages(false);
        }
      );
    } catch (error) {
      console.error("Chat listener setup failed:", error);
      setListenerError("This conversation couldn't be opened.");
      setLoadingMessages(false);
    }

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
    // retryKey lets the error banner force a re-subscribe.
  }, [conversationId, currentUserId, retryKey]);

  // Newest-first for the inverted list (FlatList inverted renders
  // data[0] at the bottom, which keeps the keyboard/scroll behaviour smooth).
  const displayMessages = useMemo(() => {
    const combined = [...pendingMessages, ...messages];
    combined.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return combined;
  }, [messages, pendingMessages]);

  const retryListener = useCallback(() => {
    setListenerError(null);
    setLoadingMessages(true);
    setRetryKey((k) => k + 1);
  }, []);

  const notifyRecipient = useCallback(
    async (messageText) => {
      try {
        if (!otherUserId) return;
        const recipientSnap = await getDoc(
          doc(db, "publicProfiles", otherUserId)
        );
        const pushToken = recipientSnap.data()?.expoPushToken;
        if (!pushToken) return;

        const senderName =
          currentUserName || auth.currentUser?.displayName || "Someone";

        await sendPushNotification({
          to: pushToken,
          title: `💬 ${senderName}`,
          body: messageText.slice(0, 180),
          data: { userId: currentUserId, name: senderName },
        });
      } catch {
        // Push is fire-and-forget; never break the chat.
      }
    },
    [otherUserId, currentUserId, currentUserName]
  );

  const handleSendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || sendInFlight.current || !currentUserId) return;

    if (!conversationId) {
      Alert.alert(
        "Cannot Send Yet",
        "Open this chat from the Messages list so a conversation can be created."
      );
      return;
    }

    // Optimistic UI: clear the box immediately, show a pending bubble.
    const optimistic = {
      id: `pending-${Date.now()}`,
      text: trimmed,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dayLabel: "Today",
      createdAtMs: Date.now(),
      pending: true,
    };

    setMessage("");
    setPendingMessages((prev) => [...prev, optimistic]);
    sendInFlight.current = true;
    setSending(true);

    try {
      await sendChatMessage(
        conversationId,
        currentUserId,
        trimmed,
        otherUserId
      );
      notifyRecipient(trimmed).catch(() => {});
    } catch (error) {
      console.error("Firebase send message error:", error);
      // Roll back the optimistic bubble and restore the draft.
      setPendingMessages((prev) =>
        prev.filter((p) => p.id !== optimistic.id)
      );
      setMessage(trimmed);
      Alert.alert(
        "Message Not Sent",
        error?.message === "Message is too long"
          ? "That message is too long. Keep it under 1000 characters."
          : "Unable to send your message. Check your connection and try again."
      );
    } finally {
      sendInFlight.current = false;
      setSending(false);
    }
  }, [message, currentUserId, conversationId, otherUserId, notifyRecipient]);

  const renderMessage = useCallback(({ item, index }) => {
    const isMine = item.sender === "me";
    const next = displayMessages[index + 1]; // older message (inverted list)
    const showDay = !next || next.dayLabel !== item.dayLabel;

    return (
      <View>
        {showDay && item.dayLabel ? (
          <View style={styles.daySeparator}>
            <Text style={styles.daySeparatorText}>{item.dayLabel}</Text>
          </View>
        ) : null}
        <View
          style={[styles.messageRow, isMine && styles.myMessageRow]}
        >
          <View
            style={[
              styles.messageBubble,
              isMine ? styles.myMessageBubble : styles.otherMessageBubble,
              item.pending && styles.pendingBubble,
            ]}
          >
            <Text
              style={[styles.messageText, isMine && styles.myMessageText]}
            >
              {item.text}
            </Text>
            <View style={styles.metaRow}>
              {item.pending ? (
                <Text
                  style={[styles.messageTime, isMine && styles.myMessageTime]}
                >
                  Sending…
                </Text>
              ) : item.time ? (
                <Text
                  style={[styles.messageTime, isMine && styles.myMessageTime]}
                >
                  {item.time}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }, [displayMessages]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#168EAC" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  const canSend = message.trim().length > 0 && !sendInFlight.current;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(otherUserName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {otherUserName}
            </Text>
            <Text style={styles.status}>
              {listenerError ? "Reconnecting…" : "CampusConnect user"}
            </Text>
          </View>
        </View>

        {/* Connection / error banner */}
        {listenerError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText} numberOfLines={2}>
              {listenerError}
            </Text>
            <TouchableOpacity onPress={retryListener} activeOpacity={0.7}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.networkStatus}>
            <View style={styles.networkDot} />
            <Text style={styles.networkText}>
              Live • Firebase messaging
            </Text>
          </View>
        )}

        {/* Messages */}
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#168EAC" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : !conversationId ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversation selected</Text>
            <Text style={styles.emptyText}>
              Go back to Messages and tap a student to start chatting.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[
              styles.messagesList,
              displayMessages.length === 0 && styles.emptyMessagesList,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Send a message to start the conversation.
                </Text>
              </View>
            }
            ListFooterComponent={
              displayMessages.length >= 200 ? (
                <Text style={styles.pageNote}>{PAGE_SIZE_NOTE}</Text>
              ) : null
            }
            removeClippedSubviews={false}
            maxToRenderPerBatch={30}
            windowSize={11}
          />
        )}

        {/* Composer */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8A94A6"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSendMessage}
            submitBehavior="submit"
            accessibilityLabel="Message input"
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!canSend}
            activeOpacity={0.8}
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  flex: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  backText: {
    fontSize: 32,
    color: "#182033",
    marginTop: -4,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F7FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#168EAC",
  },

  headerInfo: {
    flex: 1,
  },

  name: {
    fontSize: 17,
    fontWeight: "800",
    color: "#182033",
  },

  status: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF8EF",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },

  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 8,
  },

  networkText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#FDECEC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5C2C2",
  },

  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
  },

  retryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#168EAC",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
  },

  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },

  emptyMessagesList: {
    justifyContent: "center",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },

  pageNote: {
    textAlign: "center",
    fontSize: 11,
    color: "#8A94A6",
    marginTop: 12,
  },

  daySeparator: {
    alignSelf: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 10,
  },

  daySeparatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5F6B7A",
  },

  messageRow: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  myMessageRow: {
    alignItems: "flex-end",
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },

  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderBottomLeftRadius: 5,
  },

  myMessageBubble: {
    backgroundColor: "#168EAC",
    borderBottomRightRadius: 5,
  },

  pendingBubble: {
    opacity: 0.75,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#182033",
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },

  messageTime: {
    fontSize: 10,
    color: "#8A94A6",
  },

  myMessageTime: {
    color: "#D8F4FA",
  },

  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: "#F7F9FC",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 9,
    fontSize: 14,
    color: "#182033",
    marginRight: 8,
  },

  sendButton: {
    minWidth: 60,
    height: 44,
    paddingHorizontal: 15,
    borderRadius: 22,
    backgroundColor: "#168EAC",
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
