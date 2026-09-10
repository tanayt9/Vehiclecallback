# Vehicle Callback Notification System — Firebase edition (v3)

Backend-free static website + Expo/React Native mobile app, using Firebase
Cloud Messaging instead of Expo push notifications.

## What changed from the Expo-push version

| | Expo push (old) | Firebase (this version) |
|---|---|---|
| Sending a notification | Direct `fetch()` to Expo's push API, no secret needed | Direct `fetch()` to Firebase, needs a service-account key embedded client-side (see warning below) |
| Mobile SDK | `expo-notifications` | `@react-native-firebase/messaging` |
| Works in Expo Go | Yes (with dev-build caveats on Android) | **No** — needs a custom dev client (`eas build --profile development`) |
| Registry field | `expoPushToken` | `fcmToken` |

## ⚠️ Read this before you publish

You asked to keep this **fully static with the Firebase key embedded in
the client**, which is what's implemented here. That means:

- Anyone who views your GitHub Pages source can read your Firebase
  service-account private key.
- They could use it to send notifications to any device token stored in
  `vehicles.json`, or do anything else that account's role allows.

**Mitigation implemented:** the send code is isolated in
`web/firebase-fcm.js` with detailed setup instructions to create a
narrowly-scoped, FCM-only service account, so a leak can't do more than
send push notifications.

**If you want this to actually be secure later:** move
`getAccessToken()`/`sendFcmNotification()` from `firebase-fcm.js` into a
small serverless function (Cloudflare Worker, Firebase Cloud Function,
Vercel function — all have generous free tiers) and keep the key there.
Everything else about the project (no database, manual `vehicles.json`
updates, GitHub Pages hosting) stays exactly the same.

## Project layout

```
web/            static site — publish this folder to GitHub Pages
  index.html      callback request form + Firebase send
  register.html   new-vehicle request (mailto)
  admin.html      local vehicles.json builder
  vehicles.json   your vehicle → owner → FCM token registry (edit manually)
  firebase-fcm.js the actual Firebase send logic + security notes
mobile-app/     Expo/React Native app the vehicle owner installs
  App.js          registers for a real FCM token, shows it for copying
  index.js        entry point (registers background message handler)
```

## Setup order

1. Create/reuse a Firebase project. Add Android + iOS apps to it, note
   the project ID.
2. Follow `mobile-app/README.md` to configure and build the mobile app
   (custom dev client, not Expo Go), and get a real FCM token from a
   test device.
3. Follow `web/README.md` to create a dedicated, FCM-only service account
   and paste it into `web/firebase-fcm.js`.
4. Add a vehicle entry to `web/vehicles.json` with that token, via
   `web/admin.html` or by hand.
5. Publish the `web/` folder with GitHub Pages.
6. Open the site, verify the vehicle, send a test callback message.

## No database, no traditional backend

- Vehicle → owner → token mapping lives entirely in `vehicles.json`,
  edited manually and committed to the repo.
- Notification history is per-browser `localStorage`, not shared/synced.
- The only "server-side" code anywhere is Google's own Firebase/OAuth
  endpoints, called directly from the browser.
