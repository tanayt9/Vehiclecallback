# Vehicle Callback Center — Firebase edition

## Pages

- `index.html` — callback request screen, validation, Firebase (FCM) notification, local browser history.
- `register.html` — new vehicle registration request (unchanged, uses `mailto:`).
- `admin.html` — local admin JSON generator (now stores `fcmToken` instead of `expoPushToken`).
- `vehicles.json` — manually published vehicle registry.
- `firebase-fcm.js` — the piece that actually sends the push notification. Read the big comment at the top of this file first.

## ⚠️ Why this is different from a normal "static site sends a push notification" setup

Firebase retired its old "legacy" server-key push API in June 2024. The
**only** way left to send an FCM message is the HTTP v1 API, which requires
an OAuth2 access token generated from a **service account private key**.
There is no version of this that is both (a) fully static/no backend and
(b) secure, because the key has to live somewhere the browser can read it.

You explicitly chose the fully-static option, so `firebase-fcm.js` embeds
the service account JSON and signs its own OAuth JWT in the browser using
the Web Crypto API, then calls `fcm.googleapis.com` directly. **This means
the key is public to anyone who views your site's source.**

### Do this to limit the blast radius

1. In the Firebase console: **Project settings → Service accounts → Manage
   service account permissions** (this opens Google Cloud IAM).
2. Create a **new, dedicated** service account — do not reuse the default
   "Firebase Admin SDK" one.
3. Grant it **only** the `Firebase Cloud Messaging API Admin` role (nothing
   else — no Firestore, no Storage, no project-wide Editor/Owner role).
4. Generate a JSON key for that account and paste its contents into the
   `SERVICE_ACCOUNT` object in `firebase-fcm.js`.
5. Enable the **Firebase Cloud Messaging API (V1)** in Google Cloud APIs
   & Services for your project, if it isn't already.
6. Treat this key as permanently public. If you ever suspect abuse
   (unexpected notifications, quota spikes), delete the key in the Cloud
   console and issue a new one.

### If you change your mind later

Move the contents of `getAccessToken()`/`sendFcmNotification()` in
`firebase-fcm.js` into a tiny serverless function (Cloudflare Worker,
Firebase Cloud Function, Vercel function, AWS Lambda URL — all have free
tiers) and keep the service account key there instead. The web page would
then `fetch()` your function's URL instead of Google's directly. That's a
small, one-file change whenever you're ready — it still isn't a
"traditional backend/database."

### A note on CORS

`firebase-fcm.js` calls `https://oauth2.googleapis.com/token` and
`https://fcm.googleapis.com/v1/...` directly from the browser. Google's
token endpoint generally accepts cross-origin requests for this
service-account JWT-bearer flow. If you see a CORS error in the browser
console instead of a Firebase error, that's Google blocking the browser
call outright — at that point a serverless proxy (see above) is required,
not optional.

## Data model

```json
{
  "vehicleNo": "WB12AB1234",
  "ownerName": "Demo Owner",
  "mobile": "9876543210",
  "fcmToken": "the device's Firebase registration token, from the mobile app",
  "active": true
}
```

## Registration email limitation

Unchanged from before — a static GitHub Pages page cannot silently send
email using only browser JavaScript. `register.html` uses `mailto:`; set
`OWNER_EMAIL` inside that file.

## Admin-only caveat

`admin.html` is not access-controlled — anyone who knows the URL can open
it. It's "admin by convention," not authentication. For real access
control you'd need a hosted identity provider or serverless auth layer.

## Local notification history

`index.html` stores up to 100 request records in the browser's
`localStorage`. It's per-device/per-browser only.

## Publish

Upload the contents of `web/` to a GitHub repository and enable GitHub
Pages.
