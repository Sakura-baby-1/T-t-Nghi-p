// screens/SettingsScreen.js
import React from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

export default function SettingsScreen({ setUser }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isDarkMode, setIsDarkMode, isNotify, setIsNotify, language, setLanguage } = useSettings();

  const handleLogout = () => {
    Alert.alert(
      t("logout"),
      t("confirmLogout"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("logout"),
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              setUser(null);
            } catch (error) {
              Alert.alert(t("error"), error.message);
            }
          },
        },
      ]
    );
  };

  const toggleLanguage = () => setLanguage(language === "vi" ? "en" : "vi");

  const items = [
    {
      icon: "person-circle-outline",
      label: t("profile"),
      color: "#4a90e2",
      onPress: () => navigation.navigate("Profile"),
    },
    {
      icon: "notifications-outline",
      label: t("notify"),
      color: "#f39c12",
      right: <Switch value={isNotify} onValueChange={setIsNotify} thumbColor={isNotify ? "#f39c12" : "#ccc"} trackColor={{ true: "#fcd38c", false: "#555" }} />,
    },
    {
      icon: "moon-outline",
      label: t("darkMode"),
      color: "#8e44ad",
      right: <Switch value={isDarkMode} onValueChange={setIsDarkMode} thumbColor={isDarkMode ? "#f1c40f" : "#ccc"} trackColor={{ true: "#f7dc6f", false: "#555" }} />,
    },
    {
      icon: "language-outline",
      label: `${t("language")}: ${language === "vi" ? "Tiếng Việt" : "English"}`,
      color: "#27ae60",
      onPress: toggleLanguage,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? "#121212" : "#f0f2f5" }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={[styles.header, { color: isDarkMode ? "#fff" : "#2c3e50" }]}>{t("settings")}</Text>

        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.item, { backgroundColor: isDarkMode ? "#1f1f1f" : "#fff" }]}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <Ionicons name={item.icon} size={26} color={item.color} />
            <Text style={[styles.text, { color: isDarkMode ? "#fff" : "#2c3e50" }]}>{item.label}</Text>
            {item.right && <View>{item.right}</View>}
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <LinearGradient
          colors={["#ff6b6b", "#e74c3c"]}
          start={[0, 0]}
          end={[1, 0]}
          style={styles.logoutContainer}
        >
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutText}>{t("logout")}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 24 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  text: { flex: 1, marginLeft: 14, fontSize: 17, fontWeight: "500" },
  logoutContainer: {
    marginTop: 30,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 8,
  },
});
