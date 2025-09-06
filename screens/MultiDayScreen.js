// screens/MultiDaysScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

export default function MultiDaysScreen({ navigation, route }) {
  const { selectedDates = [], onSelect } = route.params;
  const { isDarkMode } = useSettings();
  const { t, i18n } = useTranslation();

  const bgColor = isDarkMode ? "#121212" : "#f0f2f5";
  const infoColor = isDarkMode ? "#aaa" : "#555";
  const doneBtnColor = "#1E88E5";
  const calendarBg = isDarkMode ? "#1f1f1f" : "#fff";
  const textColor = isDarkMode ? "#fff" : "#333";

  // Chuyển selectedDates từ Date[] sang object cho Calendar
  const initialMarked = selectedDates.reduce((acc, d) => {
    const dateStr = d.toISOString().split("T")[0];
    acc[dateStr] = { selected: true, selectedColor: doneBtnColor };
    return acc;
  }, {});

  const [markedDates, setMarkedDates] = useState(initialMarked);

  const toggleDate = (day) => {
    const date = day.dateString;
    const newMarked = { ...markedDates };
    if (newMarked[date]) delete newMarked[date];
    else newMarked[date] = { selected: true, selectedColor: doneBtnColor };
    setMarkedDates(newMarked);
  };

  const handleDone = () => {
    const selected = Object.keys(markedDates).map(d => new Date(d));
    if (onSelect) onSelect(selected);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
      />

      <Text style={[styles.info, { color: infoColor }]}>
        {t("selectMultipleDays") || "Chọn nhiều ngày"}
      </Text>

      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={toggleDate}
        theme={{
          selectedDayBackgroundColor: doneBtnColor,
          todayBackgroundColor: isDarkMode ? "#bb86fc" : "#ffe082",
          todayTextColor: "#E91E63",
          arrowColor: doneBtnColor,
          monthTextColor: textColor,
          textDayFontWeight: "500",
          textMonthFontWeight: "600",
          dayTextColor: textColor,
        }}
        style={[styles.calendar, { backgroundColor: calendarBg, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }]}
      />

      <TouchableOpacity style={styles.doneBtnContainer} onPress={handleDone}>
        <LinearGradient
          colors={["#4facfe", "#1E88E5"]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.doneBtnGradient}
        >
          <Text style={styles.doneText}>{t("done") || "Xong"}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  info: { padding: 15, fontSize: 14, textAlign: "center" },
  calendar: { marginHorizontal: 15, borderRadius: 10, marginBottom: 20 },
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
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  doneText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
});
