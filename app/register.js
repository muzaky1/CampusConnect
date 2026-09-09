import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../services/firebase";

export default function RegisterScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    const cleanName = name.trim();
    const cleanStudentId = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanName ||
      !cleanStudentId ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing details", "Please complete every field.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please re-enter your password.");
      return;
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(credential.user, {
        displayName: cleanName,
      });

      await Promise.all([
        // Private profile: only this student can read their Student ID/email.
        setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          name: cleanName,
          studentId: cleanStudentId,
          email: cleanEmail,
          createdAt: serverTimestamp(),
        }),

        // Chat-safe profile: no Student ID or email is included here.
        setDoc(doc(db, "publicProfiles", credential.user.uid), {
          uid: credential.user.uid,
          name: cleanName,
          createdAt: serverTimestamp(),
        }),
      ]);

      router.replace("/");
    } catch (error) {
      const message =
        error.code === "auth/email-already-in-use"
          ? "An account already exists with this email."
          : error.code === "auth/invalid-email"
            ? "Enter a valid email address."
            : "We could not create your account. Please try again.";

      Alert.alert("Registration failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create account</Text>

        <Text style={styles.subtitle}>
          Join CampusConnect to get started.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Student ID"
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password (at least 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Pressable
          style={[styles.button, loading && styles.disabled]}
          onPress={register}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text>Already have an account? </Text>

          <Pressable onPress={() => router.replace("/login")}>
            <Text style={styles.link}>Log in</Text>
          </Pressable>
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
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#182033",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 30,
    color: "#6B7280",
    fontSize: 15,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE8",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    marginBottom: 14,
  },

  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#168EAC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  disabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
  },

  link: {
    color: "#168EAC",
    fontWeight: "700",
  },
});