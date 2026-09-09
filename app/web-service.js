import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  TextInput,
} from "react-native";

import {
  getCampusInfo,
  sendFeedback,
} from "../services/api";

export default function WebServiceScreen() {
  // GET request states
  const [campus, setCampus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // POST request states
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  // Call GET web service
  const fetchCampusInfo = async () => {
    try {
      setLoading(true);
      setError("");
      setCampus(null);

      const response = await getCampusInfo();

      setCampus(response);
    } catch (err) {
      setError(
        "Unable to connect to the CampusConnect web service."
      );
    } finally {
      setLoading(false);
    }
  };

  // Call POST web service
  const handleSendFeedback = async () => {
    if (!name.trim() || !message.trim()) {
      setFeedbackError(
        "Please enter your name and feedback."
      );
      setFeedbackMessage("");
      return;
    }

    try {
      setFeedbackLoading(true);
      setFeedbackError("");
      setFeedbackMessage("");

      const response = await sendFeedback(
        name.trim(),
        message.trim()
      );

      if (response.success) {
        setFeedbackMessage(response.message);

        // Clear form after successful submission
        setName("");
        setMessage("");
      }
    } catch (error) {
      setFeedbackError(
        "Unable to send feedback. Please try again."
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Web Service</Text>

          <Text style={styles.subtitle}>
            Network Services Demonstration
          </Text>
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            HTTP/HTTPS Web Service
          </Text>

          <Text style={styles.infoText}>
            This screen demonstrates how CampusConnect
            communicates with a web service, sends HTTP
            requests and handles responses received from
            the server.
          </Text>
        </View>

        {/* GET REQUEST */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            GET Request
          </Text>

          <Text style={styles.sectionDescription}>
            Retrieve campus information from the
            CampusConnect web service.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={fetchCampusInfo}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Connecting..."
              : "Call Web Service"}
          </Text>
        </TouchableOpacity>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />

            <Text style={styles.loadingText}>
              Fetching campus information...
            </Text>
          </View>
        )}

        {/* GET Error */}
        {error !== "" && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Connection Error
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchCampusInfo}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GET Response */}
        {campus && !loading && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>
              Server Response
            </Text>

            {/* Success */}
            <View style={styles.successCard}>
              <Text style={styles.successText}>
                ✓ {campus.message}
              </Text>
            </View>

            {/* Campus Information */}
            <View style={styles.campusCard}>
              <Text style={styles.campusName}>
                {campus.data.name}
              </Text>

              <Text style={styles.location}>
                📍 {campus.data.location}
              </Text>

              <Text style={styles.facilitiesTitle}>
                Campus Facilities
              </Text>

              {campus.data.facilities.map(
                (facility, index) => (
                  <View
                    key={index}
                    style={styles.facilityRow}
                  >
                    <Text style={styles.facilityBullet}>
                      •
                    </Text>

                    <Text style={styles.facilityText}>
                      {facility}
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* Technical Information */}
            <View style={styles.technicalCard}>
              <Text style={styles.technicalTitle}>
                Network Details
              </Text>

              <Text style={styles.technicalText}>
                Method: GET
              </Text>

              <Text style={styles.technicalText}>
                Endpoint: /api/campus
              </Text>

              <Text style={styles.technicalText}>
                Response: JSON
              </Text>

              <Text style={styles.technicalText}>
                Status: Successful
              </Text>
            </View>
          </View>
        )}

        {/* POST REQUEST / FEEDBACK */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>
            Send Feedback
          </Text>

          <Text style={styles.feedbackDescription}>
            This demonstrates sending data from the mobile
            application to the CampusConnect web service
            using an HTTP POST request.
          </Text>

          {/* Name Input */}
          <Text style={styles.inputLabel}>
            Your Name
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            editable={!feedbackLoading}
          />

          {/* Message Input */}
          <Text style={styles.inputLabel}>
            Feedback
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.messageInput,
            ]}
            placeholder="Enter your feedback"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!feedbackLoading}
          />

          {/* Send Button */}
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={handleSendFeedback}
            disabled={feedbackLoading}
          >
            <Text style={styles.buttonText}>
              {feedbackLoading
                ? "Sending..."
                : "Send Feedback"}
            </Text>
          </TouchableOpacity>

          {/* Feedback Success */}
          {feedbackMessage !== "" && (
            <View style={styles.feedbackSuccess}>
              <Text style={styles.feedbackSuccessText}>
                ✓ {feedbackMessage}
              </Text>
            </View>
          )}

          {/* Feedback Error */}
          {feedbackError !== "" && (
            <View style={styles.feedbackError}>
              <Text style={styles.feedbackErrorText}>
                {feedbackError}
              </Text>
            </View>
          )}
        </View>

        {/* POST Technical Information */}
        <View style={styles.postTechnicalCard}>
          <Text style={styles.technicalTitle}>
            POST Request Details
          </Text>

          <Text style={styles.technicalText}>
            Method: POST
          </Text>

          <Text style={styles.technicalText}>
            Endpoint: /api/feedback
          </Text>

          <Text style={styles.technicalText}>
            Content-Type: application/json
          </Text>

          <Text style={styles.technicalText}>
            Request Body: Name + Feedback
          </Text>

          <Text style={styles.technicalText}>
            Response: JSON
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  content: {
    paddingBottom: 30,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    marginBottom: 20,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#555",
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  sectionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginTop: 5,
  },

  button: {
    backgroundColor: "#2563EB",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  loadingContainer: {
    alignItems: "center",
    marginTop: 30,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
  },

  errorCard: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D32F2F",
    marginBottom: 8,
  },

  errorText: {
    color: "#555",
    textAlign: "center",
    marginBottom: 15,
  },

  retryButton: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  resultsContainer: {
    marginTop: 25,
    paddingHorizontal: 20,
  },

  resultsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },

  successCard: {
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },

  successText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
  },

  campusCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    marginBottom: 15,
  },

  campusName: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  location: {
    fontSize: 15,
    color: "#555",
    marginBottom: 20,
  },

  facilitiesTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },

  facilityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  facilityBullet: {
    fontSize: 20,
    marginRight: 8,
    color: "#2563EB",
  },

  facilityText: {
    fontSize: 15,
    color: "#555",
  },

  technicalCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    marginBottom: 15,
  },

  technicalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },

  technicalText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 6,
  },

  feedbackCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    marginTop: 10,
  },

  feedbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  feedbackDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#F5F7FA",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
    marginBottom: 14,
  },

  messageInput: {
    minHeight: 100,
  },

  feedbackButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  feedbackSuccess: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },

  feedbackSuccessText: {
    color: "#2E7D32",
    fontWeight: "600",
  },

  feedbackError: {
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },

  feedbackErrorText: {
    color: "#C62828",
    fontWeight: "600",
  },

  postTechnicalCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    marginTop: 15,
  },
});