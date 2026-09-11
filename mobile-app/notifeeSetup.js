import notifee, {
  AndroidImportance,
  EventType
} from "@notifee/react-native";
import { Linking, Platform } from "react-native";

const CHANNEL_ID = "vehicle-callback";

/**
 * Create notification channel / categories.
 */
export async function ensureNotifeeSetup() {
  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: "Callback requests",
      description: "Vehicle owner callback requests",
      importance: AndroidImportance.HIGH,
      sound: "default",
      vibration: true
    });
  }

  if (Platform.OS === "ios") {
    await notifee.setNotificationCategories([
      {
        id: "callback",
        actions: [
          {
            id: "call",
            title: "Call back"
          }
        ]
      }
    ]);
  }
}


/**
 * Display a vehicle callback notification.
 *
 * The notification body contains the actual message sent
 * from the website, plus the callback number.
 */
export async function displayCallbackNotification({
  title,
  body,
  callbackNumber,
  vehicleNo
}) {
  await ensureNotifeeSetup();

  const safeTitle =
    title || "Vehicle Callback Request";

  const safeBody =
    body || "You have received a vehicle callback request.";

  const safeCallbackNumber =
    callbackNumber || "";

  const safeVehicleNo =
    vehicleNo || "";


  /*
   * Build the complete notification message.
   *
   * Example:
   *
   * Please call me regarding your vehicle.
   *
   * Vehicle: WB12AB1234
   * Call back on: 9876543210
   */
  let notificationBody = safeBody;

  // If callback number is not already included in the body,
  // add it automatically.
  if (
    safeCallbackNumber &&
    !safeBody.includes(safeCallbackNumber)
  ) {
    notificationBody +=
      `\n\nVehicle: ${safeVehicleNo || "Not specified"}` +
      `\nCall back on: ${safeCallbackNumber}`;
  }


  /*
   * Android notification
   */
  const androidNotification = {
    channelId: CHANNEL_ID,

    importance: AndroidImportance.HIGH,

    pressAction: {
      id: "default"
    },

    /*
     * Keep the complete message visible.
     */
    style: {
      type: "BIGTEXT",
      text: notificationBody
    },

    /*
     * Show Call back button only when
     * a callback number exists.
     */
    actions: safeCallbackNumber
      ? [
          {
            title: "📞 Call back",
            pressAction: {
              id: "call"
            }
          }
        ]
      : []
  };


  /*
   * iOS notification
   */
  const iosNotification = {
    categoryId:
      safeCallbackNumber
        ? "callback"
        : undefined
  };


  await notifee.displayNotification({
    title: safeTitle,

    body: notificationBody,

    data: {
      type: "CALLBACK_REQUEST",

      callbackNumber: safeCallbackNumber,

      vehicleNo: safeVehicleNo,

      message: safeBody
    },

    android: androidNotification,

    ios: iosNotification
  });
}


/**
 * Handle notification actions.
 *
 * "Call back" button opens the phone dialer.
 */
export async function handleNotificationEvent({
  type,
  detail
}) {
  /*
   * User pressed the "Call back" action.
   */
  if (
    type === EventType.ACTION_PRESS &&
    detail.pressAction?.id === "call"
  ) {
    const number =
      detail.notification?.data?.callbackNumber;

    if (number) {
      try {
        await Linking.openURL(`tel:${number}`);
      } catch (error) {
        console.log(
          "Could not open phone dialer:",
          error
        );
      }
    }

    return;
  }


  /*
   * User tapped the notification itself.
   *
   * The application will open normally.
   */
  if (
    type === EventType.PRESS
  ) {
    const number =
      detail.notification?.data?.callbackNumber;

    const vehicle =
      detail.notification?.data?.vehicleNo;

    console.log(
      "Callback notification opened",
      {
        vehicle,
        callbackNumber: number
      }
    );
  }
}