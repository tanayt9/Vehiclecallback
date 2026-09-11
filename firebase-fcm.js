/*
  firebase-fcm.js
  ---------------------------------------------------------------
  Sends Firebase Cloud Messaging (HTTP v1) notifications directly
  from the browser, with NO backend server.

  HOW THIS WORKS
  Google retired the old "legacy" FCM API (the one with a simple
  server key) in June 2024. The current API needs an OAuth2 access
  token, which normally a backend generates using a Firebase
  service account's private key.

  Since this project has explicitly chosen to stay 100% static
  (no server, no database), the service account key below is
  embedded directly in this file and the JWT is signed in the
  visitor's browser using the Web Crypto API.

  !! SECURITY WARNING - READ THIS !!
  Anyone who opens your GitHub Pages site can view this file and
  read SERVICE_ACCOUNT in full, including the private key. That
  means anyone can:
    - send push notifications to any device token you've stored
    - use this key for anything else that service account's role
      is allowed to do on your Firebase project
  To limit the damage if the key leaks:
    1. Create a DEDICATED service account (Firebase console ->
       Project settings -> Service accounts -> Manage service
       account permissions) and grant it ONLY the
       "Firebase Cloud Messaging API Admin" (or "Firebase
       Messaging Admin") role - nothing else.
    2. Never reuse your default "Firebase Admin SDK" service
       account here - that one has broad project access.
    3. Treat the key as burned/public. Rotate it (delete + create
       a new key in the Firebase console) if you ever suspect
       abuse, and watch your Firebase usage/billing.
    4. If this ever needs to be trustworthy/private, move this
       function into a small serverless endpoint (Cloudflare
       Worker, Firebase Cloud Function, etc.) instead.
  ---------------------------------------------------------------
*/

// PASTE the JSON key you downloaded for your dedicated,
// FCM-only service account here.
const SERVICE_ACCOUNT = {
  "type": "service_account",
  "project_id": "vehiclecallback",
  "private_key_id": "71386061f50ec3e38752b194ed92531b544270c3",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDmNYBLRxvrsd3s\n2XL4l4iilCpfjUa1LFymsgEvsT/mrfMezFRX5UC3uVBPFkrQ6t4uQ3zweaxQf9Nm\nVC/ReTKmqvaAhCGH6kio/tg44TumHnYJfeKc4azfjbOhO1KMsLkmmo/cUCMotx8K\n3KBPTpGr1VBzAgI8cHQAmwRcCuS77cN2jR9ScWmoM/ig2lGeHq9nc3j/aaEAhnj4\nQgpu763Ga0MSgwonyA18L2x4jqOknFopZXH1N6/OSmuY+n81+W7Y+k3834TOhHcM\nZY7FH1AgvTcoNkjFG/y39Wgv/eZmcV7VxZYDV37o8dOIAO0OVDTMsIhjkec4wfeh\noEw2si4PAgMBAAECggEAJG4E/mSjW3oLN4b1tbctLSUrS3Gs5dC+XLbAj06KYTPX\nzGDjXAFwa2KM/eb2Mfdo74NIizmF9js0NfZOluSKCmv1lELUl5CQrQWfK+kgqloZ\nrcjZCqB/3eSrr3EW0CLLOfutllysI65O4EYnrEUvsjSQhZKkzfGxucLOPs6OgdqC\nf8UZRKuO3nmcUmib3nD2eYp6/DETrfDZiJ4slrXkLFcYN6xGkweuDHKKnQ/+kic6\ndKnMCnRD4QzmxWxARchFkp0rNAo2LwYYs99Ikqvp/iZNlZIgmoe5G6GALI31gBUB\nrS6OuSauj2Un2T038B7bT3bQ+dWhq0qNOJmroBjBUQKBgQD4v4dWyOR/qUHoqIE2\nqDQaGGzEy5s+Hy3T0hNPK3qFsB4k7BtB/uSMUg2dpOP0wpCUHoy1Rvfv8/fekRVW\nAcNn2mfiDIw6GpA8AMehc1JJ+/mEy/EAFExxkxdRTxhe1GD3sifIAofWk+jXYEOj\nslKquAh9ClRnMUBDHMMof35sdwKBgQDs65wiS3lTftKYU0MBjy9OYOYO8xt6bbZb\n/48X9KEMSXcK4JxnC2KAvebim9DnQhKSSEE1O29oCxRG628HofGRuPgGwMX4Go80\ndJlmGbsi390N0Y1ufZuK9mWV+eX/SboQPvxGBmeL8YPuWNWrkcxI7l46SCsfZHyV\nNzXAEjppKQKBgQCM4AvJ/qRKGJWXKjdjuQco8ERJf/Y/zHCr0gHViI4vQHsR9hXJ\n3o2ZWq8TZNslNzuiZ1rRH4wzfTwX9Jrcxsrf+jVzNCAGmByvntFwgltMQ0QhDU9D\n+DsC54cBKYZnzmfMYD1fbO95evMXZxFnmApxXSCRkFQUzTPTzmpIeUwkKQKBgGxU\nNun/dJRW8tgvif3WiJzf9ZF0W2YZcD6UlcswUcsadFIG7by4Gewf6MhI0rZLIc69\nNwOuD3yVREpBMF1fEOO+nboIvvx4uG4VumZS8Zw6nArLfE2/JTXfAAgZYa7e+TKg\neh1SpFn6roZ3HAv8+FmIlJE1mnIaMlTQD8WpEAgxAoGABGZywyBIdL5UsODujZJn\nBGS8anr9vzCLolVPrk5uzQ/phhmfyA8EKDnu0JXL3Wy6Y5+a8vbLOVG1Ul0owO0b\n+NIG5LL+754VjAGZ03OkUgcg7t6HlsouAl9vFBb5gUqfbZJUNXWN7HwzBFe44Dt3\nstlQCYvn6vsB4sY1mxttDfA=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@vechilecallback.iam.gserviceaccount.com",
  "token_uri": "https://oauth2.googleapis.com/token"
};

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

