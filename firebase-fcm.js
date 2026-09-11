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
  "private_key_id": "1cab54f8458be927bc6c596f2fb435b5e1fdc4f8",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCc9mYsAtEaqSXl\nTrW5kT0ztyYWIx3lcwabEj+TYQRpSBPCPmnvAnb6m0iI/eR6Le0B2JFvwOXygy0Y\nLhXvDq6Zde7UDe92C6LE65BM+GXaT9RT6gCv1DBpLBFoJsSdtVoKSzKMjyM0h6rQ\n4t0qQ5e4VAr+asxRCpgJ7sEm9kdjAwq6XuSYgrVKQcElldctBEhOvHWLLHx7/gof\nPrz4gC7h7+AI9Ly0MJSKJhYk5xupyTEnCvOaH8H3Ntg84KUJQ9hOm+VJBLm1JS3k\nJ6c3XIUXMYGCIieG0T2GSpmDmigyOEqT8FpAfOAdNFvEyxpGIKaEX7NCOhKO4xEW\n+T3n6vOPAgMBAAECggEAE7Fsb0ApORWYzhTagv5AdgEYE7XzNcsBPKqE9Ho7IfRr\nmjbXdqfSAq5B4wIrzNJ/RniEAsfqcctYeIyrrtMiP9nGja9z6FUcZmWBtM6DhOj4\nJFEbJfRS4JcpVe5rQ7gxpFH79RuuWJRe75dPFVLmsbdFq9b9bHuOSMy+SiOjID5a\nqKrXoXMjqp/OtjtVzql9l5RShvB8CVFy/DJ5TupF0Xx7C7ZJwLAkyMHbpztTjp4N\nMirwtvtKtEl5HWRhwhd35FI4ZzmcdSYePFYgMd5EsakCZzSlMy2ukyMFEBmNRAq2\nTNrZOMCyJeJll6gFOB9VlPUqlTdofT0TofcPfRGIFQKBgQDJYlWs4uFGK57jqyht\nXRqgjXX9oZSofjt9Aob075PwDPHckaqIIn9B48f707YdM0JPWpHdFmBUhsZJDHvC\n1LPqQwhmdzqdeAR7a6P0KEyotNckju1omNN2YXzc6osWUycxhfaGa2/J5Qb85COf\nsZyeGzrXFbN+Pjpsi4C1VbizYwKBgQDHh/eGMH4rzLEtJi1WkkYFrzBkGmE8N/8o\n6wt0Pa1Q8ahM58BYP+AiQUlO2mZhRM1oEr0Gs3Hp1T8PJ4Fh1x8tpKS0nvJ0Uxco\nfGUb9x75ezEPzwLbPGv4F5mQuerVe9/RSdeT3TX4DErW+cKlrksJGiYqmrWh0pxB\nYabYzLJU5QKBgBlRKnIsp6N5smTuzItLLCDJB+9V0+mGzRW/LpY2VEPWbMWM7oJk\ny9jNuQN4rylmm0x8l1/TA1M9Ckp+rkRlFyU5PiIblRvczbtyYc89Db4b1fw7l68R\nn2v/f4IKXmf1FjVMoRxu/0PDbih2yd+2pXje9Xu6t7EEQ7YHp6ukVi7/AoGAZI/M\nWp86F80URtME6qrSC69dzjXVZ8o5GWBM54rmPPNuhUQQFuoqhlktH0bHbqKEe71l\n82ihMt6852BbvvnyxshCEp5BSAtQkqEPPGbx/37tHTCSGfh72g/a36w0BOBnz01O\nD0HgH2HinjJGvcX4H2BEeBh9Dk/dXL5gnseb4VkCgYAUq41cnU4fGdARLVeT2e7k\nqblMX2wGSgqowljLO5s327L+WYaYPn68Yul2TbPy/MrUJUkg4o2fwv92pCuqHprQ\n5Q1+PprfRAh6gWcy0aSFSqiu2OEcnm6L2+ahIs9Ed2yIZZf0yhW1HhxuPCXc8Bus\ngiGaf+ri5G3co/UeDyFrGw==\n-----END PRIVATE KEY-----\n",
  "client_email": "com-tanayp-vehiclecallback@vechilecallback.iam.gserviceaccount.com",
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
