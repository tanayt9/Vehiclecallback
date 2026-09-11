import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "registeredVehicleInfo";

export async function getRegisteredVehicle() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveRegisteredVehicle(info) {
  await AsyncStorage.setItem(KEY, JSON.stringify(info));
}
