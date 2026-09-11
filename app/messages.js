import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function Messages() {
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      s.name?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  useEffect(() => {
    let unsubscribeProfiles;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }

        const profilesQuery = query(
          collection(db, "publicProfiles"),
          orderBy("name", "asc")
        );

        unsubscribeProfiles = onSnapshot(
          profilesQuery,
          (snapshot) => {
            const registeredStudents = snapshot.docs
              .map((profileDoc) => ({
                id: profileDoc.id,
                ...profileDoc.data(),
              }))
              .filter(
                (student) => student.uid !== currentUser.uid
              );

            setStudents(registeredStudents);
            setLoading(false);
          },
          (error) => {
            console.log("Could not load students:", error);

            Alert.alert(
              "Unable to Load Students",
              "Please check your internet connection and Firestore rules."
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeProfiles) {
        unsubscribeProfiles();
      }
    };
  }, [router]);

  const openChat = (student) => {
    const userId = student.uid || student.id;

    if (!userId) {
      Alert.alert(
        "Cannot Open Chat",
        "This profile is missing its user ID."
      );
      return;
    }

    router.push({
      pathname: "/chat",
      params: {
        userId,
        name: student.name || "CampusConnect User",
      },
    });
  };

  // Toggle the search bar; clear query when hiding
  const toggleSearch = () => {
    if (searchVisible) {
      setSearchQuery("");
    }
    setSearchVisible((prev) => !prev);
  };

  const renderStudent = ({ item }) => (
    <TouchableOpacity
      style={styles.conversation}
      onPress={() => openChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.name || "?").charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.messageInfo}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.name || "CampusConnect User"}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={styles.lastMessage}
            numberOfLines={1}
          >
            Tap to start a conversation
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Messages</Text>

          <Text style={styles.subtitle}>
            {searchVisible
              ? `${filteredStudents.length} result${filteredStudents.length !== 1 ? "s" : ""}`
              : "Chat with people on campus"}
          </Text>
        </View>

        {/* + toggles to ✕ when search is open */}
        <TouchableOpacity
          style={[
            styles.newChatButton,
            searchVisible && styles.newChatButtonActive,
          ]}
          onPress={toggleSearch}
          activeOpacity={0.8}
        >
          <Text style={styles.plusText}>
            {searchVisible ? "✕" : "+"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH BAR (animated in/out) ────────────────────────── */}
      {searchVisible && (
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search students by name…"
            placeholderTextColor="#8A94A6"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {/* ── INFO CARD (only when not searching) ─────────────────── */}
      {!searchVisible && (
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💬</Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Campus Messaging
            </Text>

            <Text style={styles.infoText}>
              Choose a registered CampusConnect student to begin a
              conversation. Tap{" "}
              <Text style={styles.infoTextBold}>+</Text> to search.
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {searchVisible && searchQuery
          ? "Search Results"
          : "CampusConnect Students"}
      </Text>

      {/* ── STUDENT LIST ───────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#168EAC" />

          <Text style={styles.loadingText}>
            Loading students...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {searchQuery ? "🔍" : "👥"}
              </Text>

              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? "No students found"
                  : "No other students yet"}
              </Text>

              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different name.`
                  : "Register another test account to try student-to-student chat."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  backText: {
    fontSize: 36,
    color: "#182033",
    marginTop: -4,
  },

  headerTitleContainer: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#182033",
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  newChatButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#168EAC",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  newChatButtonActive: {
    backgroundColor: "#E05F5F",
  },

  plusText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28,
  },

  // ── Search bar ──────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#168EAC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#168EAC",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#182033",
    paddingVertical: 0,
  },

  // ── Info card ──────────────────────────────────────────────────────
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F7FB",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
  },

  infoIcon: {
    fontSize: 34,
    marginRight: 15,
  },

  infoContent: {
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

  infoTextBold: {
    fontWeight: "700",
    color: "#168EAC",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#182033",
    marginBottom: 12,
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

  list: {
    paddingBottom: 20,
    flexGrow: 1,
  },

  conversation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8F7FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  avatarText: {
    fontSize: 21,
    fontWeight: "800",
    color: "#168EAC",
  },

  messageInfo: {
    flex: 1,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#182033",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
  },

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 35,
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
});