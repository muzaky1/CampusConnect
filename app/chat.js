import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import {
  listenToMessages,
  sendChatMessage,
} from "../services/chatService";
import { sendPushNotification } from "../notificationService";

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const otherUserId = String(params.userId || "new");
  const name = String(params.name || "New Chat");

  // State must be declared before useMemo that references currentUserId
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);

  // ── Symmetric conversation ID ─────────────────────────────────────────────
  // Both UIDs are sorted so User A→B and User B→A always resolve to the
  // identical Firestore path.  Computed only once currentUserId is known.
  const conversationId = useMemo(() => {
    if (!currentUserId || otherUserId === "new") return null;
    const sorted = [currentUserId, otherUserId].sort();
    return `conv_${sorted[0]}_${sorted[1]}`;
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(currentUser.uid);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    // Wait until we have both IDs before attaching a listener
    if (!currentUserId || !conversationId) {
      return;
    }

    setLoadingMessages(true);

    const unsubscribe = listenToMessages(
      conversationId,
      (firebaseMessages) => {
        const formattedMessages = firebaseMessages.map((item) => ({
          id: item.id,
          text: item.text,
          sender: item.senderId === currentUserId ? "me" : "other",
          time: formatMessageTime(item.createdAt),
        }));

        setMessages(formattedMessages);
        setLoadingMessages(false);

        // Auto-scroll to the latest message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return unsubscribe;
  }, [conversationId, currentUserId]);

  const formatMessageTime = (timestamp) => {
    if (!timestamp) {
      return "";
    }

    try {
      return timestamp.toDate().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "";
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || sending || !currentUserId) {
      return;
    }

    setSending(true);

    try {
      await sendChatMessage(
        conversationId,
        currentUserId,
        trimmedMessage
      );

      setMessage("");

      // ── Push notification to the other user ──────────────────────────────
      // Fire-and-forget: look up their token and call Expo Push API.
      // A failure here must never block or error the chat.
      notifyRecipient(trimmedMessage).catch(() => {});
    } catch (error) {
      console.error("Firebase send message error:", error);

      Alert.alert(
        "Message Not Sent",
        "Unable to send your message. Please check your internet connection and try again."
      );
    } finally {
      setSending(false);
    }
  };

  /**
   * Silently sends a push notification to the other participant.
   * Reads their Expo push token from publicProfiles once per message.
   */
  const notifyRecipient = async (messageText) => {
    const recipientSnap = await getDoc(
      doc(db, "publicProfiles", otherUserId)
    );

    const pushToken = recipientSnap.data()?.expoPushToken;

    if (!pushToken) {
      return; // Recipient hasn’t registered for push yet
    }

    const senderName =
      auth.currentUser?.displayName || "Someone";

    await sendPushNotification({
      to: pushToken,
      title: `💬 ${senderName}`,
      body: messageText,
      // Data payload lets layout.js deep-link into this chat on tap
      data: {
        userId: currentUserId,
        name: senderName,
      },
    });
  };

  const renderMessage = ({ item }) => {
    const isMine = item.sender === "me";

    return (
      <View
        style={[
          styles.messageRow,
          isMine && styles.myMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine
              ? styles.myMessageBubble
              : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMine && styles.myMessageText,
            ]}
          >
            {item.text}
          </Text>

          {item.time ? (
            <Text
              style={[
                styles.messageTime,
                isMine && styles.myMessageTime,
              ]}
            >
              {item.time}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#168EAC" />
        <Text style={styles.loadingText}>
          Loading chat...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{name}</Text>

          <Text style={styles.status}>
            CampusConnect user
          </Text>
        </View>
      </View>

      <View style={styles.networkStatus}>
        <View style={styles.networkDot} />

        <Text style={styles.networkText}>
          Connected to Firebase messaging
        </Text>
      </View>

      {loadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#168EAC"
          />

          <Text style={styles.loadingText}>
            Loading messages...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>

              <Text style={styles.emptyTitle}>
                No messages yet
              </Text>

              <Text style={styles.emptyText}>
                Send a message to start the conversation.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#8A94A6"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!sending}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || sending) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#F7F9FC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  backText: {
    fontSize: 35,
    color: "#182033",
    marginTop: -4,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
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
    fontSize: 18,
    fontWeight: "800",
    color: "#182033",
  },

  status: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF8EF",
    paddingHorizontal: 20,
    paddingVertical: 8,
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#6B7280",
  },

  messagesList: {
    padding: 20,
    paddingBottom: 15,
    flexGrow: 1,
  },

  emptyMessagesList: {
    justifyContent: "center",
  },

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
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

  messageRow: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  myMessageRow: {
    alignItems: "flex-end",
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 15,
    paddingVertical: 11,
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

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#182033",
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  messageTime: {
    fontSize: 10,
    color: "#8A94A6",
    marginTop: 5,
    alignSelf: "flex-end",
  },

  myMessageTime: {
    color: "#D8F4FA",
  },

  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 100,
    backgroundColor: "#F7F9FC",
    borderRadius: 22,
    paddingHorizontal: 17,
    paddingTop: 12,
    paddingBottom: 10,
    fontSize: 14,
    color: "#182033",
    marginRight: 8,
  },

  sendButton: {
    minWidth: 60,
    height: 45,
    paddingHorizontal: 15,
    borderRadius: 23,
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