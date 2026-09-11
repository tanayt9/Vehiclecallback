import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Linking,
  Platform,
  Share,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import * as Device from "expo-device";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";

import {
  AuthorizationStatus,
  requestPermission,
  registerDeviceForRemoteMessages,
  getToken,
  deleteToken,
  onMessage,
  onTokenRefresh
} from "@react-native-firebase/messaging";

import notifee from "@notifee/react-native";
import { fcm } from "./firebaseMessaging";

import {
  getNotifications,
  addNotification,
  deleteNotification,
  clearNotifications
} from "./notificationStore";

import {
  getRegisteredVehicle,
  saveRegisteredVehicle
} from "./registeredVehicleStore";

import {
  ensureNotifeeSetup,
  displayCallbackNotification,
  handleNotificationEvent
} from "./notifeeSetup";

// Admin email where registration / regeneration requests are sent.
const ADMIN_EMAIL = "foodie.cob@gmail.com";


async function ensurePermission() {
  if (!Device.isDevice) {
    throw Error(
      "Use a physical Android/iPhone device for push notifications."
    );
  }

  // Android 13+
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const { PermissionsAndroid } = require("react-native");

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw Error("Notification permission was not granted.");
    }
  }

  const authStatus = await requestPermission(fcm);

  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    throw Error("Notification permission was not granted.");
  }

  await registerDeviceForRemoteMessages(fcm);

  await ensureNotifeeSetup();
}