function base64UrlEncode(bytes) {
  let binary = "";
  if (typeof bytes === "string") {
    binary = btoa(bytes);
  } else {
    const arr = new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
    binary = btoa(binary);
  }
  return binary.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem) {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")   // strips literal backslash-n if it was never interpreted as a real newline
    .replace(/\s+/g, "");  // strips real newlines/spaces
  const binary = atob(clean);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

async function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = base64UrlEncode(JSON.stringify(header)) + "." + base64UrlEncode(JSON.stringify(claim));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );
  return unsigned + "." + base64UrlEncode(signature);
}

async function getAccessToken(serviceAccount) {
  const assertion = await signJwt(serviceAccount);
  const res = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + assertion
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data && (data.error_description || data.error)) ||
      "Could not get a Google OAuth token. If this is a CORS error in the console, the oauth2.googleapis.com/token endpoint is being blocked by the browser and you will need a tiny serverless proxy instead of a fully static page."
    );
  }
  return data.access_token;
}

/**
 * Sends a Firebase Cloud Messaging notification directly from the browser.
 * @param {string} deviceToken FCM registration token of the recipient device
 * @param {string} title Notification title
 * @param {string} body Notification body/message
 * @param {object} data Extra key/value data payload (all values must be strings)
 */
async function sendFcmNotification(deviceToken, title, body, data) {
  if (!SERVICE_ACCOUNT.project_id || SERVICE_ACCOUNT.project_id === "YOUR_FIREBASE_PROJECT_ID") {
    throw new Error("Firebase service account is not configured yet. Edit SERVICE_ACCOUNT in web/firebase-fcm.js.");
  }
  const accessToken = await getAccessToken(SERVICE_ACCOUNT);
  const stringData = {};
  Object.keys(data || {}).forEach(k => { stringData[k] = String(data[k]); });

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + accessToken
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          data: stringData,
          android: { priority: "high" },
          apns: { headers: { "apns-priority": "10" } }
        }
      })
    }
  );
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((out && out.error && out.error.message) || "Firebase rejected the notification.");
  }
  return out;
}
