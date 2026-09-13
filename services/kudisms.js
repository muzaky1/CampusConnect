// services/kudisms.js
//
// Direct KudiSMS integration: the app talks to KudiSMS over HTTPS,
// no CampusConnect backend hop.
//
// New KudiSMS platform (my.kudisms.net) token API (POST):
//   {API_URL}?token=...&senderID=...&recipients=234...&message=...&gateway=2
// Docs: https://documenter.getpostman.com/view/44181644/2sB2cd3HUd
// Codes: 000=Sent, 100=bad token, 107=bad number, 109=no credit,
//   188/105/106/111=sender problem, 300=missing params.
//
// Credentials come from EXPO_PUBLIC_* env vars (see .env.example).
// WARNING: EXPO_PUBLIC_* values are embedded in the app binary (JS bundle).
// Anyone can extract them. This is the trade-off of sending directly from
// the app. For production, proxy through a backend that keeps the token
// server-side instead.

export const KUDISMS_API_URL =
  process.env.EXPO_PUBLIC_KUDISMS_API_URL ||
  "https://my.kudisms.net/api/sms";

const KUDISMS_TOKEN = process.env.EXPO_PUBLIC_KUDISMS_TOKEN || "";
const KUDISMS_SENDER_ID = process.env.EXPO_PUBLIC_KUDISMS_SENDER_ID || "";
const KUDISMS_GATEWAY = process.env.EXPO_PUBLIC_KUDISMS_GATEWAY || "2";

// Legacy classic vars (account.kudisms.net) — no longer required.
const KUDISMS_USERNAME = process.env.EXPO_PUBLIC_KUDISMS_USERNAME || "";
const KUDISMS_PASSWORD = process.env.EXPO_PUBLIC_KUDISMS_PASSWORD || "";

const REQUEST_TIMEOUT_MS = 15000;

export const NIGERIAN_NUMBER_PATTERN = /^234\d{10}$/;

// KudiSMS answers with plain text or JSON. Treat error codes /
// keywords as a rejection rather than a successful submission.
const ERROR_BODY_PATTERN =
  /"status"\s*:\s*"error"|error_code|invalid|error|fail|denied|rejected|unauthor|incorrect|insufficient|low\s*balance|suspended|blocked|deactivated/i;

/**
 * True when token + sender ID are both present.
 * Call before sending to show a setup hint instead of a cryptic failure.
 */
export function isKudiConfigured() {
  // Token mode (my.kudisms.net) is canonical. Classic username/password
  // mode is accepted as a fallback for older setups.
  if (KUDISMS_TOKEN && KUDISMS_SENDER_ID) return true;
  return Boolean(KUDISMS_USERNAME && KUDISMS_PASSWORD && KUDISMS_SENDER_ID);
}

/** Which credential fields are still missing (for setup-hint messages). */
export function getMissingKudiFields() {
  const missing = [];
  if (!KUDISMS_TOKEN) {
    // Point to the new var first; classic vars are legacy.
    missing.push("EXPO_PUBLIC_KUDISMS_TOKEN");
  }
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

async function postJson(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Docs accept POST JSON: { token, senderID, recipients, message, gateway }
    const response = await fetch(KUDISMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
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
  if (!body) return;
  // Success is code 000. Anything with status:error or a non-000
  // error_code, or classic error keywords, is a rejection.
  try {
    const parsed = JSON.parse(body);
    const code = String(
      parsed?.code ?? parsed?.error_code ?? parsed?.status_code ?? ""
    );
    const status = String(parsed?.status ?? "").toLowerCase();
    if (status === "error" || (code && code !== "0" && code !== "000")) {
      throw new Error(
        `KudiSMS rejected the request: ${body.slice(0, 200)}`
      );
    }
    if (status === "success" || code === "000" || code === "0") return;
  } catch (e) {
    if (e?.message?.startsWith("KudiSMS rejected")) throw e;
    // Not JSON — fall through to keyword check below.
  }
  if (ERROR_BODY_PATTERN.test(body)) {
    // Allow "000" success prefix to pass even if body mentions other words.
    if (/^000\b/.test(body.trim())) return;
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

  let providerResponse;
  try {
    providerResponse = await postJson({
      token: KUDISMS_TOKEN,
      senderID: KUDISMS_SENDER_ID,
      recipients: to,
      message: text,
      gateway: KUDISMS_GATEWAY,
    });
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
 * Check the KudiSMS credit balance via my.kudisms.net.
 * Resolves to { success: true, balance } where balance is
 * the raw provider response.
 */
export async function checkKudiBalance() {
  if (!KUDISMS_TOKEN) {
    throw new Error(
      "KudiSMS is not configured. Set your EXPO_PUBLIC_KUDISMS_TOKEN first."
    );
  }

  const base = KUDISMS_API_URL.replace(/\/sms\/?$/, "");
  const url = `${base}/balance`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let raw;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: KUDISMS_TOKEN }),
      signal: controller.signal,
    });
    raw = (await response.text()).trim();
    if (!response.ok) {
      throw new Error(raw.slice(0, 200) || `Balance check: ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
  throwIfRejected(raw);

  return { success: true, balance: raw };
}
