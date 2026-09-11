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
  "private_key_id": "d337145b335b9b1cf5f1d88f13c78ec169536a53",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC4betLsnrj2F6T\nIljMEt/U1i1QhW3JziBOdm/kbDvTxkejk2hSur/9vSqLN6a+4UesoaYICT2jMCta\n6BK8F6CA7WX5r64az0W6qCQ9IKO/c/BG673sxnuI1SZnTA1WSMtpgHz+rxI7Hqbl\nGYZIwevSQUH6pDQjS83b/aUtbulLCU8bCFtFNBnpdtKnlDqyQjr18aG86OnB39Zu\n/Lr4ZxfFaxx+vQ7/btZjeeUbvvOekSud6KLzCntK9bMQNU4gIyCreINRMlS/O9WC\nb0nPtl43q0Rh3xkPWkNRWB4MZ+uxhhntmC6C0ZY5ey6S2EjMWskd7tnn1tB1R3mp\nUo4DzLWzAgMBAAECggEAULUtdFVZKO8tR/cOY9PYptPJRcT2LAtroNp8kbn5nm3V\nONSPoTB/RyNqhDzo1/xO+NFOjpK4qfqw5lnLpQsz3mfFKfSC3NGawpnFLgjkD6rF\nWcvdM8oSEmmwoiCqb3lwpq0nRe7ILB34TCaU2K8gK0UKggwsksuf/SbtC0pPhlmA\n0+wqupNYEqlhAD/U0ebsGceYxGQ0UhIjGKBOz/AaytFjhqg4LXwzVAPY62s1TgM7\nTMQcrUaDvL4L4hIjfMBqFvk7ok50UzHmZvQ3GXUSKVexfiGT6kAWUDmoeo6F0RLl\nxA9J/zoLcvkNBtFrlHndTIOSgVm1WMy4uvagg9oieQKBgQDdBLj9s2H9+lXz2/gZ\n1GT27ddPxGC4FKYLRJYvR5gJuHzz+03QmhrYnWv210PD7n80qfdMt8+igRICfhS3\ngOrI7heB8zr+RJzClT/cBatzWAwNYpBe5xbA2RP8xN9N47K+Eu7F7LXIoVM5aDKq\nePcrivc1OpN1zN1pIJqXxvosqQKBgQDVnqv14VpUwirZLx79qNTVu5lHE5MFCd8d\nbW7Y/VtC/iIp9YTB53uN1jNOMynEoQUszzLbHgRdjPuw9meJvOe47fvewDGzacVm\n/r8gnaxbOEvk9A9Rue92zzCo+WJq795Nxfz0AU7QojK2u7LiPe93AmYwqKMs7uLn\nOw/GHvMM+wKBgGvAlKvjW5/l/yefk2qMWRjlxbX26Kx2LKmLq6irP91lW03btAlC\nSFpZDTzPoBMS4GN9hbqaVplEUdJzQ4hfSpfhNAa/3X//VWmsN/D9tqPKRj30Uqxh\n/37PlmYCWVfw7cCrHEvUZp/Evv1a5nCj/uT0oCcMQr4Ivd017wiWEnvZAoGAR7aB\nwgSKH6QjYE+6VquD79CPr1W56FodBbMEIGJFbeMEsxNSIwpD5yS+ioUQg4sOwrE4\nQGj+TC2VHR5LOekp3WI/SNM6nCFo/J+OqDNmdiUbDVyFfAkwg7Egg8lcqcum1HMf\n7QY3YEDjR4cRkXP7XPd4OOOUC/SSRdAFBpzDOVsCgYBYjb+WtmOfFA2HAHDcMMbE\nbNbilBOiTVs0YRqDCsBgB+ZyDscV7hWv01fJe9HI9ml9CXVl+27RuUHFTykZjx5I\nJ8s5lBUc2FIVFzq/UovDJBMMVLywsuxnt4mdcuo0uDuSL6R+L//5P47nsuV/nHG1\nOK4hKUkCALLfCoK3aQdcBg==\n-----END PRIVATE KEY-----\n",
  "client_email": "vechilecallback@vechilecallback.iam.gserviceaccount.com",
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
