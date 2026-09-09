// services/api.js

const API_BASE_URL = "http://10.221.102.172:3000";

// Get campus information from CampusConnect web service
export async function getCampusInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/campus`);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Campus API Error:", error);
    throw error;
  }
}

// Send feedback to the CampusConnect web service
export async function sendFeedback(name, message) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send feedback");
    }

    return data;
  } catch (error) {
    console.error("Feedback API Error:", error);
    throw error;
  }
}