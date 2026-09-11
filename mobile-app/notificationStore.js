import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "vehicleCallbackNotifications";

export async function getNotifications() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addNotification(record) {
  const list = await getNotifications();
  list.unshift(record);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 300)));
  return list.slice(0, 300);
}

export async function deleteNotification(id) {
  const list = await getNotifications();
  const next = list.filter(n => n.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearNotifications() {
  await AsyncStorage.removeItem(KEY);
  return [];
}