function buildMailUrl({
  vehicleNo,
  ownerName,
  mobile,
  token,
  reason
}) {
  const subject = encodeURIComponent(
    `Vehicle Callback - ${reason} - ${vehicleNo || "unknown vehicle"}`
  );

  const bodyLines = [
    `Request type: ${reason}`,
    ``,
    `Vehicle number: ${vehicleNo || "(not entered)"}`,
    `Owner name: ${ownerName || "(not entered)"}`,
    `Owner mobile: ${mobile || "(not entered)"}`,
    ``,
    `FCM device token:`,
    token || "(token unavailable)",
    ``,
    `Please update vehicles.json with this token for the vehicle above.`
  ];

  const body = encodeURIComponent(bodyLines.join("\n"));

  return `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;
}


export default function App() {
  const [token, setToken] = useState("");

  const [vehicleNo, setVehicleNo] = useState("");

  const [ownerName, setOwnerName] = useState("");

  const [mobile, setMobile] = useState("");

  const [status, setStatus] = useState("Ready to register");

  const [busy, setBusy] = useState(false);

  const [copied, setCopied] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const [registeredInfo, setRegisteredInfo] = useState(null);

  const unsubForeground = useRef(null);

  const unsubForegroundEvent = useRef(null);

  const unsubTokenRefresh = useRef(null);

  const appState = useRef(AppState.currentState);


  const reload = useCallback(async () => {
    const items = await getNotifications();

    setNotifications(items);
  }, []);


  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await ensureNotifeeSetup();

        const saved = await getRegisteredVehicle();

        if (saved && mounted) {
          setRegisteredInfo(saved);

          setVehicleNo(saved.vehicleNo || "");

          setOwnerName(saved.ownerName || "");

          setMobile(saved.mobile || "");

          setToken(saved.token || "");
        }
      } catch (e) {
        console.log("Startup error:", e);
      }
    })();

    reload();


    /*
     * FOREGROUND FCM MESSAGE
     *
     * Firebase sends:
     *
     * data.title
     * data.body
     * data.callbackNumber
     * data.vehicleNo
     *
     * We store the complete message and then display it through Notifee.
     */
    unsubForeground.current = onMessage(
      fcm,
      async remoteMessage => {
        try {
          const data = remoteMessage?.data || {};

          const title =
            data.title ||
            remoteMessage?.notification?.title ||
            "Vehicle Callback Request";

          const body =
            data.body ||
            remoteMessage?.notification?.body ||
            "You have received a vehicle callback request.";

          const callbackNumber =
            data.callbackNumber || "";

          const receivedVehicleNo =
            data.vehicleNo || "";


          // Save complete notification locally.
          await addNotification({
            id:
              String(Date.now()) +
              Math.random().toString(36).slice(2),

            title,

            body,

            data: {
              ...data,
              callbackNumber,
              vehicleNo: receivedVehicleNo
            },

            time: new Date().toISOString()
          });


          // Display the complete notification.
          await displayCallbackNotification({
            title,
            body,
            callbackNumber,
            vehicleNo: receivedVehicleNo
          });


          await reload();
        } catch (e) {
          console.log("Foreground notification error:", e);
        }
      }
    );


    // Notification button / notification press events.
    unsubForegroundEvent.current =
      notifee.onForegroundEvent(handleNotificationEvent);


    // FCM token automatically changed.
    unsubTokenRefresh.current =
      onTokenRefresh(fcm, newToken => {
        setToken(newToken);

        setStatus(
          "Token refreshed automatically. Tap Regenerate to notify the admin of the new token."
        );
      });


    const sub = AppState.addEventListener(
      "change",
      next => {
        if (
          appState.current.match(/inactive|background/) &&
          next === "active"
        ) {
          reload();
        }

        appState.current = next;
      }
    );


    return () => {
      mounted = false;

      unsubForeground.current?.();

      unsubForegroundEvent.current?.();

      unsubTokenRefresh.current?.();

      sub.remove();
    };
  }, [reload]);


  /*
   * REGISTER / REGENERATE DEVICE
   */
  const doRegister = async reason => {
    if (
      !vehicleNo.trim() ||
      !ownerName.trim() ||
      !mobile.trim()
    ) {
      Alert.alert(
        "Missing details",
        "Please fill in vehicle number, owner name and mobile number first."
      );

      return;
    }


    setBusy(true);


    try {
      setStatus("Requesting notification permission...");

      await ensurePermission();


      /*
       * If this is a reinstall/new-device request,
       * delete the previous token first.
       */
      if (reason === "Reinstall / new device") {
        try {
          await deleteToken(fcm);
        } catch (e) {
          console.log("Old token deletion skipped:", e);
        }
      }


      setStatus("Fetching device token...");

      const t = await getToken(fcm);


      if (!t) {
        throw Error(
          "Firebase did not return a device token."
        );
      }


      setToken(t);


      const info = {
        vehicleNo: vehicleNo.trim(),

        ownerName: ownerName.trim(),

        mobile: mobile.trim(),

        token: t,

        registeredAt: new Date().toISOString()
      };


      await saveRegisteredVehicle(info);

      setRegisteredInfo(info);


      /*
       * Open email to:
       * foodie.cob@gmail.com
       */
      const mailUrl = buildMailUrl({
        vehicleNo,
        ownerName,
        mobile,
        token: t,
        reason
      });


      const canOpen =
        await Linking.canOpenURL(mailUrl);


      if (!canOpen) {
        throw Error(
          "No email app is available on this device to send the request."
        );
      }


      await Linking.openURL(mailUrl);


      setStatus(
        `${reason} request opened in your mail app. Send the email to complete the request.`
      );
    } catch (e) {
      setStatus(
        e?.message ||
        "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  };


  /*
   * COPY TOKEN
   */
  const onCopyToken = async () => {
    if (!token) return;

    await Clipboard.setStringAsync(token);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };


  /*
   * SHARE TOKEN
   *
   * This uses the phone's share sheet.
   * For direct email to foodie.cob@gmail.com,
   * use the "Email token to admin" button below.
   */
  const onShareToken = async () => {
    if (!token) return;

    try {
      await Share.share({
        message:
          `Vehicle Callback Device Registration\n\n` +
          `Vehicle Number: ${vehicleNo}\n` +
          `Owner Name: ${ownerName}\n` +
          `Owner Mobile: ${mobile}\n` +
          `FCM Device Token:\n${token}`
      });
    } catch (e) {
      console.log("Share cancelled/error:", e);
    }
  };


  /*
   * DIRECT EMAIL
   */
  const onEmailToken = async () => {
    if (!token) {
      Alert.alert(
        "Token unavailable",
        "Register the notification device first."
      );

      return;
    }


    try {
      const mailUrl = buildMailUrl({
        vehicleNo,
        ownerName,
        mobile,
        token,
        reason: "Device token update"
      });


      const canOpen =
        await Linking.canOpenURL(mailUrl);


      if (!canOpen) {
        throw Error(
          "No email app is available on this device."
        );
      }


      await Linking.openURL(mailUrl);
    } catch (e) {
      Alert.alert(
        "Email error",
        e?.message || "Could not open email."
      );
    }
  };


  /*
   * DELETE ONE NOTIFICATION
   */
  const onDelete = async id => {
    const updated =
      await deleteNotification(id);

    setNotifications(updated);
  };


  /*
   * CLEAR NOTIFICATION HISTORY
   */
  const onClearAll = () => {
    Alert.alert(
      "Clear all notifications?",
      "This removes them from this device only.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },

        {
          text: "Clear all",
          style: "destructive",

          onPress: async () => {
            const updated =
              await clearNotifications();

            setNotifications(updated);
          }
        }
      ]
    );
  };


  return (
    <SafeAreaView style={st.safe}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={st.c}
      >

        <Text style={st.eyebrow}>
          Vehicle Callback
        </Text>

        <Text style={st.title}>
          Owner notification device
        </Text>

        <Text style={st.sub}>
          Register this phone against a vehicle so
          callback requests can arrive here via
          Firebase Cloud Messaging.
        </Text>


        {registeredInfo && (
          <View style={st.currentCard}>

            <Text style={st.currentTitle}>
              Currently registered
            </Text>

            <Text style={st.currentRow}>
              <Text style={st.currentLabel}>
                Vehicle:{" "}
              </Text>
              {registeredInfo.vehicleNo}
            </Text>

            <Text style={st.currentRow}>
              <Text style={st.currentLabel}>
                Owner:{" "}
              </Text>
              {registeredInfo.ownerName}
            </Text>

            <Text style={st.currentRow}>
              <Text style={st.currentLabel}>
                Mobile:{" "}
              </Text>
              {registeredInfo.mobile}
            </Text>

            <Text style={st.currentRow}>
              <Text style={st.currentLabel}>
                Since:{" "}
              </Text>
              {new Date(
                registeredInfo.registeredAt
              ).toLocaleString()}
            </Text>

          </View>
        )}


        <Text style={st.label}>
          Vehicle Number
        </Text>

        <TextInput
          style={st.input}
          value={vehicleNo}
          onChangeText={setVehicleNo}
          autoCapitalize="characters"
          placeholder="WB12AB1234"
        />


        <Text style={st.label}>
          Owner Name
        </Text>

        <TextInput
          style={st.input}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Owner's full name"
        />


        <Text style={st.label}>
          Owner Mobile Number
        </Text>

        <TextInput
          style={st.input}
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          placeholder="9876543210"
        />


        <TouchableOpacity
          style={st.btn}
          disabled={busy}
          onPress={() =>
            doRegister("New device registration")
          }
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={st.btnText}>
              Register notification device
            </Text>
          )}
        </TouchableOpacity>


        <TouchableOpacity
          style={st.regen}
          disabled={busy}
          onPress={() =>
            doRegister("Reinstall / new device")
          }
        >
          <Text style={st.regenText}>
            ↻ Regenerate (reinstalled / new device)
          </Text>
        </TouchableOpacity>


        <Text style={st.hint}>
          Use Regenerate after reinstalling the app
          or setting it up on a different phone.
          It gets a fresh Firebase token and opens
          an email to the admin.
        </Text>


        <Text style={st.label}>
          Status
        </Text>

        <View style={st.box}>
          <Text>{status}</Text>
        </View>


        <Text style={st.label}>
          FCM Device Token
        </Text>

        <Text
          selectable
          style={st.token}
        >
          {token ||
            "Your token will appear here."}
        </Text>


        {!!token && (
          <>
            <View style={st.tokenActions}>

              <TouchableOpacity
                style={st.tokenBtn}
                onPress={onCopyToken}
              >
                <Text style={st.tokenBtnText}>
                  {copied ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  st.tokenBtn,
                  st.shareBtn
                ]}
                onPress={onShareToken}
              >
                <Text
                  style={[
                    st.tokenBtnText,
                    st.shareBtnText
                  ]}
                >
                  Share
                </Text>
              </TouchableOpacity>

            </View>


            <TouchableOpacity
              style={st.emailBtn}
              onPress={onEmailToken}
            >
              <Text style={st.emailBtnText}>
                Email registration to foodie.cob@gmail.com
              </Text>
            </TouchableOpacity>
          </>
        )}


        <View style={st.info}>

          <Text style={st.infoTitle}>
            Important - Expo Go will not work here
          </Text>

          <Text style={st.infoText}>
            This app uses the real Firebase Messaging
            SDK plus Notifee for actionable
            notifications, so it needs a custom
            development client or a built APK.
            {"\n\n"}

            npx expo install expo-dev-client
            {"\n"}

            eas build --profile development --platform android
          </Text>

        </View>


        <View style={st.historyHead}>

          <Text style={st.title2}>
            Notification history
          </Text>

          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={onClearAll}
            >
              <Text style={st.clearAll}>
                Clear all
              </Text>
            </TouchableOpacity>
          )}

        </View>


        <Text style={st.sub2}>
          Stored only on this device.
        </Text>


        {notifications.length === 0 ? (

          <View style={st.empty}>
            <Text
              style={{
                color: "#64748b"
              }}
            >
              No notifications received yet.
            </Text>
          </View>

        ) : (

          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            scrollEnabled={false}

            renderItem={({ item }) => (
              <View style={st.item}>

                <View style={{ flex: 1 }}>

                  <Text style={st.itemTitle}>
                    {item.title}
                  </Text>


                  {!!item.body && (
                    <Text style={st.itemBody}>
                      {item.body}
                    </Text>
                  )}


                  {!!item.data?.vehicleNo && (
                    <Text style={st.vehicleInfo}>
                      Vehicle:{" "}
                      {item.data.vehicleNo}
                    </Text>
                  )}


                  {!!item.data?.callbackNumber && (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          `tel:${item.data.callbackNumber}`
                        )
                      }
                    >
                      <Text style={st.callLink}>
                        📞 Call{" "}
                        {item.data.callbackNumber}
                      </Text>
                    </TouchableOpacity>
                  )}


                  <Text style={st.itemTime}>
                    {new Date(
                      item.time
                    ).toLocaleString()}
                  </Text>

                </View>


                <TouchableOpacity
                  onPress={() =>
                    onDelete(item.id)
                  }
                  style={st.delBtn}
                >
                  <Text style={st.delText}>
                    Delete
                  </Text>
                </TouchableOpacity>

              </View>
            )}
          />

        )}

      </ScrollView>
    </SafeAreaView>
  );
}


const st = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: "#f4f7fb"
  },

  c: {
    padding: 24,
    paddingBottom: 50
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#3157d5",
    marginTop: 10
  },

  title: {
    fontSize: 30,
    fontWeight: "850",
    color: "#0f172a",
    marginTop: 8
  },

  title2: {
    fontSize: 22,
    fontWeight: "850",
    color: "#0f172a"
  },

  sub: {
    fontSize: 15,
    lineHeight: 23,
    color: "#64748b",
    marginTop: 7,
    marginBottom: 10
  },

  sub2: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 14
  },

  currentCard: {
    backgroundColor: "#ecfdf3",
    borderRadius: 14,
    padding: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0"
  },

  currentTitle: {
    fontWeight: "850",
    color: "#067647",
    marginBottom: 6
  },

  currentRow: {
    color: "#166534",
    marginTop: 2
  },

  currentLabel: {
    fontWeight: "800"
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 17,
    marginBottom: 7,
    color: "#1e293b"
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cfd7e3",
    borderRadius: 12,
    padding: 14,
    fontSize: 16
  },

  btn: {
    backgroundColor: "#3157d5",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 19
  },

  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15
  },

  regen: {
    borderWidth: 1.5,
    borderColor: "#3157d5",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12
  },

  regenText: {
    color: "#3157d5",
    fontWeight: "800"
  },

  hint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
    lineHeight: 17
  },

  box: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12
  },

  token: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    lineHeight: 20
  },

  tokenActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
  },

  tokenBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#3157d5",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center"
  },

  tokenBtnText: {
    color: "#3157d5",
    fontWeight: "800"
  },

  shareBtn: {
    backgroundColor: "#3157d5"
  },

  shareBtnText: {
    color: "#fff"
  },

  emailBtn: {
    backgroundColor: "#067647",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 10
  },

  emailBtnText: {
    color: "#fff",
    fontWeight: "800"
  },

  info: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginTop: 20
  },

  infoTitle: {
    fontWeight: "800",
    fontSize: 17
  },

  infoText: {
    color: "#64748b",
    lineHeight: 23,
    marginTop: 7
  },

  historyHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30
  },

  clearAll: {
    color: "#b42318",
    fontWeight: "800"
  },

  empty: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 22,
    alignItems: "center"
  },

  item: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10
  },

  itemTitle: {
    fontWeight: "800",
    fontSize: 15,
    color: "#0f172a"
  },

  itemBody: {
    color: "#334155",
    marginTop: 5,
    lineHeight: 21
  },

  vehicleInfo: {
    color: "#475569",
    fontWeight: "700",
    marginTop: 7
  },

  callLink: {
    color: "#067647",
    fontWeight: "800",
    marginTop: 7
  },

  itemTime: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 5
  },

  delBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fff1f0",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9
  },

  delText: {
    color: "#b42318",
    fontWeight: "800",
    fontSize: 12
  }

});
