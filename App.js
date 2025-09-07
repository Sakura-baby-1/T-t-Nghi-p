import React, { useEffect, useState } from "react";
import { 
  View, Text, ActivityIndicator, StyleSheet, Alert, Vibration, Modal, ScrollView, TouchableOpacity 
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Audio } from "expo-av";

import { SettingsProvider, useSettings } from "./context/SettingsContext";
import "./i18n";
import { useTranslation } from "react-i18next";

// Screens
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import EventsListScreen from "./screens/EventsListScreen";
import EventsCalendarScreen from "./screens/EventsCalendarScreen";
import EventScreen from "./screens/EventScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AddEventScreen from "./screens/AddEventScreen";
import NotificationScreen from "./screens/NotificationScreen";
import RepeatScreen from "./screens/RepeatScreen";
import MultiDayScreen from "./screens/MultiDayScreen";
import ManageCalendarsScreen from "./screens/ManageCalendarsScreen";
import AIChatScreen from "./screens/AIChatScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ===== Notification handler =====
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ===== Push token =====
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Thông báo chỉ hoạt động trên thiết bị thật.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Ứng dụng cần quyền thông báo!");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Expo Push Token:", token);
  return token;
}

// ===== Modal chi tiết sự kiện =====
const EventDetailModal = ({ event, onClose }) => {
  if (!event) return null;

  const startDate = event.ngayBatDau?.toDate?.() || new Date(event.ngayBatDau);
  const endDate = event.ngayKetThuc?.toDate?.() || new Date(event.ngayKetThuc || startDate);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.detailOverlay}>
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailHeaderTitle}>Chi Tiết Sự Kiện</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 10 }}>
            <Text style={styles.detailTitle}>📌 {event.tieuDe}</Text>
            <Text style={styles.detailText}>
              🕒 {startDate.toLocaleString()} - {endDate.toLocaleString()}
            </Text>
            {event.diaDiem && <Text style={styles.detailText}>📍 {event.diaDiem}</Text>}
            {event.lich?.name && <Text style={styles.detailText}>📅 {event.lich.name}</Text>}
            {event.ghiChu && <Text style={styles.detailText}>📝 {event.ghiChu}</Text>}
            {event.url && <Text style={styles.detailText}>🔗 {event.url}</Text>}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtnModal} onPress={onClose}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ===== Main Tabs =====
function MainTabs({ setUser }) {
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: isDarkMode ? "#fff" : "#3F51B5",
        tabBarInactiveTintColor: isDarkMode ? "#aaa" : "#999",
        tabBarStyle: { paddingBottom: 5, height: 60, backgroundColor: isDarkMode ? "#111" : "#fff" },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "EventsCalendar") iconName = "calendar-outline";
          else if (route.name === "EventsList") iconName = "list-outline";
          else if (route.name === "Settings") iconName = "settings-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("home") }} />
      <Tab.Screen name="EventsCalendar" component={EventsCalendarScreen} options={{ title: t("calendar") }} />
      <Tab.Screen name="EventsList" component={EventsListScreen} options={{ title: t("events") }} />
      <Tab.Screen name="Settings" children={() => <SettingsScreen setUser={setUser} />} options={{ title: t("settings") }} />
    </Tab.Navigator>
  );
}

// ===== App Inner =====
function AppInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSound, setCurrentSound] = useState(null);
  const [vibrationInterval, setVibrationInterval] = useState(null);
  const [alarmTimeout, setAlarmTimeout] = useState(null);
  const [eventForModal, setEventForModal] = useState(null); // ✅ khai báo đây

  // play chuông + rung
  const playAlarm = async () => {
    if (currentSound) return;
    try {
      const { sound } = await Audio.Sound.createAsync(require("./assets/nhacchuong.mp3"));
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
      setCurrentSound(sound);

      const interval = setInterval(() => Vibration.vibrate(500), 1200);
      setVibrationInterval(interval);

      const timeout = setTimeout(() => stopAlarm(), 30000);
      setAlarmTimeout(timeout);
    } catch (e) {
      console.log("⚠️ Lỗi phát nhạc:", e);
    }
  };

  const stopAlarm = async () => {
    if (vibrationInterval) clearInterval(vibrationInterval);
    setVibrationInterval(null);

    if (alarmTimeout) {
      clearTimeout(alarmTimeout);
      setAlarmTimeout(null);
    }

    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      setCurrentSound(null);
    }
  };

  const handleNotification = (notification) => {
    const eventData = notification.request.content.data?.event;
    if (eventData) {
      setEventForModal(eventData);
      playAlarm();
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync();

    const sub1 = Notifications.addNotificationReceivedListener(handleNotification);
    const sub2 = Notifications.addNotificationResponseReceivedListener(handleNotification);

    return () => {
      sub1.remove();
      sub2.remove();
      stopAlarm();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#3F51B5" />
        <Text style={styles.splashText}>Đang tải ứng dụng...</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="MainTabs">{() => <MainTabs setUser={setUser} />}</Stack.Screen>
              <Stack.Screen name="EventScreen" component={EventScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="AddEvent" component={AddEventScreen} />
              <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
              <Stack.Screen name="RepeatScreen" component={RepeatScreen} />
              <Stack.Screen name="MultiDayScreen" component={MultiDayScreen} />
              <Stack.Screen name="ManageCalendarsScreen" component={ManageCalendarsScreen} />
              <Stack.Screen name="AIChat" component={AIChatScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Modal chi tiết sự kiện */}
      {eventForModal && (
        <EventDetailModal
          event={eventForModal}
          onClose={() => {
            setEventForModal(null);
            stopAlarm();
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f6f6" },
  splashText: { marginTop: 12, fontSize: 16, fontWeight: "500", color: "#3F51B5" },
  detailOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  detailContainer: { width: "85%", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", maxHeight: "80%" },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#3F51B5", padding: 12 },
  detailHeaderTitle: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  detailTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  detailText: { fontSize: 14, marginBottom: 4 },
  closeBtnModal: { backgroundColor: "#3F51B5", padding: 12, alignItems: "center" },
});