// screens/ManageCalendarsScreen.js – CHỌN LOẠI LỊCH TẾT 2026 SIÊU ĐẸP
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

const calendars = [
  { key: "work", color: "#e74c3c", descKey: "work_desc" },
  { key: "personal", color: "#f39c12", descKey: "personal_desc" },
  { key: "study", color: "#3498db", descKey: "study_desc" },
  { key: "family", color: "#27ae60", descKey: "family_desc" },
  { key: "health", color: "#e67e22", descKey: "health_desc" },
  { key: "travel", color: "#9b59b6", descKey: "travel_desc" },
  { key: "project", color: "#8e44ad", descKey: "project_desc" },
  { key: "social", color: "#2980b9", descKey: "social_desc" },
  { key: "finance", color: "#16a085", descKey: "finance_desc" },
  { key: "hobby", color: "#f1c40f", descKey: "hobby_desc" },
];

export default function ManageCalendarsScreen({ route, navigation }) {
  const { selected, onSelect } = route.params;
  const { t } = useTranslation();

  const renderItem = ({ item }) => {
    const isSelected = selected?.key === item.key;
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        activeOpacity={0.85}
        onPress={() => {
          onSelect(item);
          navigation.goBack();
        }}
      >
        <LinearGradient
          colors={isSelected ? ["#FFD700", "#FFA000"] : ["#fff", "#fff"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={styles.rowContent}>
          {/* Icon + Màu */}
          <View style={[styles.colorCircle, { backgroundColor: item.color, borderColor: isSelected ? "#D32F2F" : "#ccc" }]}> 
            <MaterialCommunityIcons
              name={
                item.key === "work" ? "briefcase" :
                item.key === "personal" ? "heart" :
                item.key === "study" ? "book-open-variant" :
                item.key === "family" ? "home-heart" :
                item.key === "health" ? "heart-pulse" :
                item.key === "travel" ? "airplane" :
                item.key === "project" ? "lightbulb-on" :
                item.key === "social" ? "account-group" :
                item.key === "finance" ? "wallet" :
                "star"
              }
              size={28}
              color="#fff"
            />
          </View>

          {/* Tên + Mô tả */}
          <View style={styles.textContainer}>
            <Text style={[styles.name, isSelected && styles.nameSelected]}>
              {t(item.key)}
            </Text>
            <Text style={styles.description}>
              {t(item.descKey)}
            </Text>
          </View>

          {/* Dấu check */}
          {isSelected && (
            <MaterialCommunityIcons name="check-circle" size={32} color="#D32F2F" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground source={require("../assets/bg-tet.jpg")} style={{ flex: 1 }} blurRadius={2}>
      <LinearGradient colors={["rgba(211, 47, 47, 0.95)", "rgba(255, 215, 0, 0.12)", "rgba(211, 47, 47, 0.95)"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />

          {/* Header Tết Siêu Sang */}
          <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={36} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('choose_calendar_type')}</Text>
            <MaterialCommunityIcons name="crown" size={36} color="#000" />
          </LinearGradient>

          {/* Danh sách lịch */}
          <FlatList
            data={calendars}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />

          {/* Trang trí dưới cùng */}
          <View style={styles.bottomDecor}>
            <Text style={styles.bottomText}>{t('choose_calendar_hint')}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

/* ===== STYLE TẾT 2026 SIÊU ĐẸP ===== */
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

  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  row: {
    borderRadius: 26,
    marginBottom: 18,
    overflow: "hidden",
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  rowSelected: {
    borderColor: "#FFD700",
    shadowOpacity: 0.5,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },

  colorCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
    borderWidth: 4,
  },

  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D32F2F",
  },
  nameSelected: {
    fontWeight: "900",
    textShadowColor: "rgba(255,215,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: "#cc9a00",
    marginTop: 4,
    fontStyle: "italic",
  },

  bottomDecor: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomText: {
    fontSize: 16,
    color: "#FFD700",
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "rgba(211,47,47,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
});