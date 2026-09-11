# Vehicle Callback Mobile — Firebase edition

Expo/React Native companion app. This is the app the **vehicle owner**
installs; it registers a real Firebase Cloud Messaging token so the web
page can notify them directly.

## ⚠️ Expo Go will not work for this app

Expo Go is a pre-built generic app store app — it can't load the native
Firebase Messaging SDK (`@react-native-firebase/messaging`), which is what
this project uses to get a genuine FCM token that's bound to *your*
Firebase project on both Android and iOS.

The standard fix (still lets you keep the fast Expo dev workflow, hot
reload, etc.) is a **custom development build**:

```bash
npm install
npx expo install expo-dev-client
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform android
eas build --profile development --platform ios   # needs an Apple developer account
```

Install the resulting `.apk`/`.ipa` on your phone once, then day-to-day
you just run:

```bash
npx expo start --dev-client
```

exactly like you would with Expo Go, except it opens your custom dev
client instead.

## New in this version

- **Regenerate button** — for a reinstall or a new device, this forces a
  fresh FCM token and opens the phone's mail app pre-filled to
  `ADMIN_EMAIL` with the vehicle number, owner name, mobile number, and the
  new token, labeled as a "Reinstall / new device" request. Edit
  `ADMIN_EMAIL` near the top of `App.js` before building.
- **Currently registered card** — after registering, the app shows the
  vehicle/owner/mobile it's currently set up for.
- **Copy / Share token buttons** — tap Copy to put the FCM token on the
  clipboard, or Share to send it via WhatsApp or any other installed app.
- **Local notification history with delete** — every received notification
  is saved on-device (AsyncStorage) with a per-item Delete button and a
  Clear all option. Survives app restarts; does not sync anywhere.
- **Actionable "Call back" push notification** — notifications now arrive
  as a real system push (via `@notifee/react-native`) with a **Call back**
  button that dials the requester's number directly, in foreground,
  background, and killed app states on Android. (iOS shows the action too,
  but a fully killed iOS app is not guaranteed to wake for a silent/data
  push — this is an Apple platform limitation, not something fixable in
  app code. Foreground/background iOS delivery works normally.)

Because this adds new native dependencies (`@react-native-firebase/app`,
`@notifee/react-native`, `@react-native-async-storage/async-storage`), any
existing dev client / APK must be **rebuilt** — see below.

## Firebase project setup (one time)

1. Go to the [Firebase console](https://console.firebase.google.com) and
   create a project (or reuse the one from the web app).
2. Add an **Android app**: use the `package` from `app.json`
   (`com.example.vehiclecallback` — change this to something unique to
   you first, in both `app.json` files). Download `google-services.json`
   and place it at `mobile-app/google-services.json`.
3. Add an **iOS app**: use the `bundleIdentifier` from `app.json`.
   Download `GoogleService-Info.plist` and place it at
   `mobile-app/GoogleService-Info.plist`.
4. For iOS push to work at all, upload your **APNs authentication key**
   (or certificate) in Firebase console → Project settings → Cloud
   Messaging → Apple app configuration. This step is easy to miss and iOS
   notifications simply won't arrive without it.
5. Enable **Cloud Messaging API (V1)** for the project in Google Cloud
   console, if not already enabled.

## Using the app

1. Open the app on the owner's phone (from your custom dev build).
2. Enter the vehicle number (for your own reference — it isn't sent
   anywhere automatically).
3. Tap "Register notification device" and allow notifications.
4. Copy the **FCM Device Token** shown on screen.
5. Paste it into that vehicle's `fcmToken` field in the website's
   `vehicles.json` (use `web/admin.html` to help build the file), then
   publish it on GitHub Pages.

## Token refresh

FCM tokens can change (app reinstall, OS-level refresh, etc.). The app
listens for `onTokenRefresh` and will show the new token — the owner
needs to send you the new token again so you can update `vehicles.json`.
There's no backend here to auto-sync this, by design. Using the
**Regenerate** button is the recommended way to do this, since it also
emails you the details automatically.

## Generating an APK to give to customers

A development build needs Metro running on your computer, so it's not
what you hand to a customer. For that, build a standalone **preview** APK
instead:

1. Install the CLI and log in (one time):
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. In `mobile-app/eas.json`, make sure a `preview` profile exists that
   outputs an `.apk` (not the Play Store `.aab` format):
   ```json
   {
     "build": {
       "development": { "developmentClient": true, "distribution": "internal" },
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" }
       },
       "production": { "android": { "buildType": "app-bundle" } }
     }
   }
   ```
   If `eas.json` doesn't exist yet, run `eas build:configure` first — it
   creates one with sensible defaults you can then edit.
3. Build it:
   ```bash
   eas build --profile preview --platform android
   ```
4. When it finishes, EAS gives you a **download link and QR code** for the
   `.apk`. Share that link with customers directly (or upload the `.apk`
   somewhere you control) — no Play Store listing is required for this.
5. First-time installers will see an "Install blocked / unknown sources"
   prompt on Android — that's expected for anything installed outside the
   Play Store; they just need to allow it once for your app.
6. Whenever you add/change native config (new packages, `app.json`
   plugins, a new `google-services.json`), rebuild with the same command —
   everyday JS-only changes don't need a rebuild if you're using the
   development client, but a distributed `.apk` is a fixed snapshot and
   needs a new build to pick up any change.

iOS distribution outside the App Store (TestFlight or ad-hoc) is more
involved and requires a paid Apple Developer account — ask if you want
those steps too.
