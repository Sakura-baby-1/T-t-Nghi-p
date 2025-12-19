// screens/MultiDaysScreen.js – Giao diện Hoàng Gia Tết 2026
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  ImageBackground,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";

export default function MultiDaysScreen({ navigation, route }) {
  const { selectedDates = [], onSelect } = route.params;
  const { isDarkMode, language } = useSettings();
  const { t } = useTranslation();
  const { palette } = useTheme();

  // Theme derived from central palette
  const theme = {
    background: palette?.background || (isDarkMode ? "#121212" : "#f2f2f2"),
    card: palette?.card || (isDarkMode ? "rgba(43,58,77,0.8)" : "rgba(255,255,255,0.8)"),
    text: palette?.text || (isDarkMode ? "#fff" : "#333"),
    textSecondary: palette?.textSecondary || (isDarkMode ? "#ccc" : "#555"),
    border: palette?.accent || "#FFD700",
    doneBtn: palette?.accent || "#FFD700",
    todayBg: palette?.todayBg || (isDarkMode ? "#bb86fc" : "#ffe082"),
    todayText: palette?.todayText || "#E91E63",
    gradient: [palette?.accent || "#FFD700", palette?.primary || "#FFA000"],
    shadow: "#000",
  };

  const initialMarked = selectedDates.reduce((acc, d) => {
    const dateStr = d.toISOString().split("T")[0];
    acc[dateStr] = { selected: true, selectedColor: theme.doneBtn };
    return acc;
  }, {});
  const [markedDates, setMarkedDates] = useState(initialMarked);

  const toggleDate = (day) => {
    const date = day.dateString;
    const newMarked = { ...markedDates };
    if (newMarked[date]) delete newMarked[date];
    else newMarked[date] = { selected: true, selectedColor: theme.doneBtn };
    setMarkedDates(newMarked);
  };

  const handleDone = () => {
    const selected = Object.keys(markedDates)
      .map(d => {
        const dt = new Date(d + "T00:00:00");
        const offset = 7 * 60;
        return new Date(dt.getTime() + offset * 60000);
      })
      .sort((a, b) => a - b);

    if (onSelect) onSelect(selected);
    navigation.goBack();
  };

  return (
    <ImageBackground
      source={require("../assets/bg-tet.jpg")}
      style={{ flex: 1 }}
      blurRadius={3}
    >
      <LinearGradient colors={["rgba(211,47,47,0.98)", "rgba(255,215,0,0.15)", "rgba(211,47,47,0.98)"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

          {/* Header Hoàng Gia */}
          <LinearGradient colors={[theme.gradient[0], theme.gradient[1]]} style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={36} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t("selectMultipleDays", { defaultValue: "CHỌN NGÀY" })}</Text>
            <MaterialCommunityIcons name="crown" size={36} color="#000" />
          </LinearGradient>

          {/* Calendar card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Calendar
              markingType="multi-dot"
              markedDates={markedDates}
              onDayPress={toggleDate}
              theme={{
                selectedDayBackgroundColor: theme.doneBtn,
                todayBackgroundColor: theme.todayBg,
                todayTextColor: theme.todayText,
                arrowColor: theme.doneBtn,
                monthTextColor: theme.text,
                textDayFontWeight: "500",
                textMonthFontWeight: "600",
                dayTextColor: theme.text,
              }}
              style={{ borderRadius: 20 }}
            />
          </View>

          {/* Nút Xong Hoàng Gia */}
          <TouchableOpacity style={styles.doneBtnContainer} onPress={handleDone}>
            <LinearGradient
              colors={theme.gradient}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.doneBtnGradient}
            >
              <MaterialCommunityIcons name="crown" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.doneText}>{t("done") || "Xong"}</Text>
            </LinearGradient>
          </TouchableOpacity>

        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 30,
  },
  backButton: {
    width: 36,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
    flex: 1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  card: {
    margin: 20,
    borderRadius: 28,
    borderWidth: 3,
    padding: 12,
    elevation: 20,
  },
  doneBtnContainer: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === "ios" ? 30 : 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 30,
  },
  doneText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
});
