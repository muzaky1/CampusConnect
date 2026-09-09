import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./firebase";

export async function sendChatMessage(
  conversationId,
  senderId,
  text
) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Message cannot be empty");
  }

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  await addDoc(messagesRef, {
    senderId,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });
}

export function listenToMessages(
  conversationId,
  callback,
  onError
) {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const messagesQuery = query(
    messagesRef,
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
      }));

      callback(messages);
    },
    (error) => {
      console.log("Firebase message listener error:", error);

      if (onError) {
        onError(error);
      }
    }
  );
}