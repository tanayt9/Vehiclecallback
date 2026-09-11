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
  "project_id": "vechilecallback",
  "private_key_id": "b05a24d640114c94ce65a65a8472bc9b151e227e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDoD/bWtlupw4aw\nQbsWErMmY4wLJy/Eq+rcCUW2nU02aAndQc79FxjGk8q4Ol8JfJOgmFjwAiN3Nv0Y\ne2q0NM4PR3AU073Ts8mN5V5Jo+yZWeq/Rkdk/DVzHvtXup5wFgsQERPtDBOi7/t0\nQi4ycGYBKa4qH+q+1L1FPVfGqoNXo3YtWC6lCLBtd1zWhSpCfenWK/7UZFQT+dZV\nJbc7RL7WB+lIawvLZDauykhLp+xiBYzSe8m7ZILS2N7fZ1F5p5pWAAAFd9S2sxOe\nTYCIXsRsRloi0F3KyZUV3qVomZoCjpWDnIXv/KBpFmuQT2yFBKWDwyul299K6gf/\nPacYkmkVAgMBAAECggEAGOMxaUiIXxYBmWCLRGw/+1N8vut2c4SufOefqtyG3dld\niXWX0cvK0+0gtg5Ih/dsy7HbA+5uyEfE7/24bVgmazwRmKI2vwAOkyGwsXwbkTyz\n8MyENp/XyZ9efEOe30115US3mtoLNxO+p3K7ipxETEagj5L5tXqSS90uzzcVO+4v\nIHx4DeQOiR5nPg3+PRYkOUF9+2DRgh+99OnoJDfAGzszh0WHm17osetedggrXHAD\nA1Rm2utblfpVeViCzUqflA3CVEprKZV0dX434GRP7X6CUzNZijM/2LQxWLik6nEt\nAYR7E02q6oSFIYoX4EGQkiIy3iIVvyT3kEz1akdTBwKBgQD5jxTQwQ46wc7/bKhz\nfR4hEBeD8XMhNrlodb9Vtsm6L7sNGDOH3cMt24C0g4TsiRTqrTWwfs0oBnyM5dwH\n/vs7ebpVd+J7WIRPuxMxwuHcYhdcMHTANL39KjK0bAWma4rdR1whEJzH0cRqwyfa\nZU7/xqdhuVFxiU+IQla7dxvJ6wKBgQDuDUcB8gic2v3kN5JKchjWw5PAg5f7/rJ8\nPGSmGQSc6s0KuEqkVIrCY6XutztMKw+A+Eta4LAaoG/vkjZTHsx2zVzfPMBd1GPC\nYMDuruYRCoOAD4tuLflOrOUbCk9OoFqN55YhdhD2uXgmpJIvNEEeLssl3LLKOetn\nx6oMrRLY/wKBgCcfWSIIwdRQQcUlIZtJSAni3ezfUy8nxxUrMF2dlC5OAULiQmHQ\nUCLGQH0MCTCTpOXNVZdfqYXWznvAJShTvsrqIF35t1Wi4MsnBrFMXeAQuJzJM+RV\n4Frp3J0QOiqGvXRHFZhRZGKm7eXWxk6khyft2pulU7E6128DB1nIKGEVAoGBAJPV\n8w8mPGsNJTehu1w4V2yosQ2Rq8V3e2jkKK1uRAsfVo8dvF0pk7L9J4OEj3LSGyLB\nECsz9qnSkTF63/nm2pu9FbwdgmnDCOEiLS8NtxtGKDxTawfVzUoq3W1Zjb8KnrIZ\n7IaDSC2xKQj2k0J1dStFbCvrT61/Is6klNqicV4JAoGAXDHo3Mvfi9GrZCbOgb3S\nqFAIBnLyhWyxxKEi27/AdTOVooiKE6n6p+ohs8txeaLWs8g6GlwV/VEwa2fiUmez\nt8Xe1rZlxgkNQczu2DuQlzFehofXNqVNekCZz8qI1tTh1aF6zbBPGgepzTl4vFKM\nw8KWBxjfgLjnBbxc7vOv7GM=\n-----END PRIVATE KEY-----\n",
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
