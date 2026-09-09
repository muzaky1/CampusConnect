import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";

import { getAnnouncements } from "../services/api";

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAnnouncements = async () => {
    try {
      setError("");

      const data = await getAnnouncements();

      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
      setError("Unable to load announcements.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading announcements...
        </Text>
      </View>
    );
  }

  if (error !== "") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={loadAnnouncements}
        >
          <Text style={styles.buttonText}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Announcements
      </Text>

      <Text style={styles.subtitle}>
        Latest CampusConnect updates
      </Text>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No announcements available.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.title}
            </Text>

            <Text style={styles.cardBody}>
              {item.body}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#f5f7fa",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#222",
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
    marginBottom: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#555",
  },

  error: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#222",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  list: {
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
    textTransform: "capitalize",
  },

  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#777",
  },
});