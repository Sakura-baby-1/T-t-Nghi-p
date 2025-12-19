import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Image, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { Ionicons } from "@expo/vector-icons";

import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { EventsProvider } from "./context/EventsContext";
import "./i18n";
import { useTranslation } from "react-i18next";

// Import performance config để tắt console logs trong production
import "./utils/performanceConfig";

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
import SyncTKBScreen from "./SyncTKBScreen";
import StatisticsScreen from "./screens/StatisticsScreen";
import EditEventScreen from "./screens/EditEventScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ReportScreen from "./screens/ReportScreen";

import { useNotifications, EventDetailModal } from "./notifications";

import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#4CAF50", backgroundColor: "#E8F5E9" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: "bold", color: "#2E7D32" }}
      text2Style={{ fontSize: 14, color: "#388E3C" }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: "#E53935", backgroundColor: "#FFEBEE" }}
      text1Style={{ fontSize: 16, fontWeight: "bold", color: "#C62828" }}
      text2Style={{ fontSize: 14, color: "#B71C1C" }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#2196F3", backgroundColor: "#E3F2FD" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 16, fontWeight: "bold", color: "#1565C0" }}
      text2Style={{ fontSize: 14, color: "#0D47A1" }}
    />
  ),
};

// Stack & Tab
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const SettingsStack = createNativeStackNavigator();

// ===== Main Tabs =====
function MainTabs({ setUser }) {
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();

  // Stack inside Settings tab to keep bottom tab visible when navigating to Profile
  const SettingsStackScreen = () => (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome">
        {() => <SettingsScreen setUser={setUser} />}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="Profile" component={ProfileScreen} />
    </SettingsStack.Navigator>
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: isDarkMode ? "#FFD700" : "#D32F2F",
        tabBarInactiveTintColor: isDarkMode ? "#aaa" : "#999",
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
          backgroundColor: isDarkMode ? "#111" : "#fff",
          borderTopColor: "#FFD700",
          borderTopWidth: 2,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case "Home":
              iconName = "home";
              break;
            case "EventsCalendar":
              iconName = "calendar";
              break;
            case "EventsList":
              iconName = "list";
              break;
            case "Settings":
              iconName = "settings";
              break;
            default:
              iconName = "ellipse-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("MainTabs") }} />
      <Tab.Screen name="EventsCalendar" component={EventsCalendarScreen} options={{ title: t("calendar") }} />
      <Tab.Screen name="EventsList" component={EventsListScreen} options={{ title: t("events") }} />
      <Tab.Screen
        name="Settings"
        component={SettingsStackScreen}
        options={{ title: t("settings") }}
      />
    </Tab.Navigator>
  );
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { eventForModal, closeModal } = useNotifications();
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();

  // navigation theme based on dark mode
  const navTheme = React.useMemo(() => {
    return {
      dark: !!isDarkMode,
      colors: {
        primary: isDarkMode ? '#FFD700' : '#D32F2F',
        background: isDarkMode ? '#0b1220' : '#ffffff',
        card: isDarkMode ? '#0f1724' : '#ffffff',
        text: isDarkMode ? '#E6E7F2' : '#111',
        border: isDarkMode ? '#222' : '#e6e6e6',
        notification: isDarkMode ? '#FFD700' : '#D32F2F',
      },
      // Provide a safe fonts fallback so libraries that expect theme.fonts.regular
      // don't crash if a fonts object wasn't provided elsewhere.
      fonts: {
        regular: 'System',
        medium: 'System',
        light: 'System',
        thin: 'System',
      },
    };
  }, [isDarkMode]);

  // expose the same fonts fallback globally to catch any other callers
  React.useEffect(() => {
    try {
      global.APP_FONTS = navTheme.fonts;
    } catch (e) {
      // ignore; defensive only
    }
  }, [navTheme]);

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
        <Image source={require("./assets/tdmu.png")} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
        <Text style={styles.splashText}>Chào mừng năm mới 2026</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // ĐÃ ĐĂNG NHẬP → VÀO THẲNG MainTabs (có Home bên trong)
            <>
              <Stack.Screen name="MainTabs">
                {() => <MainTabs setUser={setUser} />}
              </Stack.Screen>
              <Stack.Screen name="EventScreen" component={EventScreen} />
              {/* Profile nằm trong SettingsStack để giữ thanh tab dưới */}
              <Stack.Screen name="AddEvent" component={AddEventScreen} />
              <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
              <Stack.Screen name="RepeatScreen" component={RepeatScreen} />
              <Stack.Screen name="MultiDayScreen" component={MultiDayScreen} />
              <Stack.Screen name="ManageCalendarsScreen" component={ManageCalendarsScreen} />
              <Stack.Screen name="AIChat" component={AIChatScreen} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Statistics" component={StatisticsScreen} />
              <Stack.Screen name="Report" component={ReportScreen} />
              <Stack.Screen name="SyncTKB" component={SyncTKBScreen} />
              <Stack.Screen name="EditEventScreen" component={EditEventScreen} />

            </>
          ) : (
            // CHƯA ĐĂNG NHẬP → HIỆN LOGIN + REGISTER
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {eventForModal && <EventDetailModal event={eventForModal} onClose={closeModal} />}
      <Toast config={toastConfig} />
    </>
  );
}

// ===== App =====
export default function App() {
  return (
    <SettingsProvider>
      <EventsProvider>
        <AppInner />
      </EventsProvider>
    </SettingsProvider>
  );
}

// ===== Styles Tết 2026 =====
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D32F2F",
  },
  splashText: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: "#FFD700",
  },
});