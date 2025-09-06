// screens/RepeatScreen.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, StatusBar } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

export default function RepeatScreen({ navigation, route }) {
  const { selected, onSelect } = route.params;
  const { isDarkMode, language } = useSettings();
  const { t } = useTranslation();

  const bgColor = isDarkMode ? "#121212" : "#f0f2f5";
  const headerColor = isDarkMode ? "#1f1f1f" : "#fff";
  const textColor = isDarkMode ? "#fff" : "#333";
  const borderColor = isDarkMode ? "#333" : "#eee";
  const activeColor = "#1E88E5";

  // options theo ngôn ngữ
  const options = language === "vi"
    ? ["Không", "Hàng ngày", "Hàng tuần", "Hàng tháng", "Hàng năm"]
    : ["None", "Daily", "Weekly", "Monthly", "Yearly"];

  const [current, setCurrent] = useState(selected || options[0]);

  const handleSelect = (item) => {
    setCurrent(item);
    if (onSelect) onSelect(item);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: activeColor }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>{t("repeat")}</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Options */}
      <FlatList
        data={options}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: borderColor, backgroundColor: headerColor }]}
            onPress={() => handleSelect(item)}
          >
            <Text style={{ color: textColor }}>{item}</Text>
            {item === current && <Text style={{ color: activeColor, fontWeight: "700" }}>✓</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 15, borderBottomWidth: 1,
  },
  back: { fontSize: 22 },
  title: { fontSize: 16, fontWeight: "bold" },
  option: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 15, borderBottomWidth: 1,
  },
});
