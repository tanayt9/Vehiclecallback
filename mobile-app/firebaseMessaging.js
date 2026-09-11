/*
  firebaseMessaging.js
  ----------------------------------------------------
  Shared Firebase Cloud Messaging instance.

  @react-native-firebase/messaging v26 uses the
  modular API, so DO NOT use:

      import messaging from "@react-native-firebase/messaging";
      messaging()

  Instead we use:

      getMessaging(firebaseApp)
*/

import { getApp } from "@react-native-firebase/app";
import { getMessaging } from "@react-native-firebase/messaging";


/*
 * Get the Firebase application.
 *
 * This uses the Firebase app configured by
 * @react-native-firebase/app.
 */
export const firebaseApp = getApp();


/*
 * Create one shared Firebase Messaging instance.
 *
 * App.js imports this as:
 *
 * import { fcm } from "./firebaseMessaging";
 */
export const fcm = getMessaging(firebaseApp);