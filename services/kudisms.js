// services/kudisms.js
//
// Direct KudiSMS integration: the app talks to KudiSMS over HTTPS,
// no CampusConnect backend hop.
//
// Classic KudiSMS HTTP API (GET):
//   {API_URL}?username=...&password=...&sender=...&mobiles=234...&message=...
// Balance check:
//   {API_URL}?username=...&password=...&sender=...&action=balance
//
// Credentials come from EXPO_PUBLIC_* env vars (see .env.example).
// WARNING: EXPO_PUBLIC_* values are embedded in the app binary (JS bundle).
// Anyone can extract them. This is the trade-off of sending directly from
// the app. For production, proxy through a backend that keeps the password
// server-side instead.

export const KUDISMS_API_URL =
  process.env.EXPO_PUBLIC_KUDISMS_API_URL ||
  "https://account.kudisms.net/api/";

const KUDISMS_USERNAME = process.env.EXPO_PUBLIC_KUDISMS_USERNAME || "";
const KUDISMS_PASSWORD = process.env.EXPO_PUBLIC_KUDISMS_PASSWORD || "";
const KUDISMS_SENDER_ID = process.env.EXPO_PUBLIC_KUDISMS_SENDER_ID || "";

const REQUEST_TIMEOUT_MS = 15000;

export const NIGERIAN_NUMBER_PATTERN = /^234\d{10}$/;

// KudiSMS answers with plain text (not JSON). Treat bodies containing
// these keywords as a rejection rather than a successful submission.
const ERROR_BODY_PATTERN =
  /invalid|error|fail|denied|rejected|unauthor|incorrect|insufficient|low\s*balance|suspended|blocked/i;

/**
 * True when username + password + sender ID are all present.
 * Call before sending to show a setup hint instead of a cryptic failure.
 */
export function isKudiConfigured() {
  return Boolean(KUDISMS_USERNAME && KUDISMS_PASSWORD && KUDISMS_SENDER_ID);
}

/** Which credential fields are still missing (for setup-hint messages). */
export function getMissingKudiFields() {
  const missing = [];
  if (!KUDISMS_USERNAME) missing.push("EXPO_PUBLIC_KUDISMS_USERNAME");
  if (!KUDISMS_PASSWORD) missing.push("EXPO_PUBLIC_KUDISMS_PASSWORD");
  if (!KUDISMS_SENDER_ID) missing.push("EXPO_PUBLIC_KUDISMS_SENDER_ID");
  return missing;
}

/**
 * Normalize user input to the KudiSMS international format (234XXXXXXXXXX).
 * Returns the formatted number, or null when invalid.
 *
 * Accepted: 08012345678, 8012345678, 2348012345678, +2348012345678
 * (spaces, dashes, parentheses and dots are ignored).
 */
export function formatToKudiNumber(rawInput) {
  if (typeof rawInput !== "string") {
    return null;
  }

  const cleaned = rawInput.replace(/[\s\-().]/g, "");

  if (!cleaned) {
    return null;
  }

  let digits = cleaned;

  if (digits.startsWith("+")) {
    digits = digits.substring(1);
  }

  // Reject anything not purely numeric (letters, extra "+" signs, ...).
  if (!/^\d+$/.test(digits)) {
    return null;
  }

  if (digits.startsWith("0")) {
    digits = `234${digits.substring(1)}`;
  }

  // Bare 10-digit mobile number without the trunk zero (e.g. 8012345678).
  if (/^[789]\d{9}$/.test(digits)) {
    digits = `234${digits}`;
  }

  if (!NIGERIAN_NUMBER_PATTERN.test(digits)) {
    return null;
  }

  return digits;
}

function buildUrl(params) {
  const base = KUDISMS_API_URL.endsWith("?")
    ? KUDISMS_API_URL
    : `${KUDISMS_API_URL.replace(/\?$/, "")}?`;
  const search = new URLSearchParams(params).toString();
  return `${base}${search}`;
}

async function getText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = (await response.text()).trim();

    if (!response.ok) {
      throw new Error(
        text.slice(0, 200) || `KudiSMS request failed: ${response.status}`
      );
    }

    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("KudiSMS request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function throwIfRejected(body) {
  if (body && ERROR_BODY_PATTERN.test(body)) {
    throw new Error(`KudiSMS rejected the request: ${body.slice(0, 200)}`);
  }
}

/**
 * Send an SMS directly through KudiSMS.
 * @param {string} phoneNumber - any accepted Nigerian format (see above).
 * @param {string} message - non-empty text (app caps it at 480 chars).
 * @returns {Promise<{success: true, to: string, providerResponse: string}>}
 */
export async function sendKudiSMS(phoneNumber, message) {
  if (!isKudiConfigured()) {
    const missing = getMissingKudiFields().join(", ");
    throw new Error(
      `KudiSMS is not configured. Set ${missing} in your .env file and restart Expo.`
    );
  }

  const to = formatToKudiNumber(phoneNumber);
  if (to === null) {
    throw new Error("Enter a valid Nigerian number, e.g. 08012345678.");
  }

  const text = typeof message === "string" ? message.trim() : "";
  if (!text) {
    throw new Error("Please enter a message.");
  }

  const url = buildUrl({
    username: KUDISMS_USERNAME,
    password: KUDISMS_PASSWORD,
    sender: KUDISMS_SENDER_ID,
    mobiles: to,
    message: text,
  });

  let providerResponse;
  try {
    providerResponse = await getText(url);
  } catch (error) {
    console.error("KudiSMS API Error:", error);
    throw error;
  }

  throwIfRejected(providerResponse);

  return {
    success: true,
    to,
    providerResponse: providerResponse.slice(0, 500),
  };
}

/**
 * Check the KudiSMS credit balance (helper for future use — not shown
 * in the UI). Resolves to { success: true, balance } where balance is
 * the raw provider response.
 */
export async function checkKudiBalance() {
  if (!isKudiConfigured()) {
    throw new Error(
      "KudiSMS is not configured. Set your EXPO_PUBLIC_KUDISMS_* vars first."
    );
  }

  const url = buildUrl({
    username: KUDISMS_USERNAME,
    password: KUDISMS_PASSWORD,
    sender: KUDISMS_SENDER_ID,
    action: "balance",
  });

  const raw = await getText(url);
  throwIfRejected(raw);

  return { success: true, balance: raw };
}
