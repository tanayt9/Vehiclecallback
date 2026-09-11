import { registerRootComponent } from "expo";

import {
  getApp
} from "@react-native-firebase/app";

import {
  getMessaging,
  setBackgroundMessageHandler
} from "@react-native-firebase/messaging";

import App from "./App";

import {
  ensureNotifeeSetup,
  displayCallbackNotification
} from "./notifeeSetup";


/*
 * ---------------------------------------------------------
 * FIREBASE MESSAGING
 * ---------------------------------------------------------
 *
 * Firebase App and Messaging use the modular API.
 */
const firebaseApp = getApp();

const messaging = getMessaging(firebaseApp);


/*
 * ---------------------------------------------------------
 * BACKGROUND FCM HANDLER
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 * This must be registered at the top level, outside
 * the React component.
 *
 * Your web application sends DATA containing:
 *
 * {
 *   type: "CALLBACK_REQUEST",
 *   vehicleNo: "...",
 *   callbackNumber: "...",
 *   title: "Vehicle Callback Request",
 *   body: "Your message..."
 * }
 *
 * This handler receives that data when the app is:
 *
 * - Background
 * - Closed
 * - Not currently visible
 */
setBackgroundMessageHandler(
  messaging,
  async remoteMessage => {
    try {
      console.log(
        "Received background FCM message:",
        remoteMessage
      );


      /*
       * Make sure Notifee is ready.
       */
      await ensureNotifeeSetup();


      /*
       * FCM data payload.
       */
      const data =
        remoteMessage?.data || {};


      /*
       * Notification title.
       */
      const title =
        data.title ||
        remoteMessage?.notification?.title ||
        "Vehicle Callback Request";


      /*
       * IMPORTANT:
       * Get the actual message from data.body.
       *
       * This is the message entered on your website.
       */
      const body =
        data.body ||
        remoteMessage?.notification?.body ||
        "You have received a vehicle callback request.";


      /*
       * Callback number.
       */
      const callbackNumber =
        data.callbackNumber || "";


      /*
       * Vehicle number.
       */
      const vehicleNo =
        data.vehicleNo || "";


      /*
       * Create the visible notification.
       *
       * Notifee will show:
       *
       * Vehicle Callback Request
       *
       * Your actual message
       *
       * Vehicle: WB12AB1234
       * Call back on: 9876543210
       *
       * [📞 Call back]
       */
      await displayCallbackNotification({
        title,
        body,
        callbackNumber,
        vehicleNo
      });


      console.log(
        "Background notification displayed successfully."
      );

    } catch (error) {
      console.error(
        "Background FCM notification error:",
        error
      );
    }
  }
);


/*
 * ---------------------------------------------------------
 * START EXPO APPLICATION
 * ---------------------------------------------------------
 *
 * Keep this at the bottom of the file so the background
 * handler is registered before the application starts.
 */
registerRootComponent(App);