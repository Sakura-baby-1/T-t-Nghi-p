import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";

export default function NotificationScreen({ navigation, route }) {
  const { selected, onSelect } = route.params;
  const { isDarkMode } = useSettings();

  // ===== Các tùy chọn nhắc nhở =====
  const options = [
    { label: "Không", value: "none" },
    { label: "1 phút trước", value: "1m" },
    { label: "5 phút trước", value: "5m" },
    { label: "10 phút trước", value: "10m" },
    { label: "30 phút trước", value: "30m" },
    { label: "1 giờ trước", value: "1h" },
    { label: "2 giờ trước", value: "2h" },
    { label: "1 ngày trước", value: "1d" },
    { label: "Tùy chọn giờ", value: "custom" },
  ];

  const handleSelect = (option) => {
    if (option.value === "custom") {
      Alert.prompt(
        "Nhắc nhở tùy chỉnh",
        "Nhập số phút trước sự kiện:",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "OK",
            onPress: (input) => {
              const minutes = parseInt(input);
              if (!isNaN(minutes) && minutes > 0) {
                onSelect(`${minutes}m`);
                navigation.goBack();
              } else Alert.alert("Lỗi", "Nhập số phút hợp lệ!");
            },
          },
        ],
        "plain-text",
        "5"
      );
    } else {
      onSelect(option.value);
      navigation.goBack();
    }
  };

  const bgColor = isDarkMode ? "#0f1720" : "#f7fbff";
  const textColor = isDarkMode ? "#fff" : "#222";
  const cardColor = isDarkMode ? "#1e293b" : "#fff";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <View style={{ padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: isDarkMode ? "#1e293b" : "#4facfe" }}>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600" }}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Chọn thời gian nhắc</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={options}
        keyExtractor={(item) => item.value}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, elevation: 2, backgroundColor: cardColor }}
            onPress={() => handleSelect(item)}
          >
            <Text style={{ fontSize: 16, color: item.value === selected ? "#1E88E5" : textColor, fontWeight: item.value === selected ? "700" : "400" }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}
