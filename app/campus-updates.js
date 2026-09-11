import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCampusUpdates } from "../services/api";

export default function CampusUpdatesScreen() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadUpdates = useCallback(async () => {
    setError("");

    try {
      const result = await getCampusUpdates();

      if (!result.success) {
        setUpdates([]);
        setError(
          result.error || "Unable to load campus updates."
        );
        return;
      }

      setUpdates(result.records || []);
    } catch (err) {
      setUpdates([]);
      setError(
        err?.message ||
          "An unexpected network error occurred."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUpdates().catch(() => {});
  };

  const formatTitle = (title) => {
    if (typeof title !== "string" || !title) return "Campus Update";

    return title
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Campus Updates
          </Text>

          <Text style={styles.subtitle}>
            Latest information from CampusConnect
          </Text>
        </View>

        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" />

            <Text style={styles.stateTitle}>
              Loading campus updates...
            </Text>

            <Text style={styles.stateText}>
              Connecting to the CampusConnect web service.
            </Text>
          </View>
        )}

        {!loading && error !== "" && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>
              Unable to load updates
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
              onPress={loadUpdates}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        )}

        {!loading &&
          error === "" &&
          updates.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                No campus updates
              </Text>

              <Text style={styles.stateText}>
                There are currently no updates available.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                ]}
                onPress={loadUpdates}
              >
                <Text style={styles.retryText}>
                  Refresh
                </Text>
              </Pressable>
            </View>
          )}

        {!loading &&
          error === "" &&
          updates.length > 0 && (
            <>
              <View style={styles.summaryCard}>
                <View>
                  <Text style={styles.summaryTitle}>
                    Updates Available
                  </Text>

                  <Text style={styles.summaryText}>
                    Information received from the web
                    service.
                  </Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countNumber}>
                    {updates.length}
                  </Text>

                  <Text style={styles.countText}>
                    updates
                  </Text>
                </View>
              </View>

              {updates.map((update, index) => (
                <View
                  key={update.id || index}
                  style={styles.updateCard}
                >
                  <View style={styles.updateTop}>
                    <View style={styles.numberCircle}>
                      <Text style={styles.numberText}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.updateHeading}>
                      <Text style={styles.category}>
                        CAMPUS UPDATE
                      </Text>

                      <Text style={styles.updateTitle}>
                        {formatTitle(update.title)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.description}>
                    {update.body}
                  </Text>

                  <View style={styles.footerRow}>
                    <Text style={styles.record}>
                      Update #{update.id}
                    </Text>

                    <Text style={styles.received}>
                      Received
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

        <View style={styles.networkInfo}>
          <Text style={styles.networkTitle}>
            Live Web Service
          </Text>

          <Text style={styles.networkText}>
            These updates are loaded asynchronously
            through the CampusConnect network service.
          </Text>

          <View style={styles.networkRow}>
            <Text style={styles.networkLabel}>
              Method
            </Text>

            <Text style={styles.networkValue}>
              HTTPS GET
            </Text>
          </View>

          <View style={styles.networkRow}>
            <Text style={styles.networkLabel}>
              Response
            </Text>

            <Text style={styles.networkValue}>
              JSON
            </Text>
          </View>

          <View style={styles.networkRow}>
            <Text style={styles.networkLabel}>
              Handling
            </Text>

            <Text style={styles.networkValue}>
              Async / Await
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          CampusConnect • Campus Updates
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  header: {
    marginBottom: 20,
  },

  title: {
    fontSize: 31,
    fontWeight: "800",
    color: "#202124",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B6F73",
  },

  stateCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    marginBottom: 16,
  },

  stateTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "800",
    color: "#292929",
    textAlign: "center",
  },

  stateText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#777777",
    textAlign: "center",
  },

  errorCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0CACA",
    padding: 20,
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#B71C1C",
  },

  errorText: {
    marginTop: 7,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 21,
    color: "#6D3333",
  },

  retryButton: {
    alignSelf: "center",
    backgroundColor: "#202124",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.7,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E5E8",
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#292929",
  },

  summaryText: {
    marginTop: 4,
    fontSize: 13,
    color: "#777777",
  },

  countBadge: {
    alignItems: "center",
    backgroundColor: "#F0F2F4",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  countNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#292929",
  },

  countText: {
    fontSize: 10,
    color: "#777777",
  },

  updateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E5E8",
    elevation: 2,
  },

  updateTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  numberCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF0F2",
    marginRight: 12,
  },

  numberText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#333333",
  },

  updateHeading: {
    flex: 1,
  },

  category: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#777777",
    marginBottom: 4,
  },

  updateTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: "#292929",
  },

  description: {
    marginTop: 13,
    fontSize: 14,
    lineHeight: 21,
    color: "#666666",
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  record: {
    fontSize: 11,
    color: "#888888",
  },

  received: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E7D32",
  },

  networkInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 19,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#E2E5E8",
  },

  networkTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#292929",
  },

  networkText: {
    marginTop: 6,
    marginBottom: 13,
    fontSize: 13,
    lineHeight: 20,
    color: "#666666",
  },

  networkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  networkLabel: {
    fontSize: 13,
    color: "#777777",
  },

  networkValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#292929",
  },

  footer: {
    textAlign: "center",
    marginTop: 22,
    fontSize: 12,
    color: "#999999",
  },
});