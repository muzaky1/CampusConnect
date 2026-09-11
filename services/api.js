// services/api.js

// Overridable via EXPO_PUBLIC_API_URL (e.g. in a .env file).
// Falls back to the dev-server LAN address so existing setups keep working.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.221.102.172:3000";

const REQUEST_TIMEOUT_MS = 15000;

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    // Read as text first: error pages (HTML/empty) would otherwise throw
    // a SyntaxError that masks the real HTTP status.
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON body (e.g. proxy error page) — keep data null.
      }
    }

    if (!response.ok) {
      const message =
        data?.message || `Server error: ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Get campus information from CampusConnect web service
export async function getCampusInfo() {
  try {
    return await fetchJson("/api/campus");
  } catch (error) {
    console.error("Campus API Error:", error);
    throw error;
  }
}

// Send feedback to the CampusConnect web service.
// Sends both `message` and `feedback` keys: the server accepts either,
// which fixes the previous client/server field-name mismatch.
export async function sendFeedback(name, message) {
  try {
    return await fetchJson("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        message,
        feedback: message,
      }),
    });
  } catch (error) {
    console.error("Feedback API Error:", error);
    throw error;
  }
}

// Get campus announcements. Always resolves to an array (possibly empty)
// with guaranteed string ids so FlatList keyExtractor never crashes.
export async function getAnnouncements() {
  try {
    const data = await fetchJson("/api/announcements");

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.announcements)
        ? data.announcements
        : [];

    return list.map((item, index) => ({
      ...item,
      id: String(item?.id ?? `announcement-${index}`),
    }));
  } catch (error) {
    console.error("Announcements API Error:", error);
    throw error;
  }
}

// Get campus updates. Resolves to { success, records, error } to match
// the shape app/campus-updates.js expects. Never throws for HTTP-level
// failures — they are returned as { success: false, error }.
export async function getCampusUpdates() {
  try {
    const data = await fetchJson("/api/updates");

    const records = Array.isArray(data)
      ? data
      : Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data?.updates)
          ? data.updates
          : [];

    return { success: true, records };
  } catch (error) {
    console.error("Campus Updates API Error:", error);
    return {
      success: false,
      records: [],
      error: error?.message || "Unable to load campus updates.",
    };
  }
}
