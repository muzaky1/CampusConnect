import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

const MAX_HISTORY = 200;

/**
 * Sort two UIDs into a deterministic conversation ID.
 * Both participants resolve to the same Firestore path.
 */
export function buildConversationId(uidA, uidB) {
  if (!uidA || !uidB) return null;
  if (uidA === uidB) return null;
  const sorted = [String(uidA), String(uidB)].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

export async function sendChatMessage(
  conversationId,
  senderId,
  text,
  otherUserId = null
) {
  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("Invalid conversation");
  }

  if (!senderId || typeof senderId !== "string") {
    throw new Error("Invalid sender");
  }

  const trimmedText = typeof text === "string" ? text.trim() : "";

  if (!trimmedText) {
    throw new Error("Message cannot be empty");
  }

  if (trimmedText.length > 1000) {
    throw new Error("Message is too long");
  }

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const messagePayload = {
    senderId,
    text: trimmedText,
    createdAt: serverTimestamp(),
  };

  // Write the message first so a metadata failure never loses chat content.
  const messageRef = await addDoc(messagesRef, messagePayload);

  // Maintain a lightweight parent doc so conversation lists can show
  // last-message previews and sort by recency without reading subcollections.
  try {
    const participants =
      otherUserId && typeof otherUserId === "string"
        ? [senderId, otherUserId].sort()
        : [senderId];

    await setDoc(
      doc(db, "conversations", conversationId),
      {
        participants,
        lastMessage: trimmedText.slice(0, 200),
        lastSenderId: senderId,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (metadataError) {
    // Non-fatal: the message itself was already stored.
    console.warn("Could not update conversation metadata:", metadataError);
  }

  return messageRef.id;
}

export function listenToMessages(
  conversationId,
  callback,
  onError
) {
  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("Invalid conversation");
  }

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  // Query newest-first + limit so we keep the LATEST 200 messages
  // (orderBy asc + limit would pin us to the OLDEST 200 forever).
  // We reverse client-side back to chronological order for the UI.
  const messagesQuery = query(
    messagesRef,
    orderBy("createdAt", "desc"),
    limit(MAX_HISTORY)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc) => ({
          id: messageDoc.id,
          ...messageDoc.data(),
        }))
        .reverse();

      callback(messages);
    },
    (error) => {
      console.error("Firebase message listener error:", error);

      if (onError) {
        onError(error);
      }
    }
  );
}