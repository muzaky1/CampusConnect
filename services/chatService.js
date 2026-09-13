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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { File } from "expo-file-system";

import { db, storage } from "./firebase";

const MAX_HISTORY = 200;
const MAX_TEXT_LENGTH = 1000;

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

  if (trimmedText.length > MAX_TEXT_LENGTH) {
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
    type: "text",
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

/**
 * MMS: upload a local image/video file to Firebase Storage and
 * return its public download URL so both chat participants can view it.
 *
 * Uses expo-file-system SDK 54 File API (File implements Blob).
 * Global fetch(localUri).blob() fails on native file:// URIs and
 * surfaces as storage/unknown, so read via File.arrayBuffer() instead.
 */
export async function uploadChatMedia(localUri, conversationId, mimeType) {
  if (!localUri || typeof localUri !== "string") {
    throw new Error("Invalid media file");
  }

  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("Invalid conversation");
  }

  const file = new File(localUri);
  if (!file.exists) {
    throw new Error("Media file not found on device");
  }
  if (file.size === 0) {
    throw new Error("Media file is empty");
  }

  const data = await file.arrayBuffer();

  const extension =
    mimeType === "video" ||
    localUri.toLowerCase().match(/\.(mp4|mov|m4v)$/)
      ? "mp4"
      : localUri.toLowerCase().match(/\.(png|gif|webp|heic|heif)$/)?.[1] ||
        "jpg";

  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const storageRef = ref(storage, `chat_media/${conversationId}/${fileName}`);

  await uploadBytes(storageRef, data, {
    contentType:
      extension === "mp4"
        ? "video/mp4"
        : extension === "png"
          ? "image/png"
          : "image/jpeg",
  });

  return getDownloadURL(storageRef);
}

/**
 * MMS: send an image or video message with optional text caption.
 * `media` = { type: 'image' | 'video', mediaUrl, text?, width?, height?, duration? }
 */
export async function sendMediaMessage(
  conversationId,
  senderId,
  media,
  otherUserId = null
) {
  if (!conversationId || typeof conversationId !== "string") {
    throw new Error("Invalid conversation");
  }

  if (!senderId || typeof senderId !== "string") {
    throw new Error("Invalid sender");
  }

  const type = media?.type;
  if (type !== "image" && type !== "video") {
    throw new Error("Invalid media type");
  }

  if (!media?.mediaUrl || typeof media.mediaUrl !== "string") {
    throw new Error("Media URL is required");
  }

  const caption =
    typeof media.text === "string" ? media.text.trim().slice(0, 1000) : "";

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const messagePayload = {
    senderId,
    type,
    mediaUrl: media.mediaUrl,
    text: caption,
    width: typeof media.width === "number" ? media.width : null,
    height: typeof media.height === "number" ? media.height : null,
    duration: typeof media.duration === "number" ? media.duration : null,
    createdAt: serverTimestamp(),
  };

  const messageRef = await addDoc(messagesRef, messagePayload);

  try {
    const participants =
      otherUserId && typeof otherUserId === "string"
        ? [senderId, otherUserId].sort()
        : [senderId];

    const preview =
      type === "image" ? "📷 Photo" : "🎬 Video";
    await setDoc(
      doc(db, "conversations", conversationId),
      {
        participants,
        lastMessage: caption ? `${preview} — ${caption.slice(0, 180)}` : preview,
        lastSenderId: senderId,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (metadataError) {
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