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
  "project_id": "mycarqr-fe99c",
  "private_key_id": "5e5d17b4daf84aeae0c2c9234cf921a0999f63cb",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+WK7PxzwYbeRr\n2QvKJfP+3Bf7XflONX+nVb9/OExdnXLB4l6L5Jj25rLNpVdx2YK5B3UohLojcHSp\nNN4LiufkRMmCwnK9Ox1j7cmmGKC8JzhBvXcjUaKXPiL368M+keQD0IWJ06X2bJEy\nr9czxT7JTJeUZUaTVU4O6eC5Sk1gOM4YCZGehugYBSJDdvNoohAWQVmoY+hNaSUs\nwXRdDHV8dTZ12lVugvJpJcNElPifgz5qlLbUnPkfj1KUGdB/RxUyXe8eAzHS/f8f\nJEuiWCvjPcEIQZIFu7OgyauC6eVbyYb5qJSMLCOR/I5H3WROPjBjqiyb+/c01Osu\nc7ed+qbRAgMBAAECggEAEVyKJFRAMlu6ow4e3cswqkE1tEUd51DoofEHqJFQYNUK\nua29sS2SeKmx6yEuvMkJu/n2yRFzH2ajU2gprRyYOlk+Vo2JFOK6k2nl078pEQRU\nRKXFAz0P0xL1Mk8IJdG9fg4T0g6Sk4uTQk/o1XVjHM3+QOgsY+Wa2zAgodHpxRH8\ns/Bd5pLIieaHSbhctC5POzqKLqnqWpF7tjvFMo7eYBG4/sjCPaMRuQ3h21a5UXIZ\nKX5RDDkPvnWTU/GVzh42z64hBS2l1b1qtAtkmmR5FYsYujSYYpmfQW7o14UDk5WB\nXkBLqNm4PQHHB6KLbcCCcszNm0vuMPXWmtbn9IUqaQKBgQD8Xgjjzxm/Kml5WyaS\nH1TpLA/JcTXW3i72ATeFBb6l2qci9SkJeE6ed2kZshzZXQ6D/cz0eAap80m0cBLx\nL/2UTYTWzLkchwyqOULbRr0X13QDAJMkbrPktTn8IxrZiVtmHrOr/ecJ+Br7oCXy\n0n9FKg1pAs3AVBNcXc9m6LQQ6QKBgQDBFhpnLnHkiulrR8c7WH5TZ4jn/B5CUky4\nr94icLPXp2k6X2kz61Av5o4F3pxuoYoZbQslDwd9dkXfg62MGD/CF0X2NZAVE52A\nXk9CxIQ0ZTOoCVO6iQVG6XSpGQ4ZOlFvzNKDD8rx1nrTUkT4lSDeyAwmFCTnzyBc\nqb6Mw7l1qQKBgDQU3/bLpb+a7Bt8YTBkwOxCCJwE/hxyy/Q++gs8zUSDJF0FhUuM\nBYWUlR8Vb/i3yKgat7J4Fr/6EmrnejFGOyng+Zous8EcadOzb4W7SojiEPIRq0wo\ngH2hnO7Y+9CLFU605VWIV6bqCf+F5G8BW/yVGiFiz71yXHCCd6wAODEJAoGAEbl1\nswMQcWpPAwoTv97fuchHSQRbwrrLUCjUu1SdLa6weitH/Pwc4EjJwMAum/k4NB1O\naJh4l4vD3kC4LaQMNkTspy1DjKvASYhevkJL4INpuoMgrH7nfRrxGpSyNp6j2x9y\nM5W/i3Ok0sE6k5cc7VZvxw8SVDUvQ1JRq5pL7AECgYEAn1Bpqn7QlIo2nbzQT1DJ\nzq/olsli3ZFSblwZ4GazIiplDbeeTmrYf8sGYxDNwDgjAr8VicEuTrlADsvmgFDs\ncT2ozxLA8nsLzbf7FjxOwEzTWOIwLhRb46aB3DKXIXwBkjSYZ2Zm7rmbB1xNaLnT\nAZg7GwtEMtTfoeTb9awo6QI=\n-----END PRIVATE KEY-----\n",
  "client_email": "mycarqr@mycarqr-fe99c.iam.gserviceaccount.com",
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
body: "grant_type=" +
  encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") +
  "&assertion=" + encodeURIComponent(assertion)  });
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
