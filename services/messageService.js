const API_URL = "https://jsonplaceholder.typicode.com";

// ==========================================
// GET MESSAGES
// ==========================================

export async function getMessages() {
  try {
    const response = await fetch(`${API_URL}/posts?_limit=10`);

    if (!response.ok) {
      throw new Error("Failed to retrieve messages");
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Get messages error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
}

// ==========================================
// SEND MESSAGE
// ==========================================

export async function sendMessage(message) {
  try {
    const response = await fetch(`${API_URL}/posts`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        title: "CampusConnect Message",
        body: message,
        userId: 1,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    const data = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Send message error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
}