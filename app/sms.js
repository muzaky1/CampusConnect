import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

export default function SMS() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");

  const handleSendSMS = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Phone Number Required", "Please enter a phone number.");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Message Required", "Please enter a message.");
      return;
    }

    // iOS uses `&body=` while Android uses `?body=`; strip spaces/dashes
    // so the dialer receives a clean number.
    const cleanNumber = phoneNumber.replace(/[\s\-()]/g, "");
    const separator = Platform.OS === "ios" ? "&" : "?";
    const smsUrl = `sms:${cleanNumber}${separator}body=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(smsUrl);

      if (supported) {
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert(
          "SMS Not Available",
          "No messaging application is available on this device."
        );
      }
    } catch (error) {
      console.log("SMS Error:", error);

      Alert.alert(
        "Error",
        "Unable to open the messaging application."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SMS Services</Text>

          <Text style={styles.subtitle}>
            Send a message using your device's default messaging app
          </Text>
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Text style={styles.infoIcon}>💬</Text>
          </View>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Send SMS</Text>

            <Text style={styles.infoText}>
              Enter a recipient and message. CampusConnect will
              open your device's messaging application with the
              information already filled in.
            </Text>
          </View>
        </View>

        {/* Phone Number */}
        <Text style={styles.label}>Phone Number</Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 08012345678"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          maxLength={15}
        />

        {/* Message */}
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
        />

        {/* Send Button */}
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendSMS}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>📱</Text>

          <Text style={styles.sendText}>
            Send SMS
          </Text>
        </TouchableOpacity>

        {/* Explanation */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>
            ℹ️ How this works
          </Text>

          <Text style={styles.noteText}>
            CampusConnect does not send the SMS directly. Instead,
            it launches the device's default messaging application
            with the recipient and message already prepared.
          </Text>
        </View>

        {/* Unit 09 Demonstration */}
        <View style={styles.unitCard}>
          <Text style={styles.unitTitle}>
            Messaging Services
          </Text>

          <Text style={styles.unitText}>
            This screen demonstrates how a mobile application can
            interact with the device's messaging service.
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
    marginBottom: 20,
  },

  messageInput: {
    minHeight: 130,
    paddingTop: 14,
  },

  sendButton: {
    backgroundColor: "#168EAC",
    borderRadius: 13,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  sendIcon: {
    fontSize: 19,
    marginRight: 9,
  },

  sendText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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