import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import {
  formatToKudiNumber,
  isKudiConfigured,
  sendKudiSMS,
} from "../services/kudisms";

const MAX_MESSAGE_LENGTH = 480;

export default function SMS() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending, setSending] = useState(false);

  const trimmedMessage = message.trim();
  const messageLength = message.length;
  // Standard GSM SMS is 160 chars per segment.
  const smsParts =
    messageLength === 0 ? 0 : Math.ceil(messageLength / 160);

  const formattedPreview = useMemo(
    () => formatToKudiNumber(phoneNumber),
    [phoneNumber]
  );

  // False until EXPO_PUBLIC_KUDISMS_* credentials are set and Expo
  // is restarted — the banner below tells the user how to fix it.
  const kudiReady = isKudiConfigured();

  const canSend =
    !sending &&
    formattedPreview !== null &&
    trimmedMessage.length > 0 &&
    trimmedMessage.length <= MAX_MESSAGE_LENGTH;

  const handlePhoneChange = (value) => {
    setPhoneNumber(value);
    // Clear the inline error as soon as the number becomes valid.
    if (phoneError && formatToKudiNumber(value) !== null) {
      setPhoneError("");
    }
  };

  const handleSendSMS = async () => {
    const formattedNumber = formatToKudiNumber(phoneNumber);

    if (formattedNumber === null) {
      const errorMessage =
        phoneNumber.trim().length === 0
          ? "Please enter a phone number."
          : "Enter a valid Nigerian number, e.g. 08012345678.";
      setPhoneError(errorMessage);
      Alert.alert("Phone Number Required", errorMessage);
      return;
    }

    setPhoneError("");

    if (!trimmedMessage) {
      Alert.alert("Message Required", "Please enter a message.");
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      Alert.alert(
        "Message Too Long",
        `Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`
      );
      return;
    }

    setSending(true);

    try {
      const result = await sendKudiSMS(formattedNumber, trimmedMessage);

      if (result && result.success === false) {
        throw new Error(
          result.message || "The SMS could not be sent."
        );
      }

      Alert.alert(
        "SMS Sent",
        `Your message was submitted to KudiSMS for delivery to ${formattedNumber}.`
      );

      setMessage("");
    } catch (error) {
      console.error("SMS Error:", error);

      Alert.alert(
        "SMS Failed",
        error?.message || "Unable to send the SMS. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>SMS Services</Text>

          <Text style={styles.subtitle}>
            Send SMS directly through CampusConnect using KudiSMS
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Text style={styles.infoIcon}>💬</Text>
          </View>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>KudiSMS Messaging</Text>

            <Text style={styles.infoText}>
              CampusConnect sends your message through the KudiSMS
              messaging service. You do not need to open the
              device&apos;s default SMS application.
            </Text>
          </View>
        </View>

        {kudiReady ? null : (
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>⚠️ KudiSMS not configured</Text>

            <Text style={styles.setupText}>
              Add your EXPO_PUBLIC_KUDISMS_USERNAME,
              EXPO_PUBLIC_KUDISMS_PASSWORD and
              EXPO_PUBLIC_KUDISMS_SENDER_ID to a .env.local file, then
              restart Expo with `npx expo start -c`.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Phone Number</Text>

        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          placeholder="e.g. 08012345678"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="next"
          value={phoneNumber}
          onChangeText={handlePhoneChange}
          maxLength={15}
          editable={!sending}
          accessibilityLabel="Recipient phone number"
        />

        {phoneError ? (
          <Text style={styles.errorText}>{phoneError}</Text>
        ) : formattedPreview ? (
          <Text style={styles.previewText}>
            Will send as: {formattedPreview}
          </Text>
        ) : null}

        <Text style={styles.label}>Message</Text>

        <TextInput
          style={[styles.input, styles.messageInput]}
          placeholder="Enter your message..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!sending}
          accessibilityLabel="SMS message"
        />

        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {messageLength}/{MAX_MESSAGE_LENGTH}
          </Text>

          {smsParts > 0 ? (
            <Text style={styles.counterText}>
              {smsParts} SMS {smsParts === 1 ? "part" : "parts"}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
          ]}
          onPress={handleSendSMS}
          activeOpacity={0.8}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend, busy: sending }}
        >
          {sending ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />

              <Text style={styles.sendText}>Sending...</Text>
            </>
          ) : (
            <>
              <Text style={styles.sendIcon}>📱</Text>

              <Text style={styles.sendText}>Send SMS</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>ℹ️ How this works</Text>

          <Text style={styles.noteText}>
            This app sends an HTTPS request directly to KudiSMS with
            your message. KudiSMS then delivers the SMS to the
            recipient — no backend server involved.
          </Text>
        </View>

        <View style={styles.unitCard}>
          <Text style={styles.unitTitle}>Unit 07 — Network Services</Text>

          <Text style={styles.unitText}>
            This screen demonstrates integration with an external
            SMS web service using HTTP POST requests and
            asynchronous API responses.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 25,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#182033",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    lineHeight: 20,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F7FB",
    padding: 18,
    borderRadius: 18,
    marginBottom: 28,
  },

  infoIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  infoIcon: {
    fontSize: 26,
  },

  infoTextContainer: {
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
    lineHeight: 19,
    color: "#5F6B7A",
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 8,
    marginTop: 4,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5EA",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 15,
    color: "#182033",
    marginBottom: 8,
  },

  inputError: {
    borderColor: "#DC2626",
  },

  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 12,
  },

  previewText: {
    fontSize: 13,
    color: "#168EAC",
    marginBottom: 12,
  },

  messageInput: {
    minHeight: 130,
    paddingTop: 14,
  },

  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  counterText: {
    fontSize: 12,
    color: "#6B7280",
  },

  sendButton: {
    backgroundColor: "#168EAC",
    borderRadius: 13,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    gap: 9,
  },

  sendButtonDisabled: {
    opacity: 0.55,
  },

  sendIcon: {
    fontSize: 19,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  setupCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 17,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },

  setupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 6,
  },

  setupText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#92400E",
  },

  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 7,
  },

  noteText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7280",
  },

  unitCard: {
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    padding: 17,
    marginTop: 15,
  },

  unitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#182033",
    marginBottom: 6,
  },

  unitText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },
});
