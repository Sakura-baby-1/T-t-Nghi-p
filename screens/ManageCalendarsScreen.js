// screens/ManageCalendarsScreen.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, Platform, StatusBar } from "react-native";
import { useSettings } from "../context/SettingsContext";

const calendars = [
  { key: "work", name: "Công việc", description: "Công việc văn phòng và dự án", color: "#7b61ff" },
  { key: "personal", name: "Cá nhân", description: "Các sự kiện cá nhân, sinh nhật", color: "#ff7043" },
  { key: "study", name: "Học tập", description: "Lịch học, bài tập, thi cử", color: "#42a5f5" },
  { key: "family", name: "Gia đình", description: "Các hoạt động gia đình", color: "#66bb6a" },
  { key: "health", name: "Sức khỏe", description: "Tập gym, khám sức khỏe, yoga", color: "#ef5350" },
  { key: "travel", name: "Du lịch", description: "Kế hoạch du lịch, nghỉ dưỡng", color: "#ffa726" },
  { key: "project", name: "Dự án", description: "Các dự án cá nhân hoặc nhóm", color: "#ab47bc" },
  { key: "social", name: "Sự kiện xã hội", description: "Hội họp, tiệc tùng, gặp gỡ bạn bè", color: "#29b6f6" },
  { key: "finance", name: "Tài chính", description: "Chi tiêu, thu nhập, ngân sách", color: "#26a69a" },
  { key: "hobby", name: "Sở thích", description: "Sở thích cá nhân, thể thao, game, nghệ thuật", color: "#ffca28" },
];

export default function ManageCalendarsScreen({ route, navigation }) {
  const { selected, onSelect } = route.params;
  const { isDarkMode } = useSettings();

  const bgColor = isDarkMode ? "#121212" : "#f0f2f5";
  const rowBg = isDarkMode ? "#1f1f1f" : "#fff";
  const textColor = isDarkMode ? "#fff" : "#2c3e50";
  const secondaryColor = isDarkMode ? "#aaa" : "#777";
  const checkColor = "#1E88E5";

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: rowBg }]}
      activeOpacity={0.8}
      onPress={() => {
        onSelect(item);
        navigation.goBack();
      }}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.text, { color: textColor }]}>{item.name}</Text>
          <Text style={[styles.description, { color: secondaryColor }]}>{item.description}</Text>
        </View>
      </View>
      {selected.key === item.key && <Text style={[styles.check, { color: checkColor, fontWeight: "700" }]}>✓</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: bgColor,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <FlatList
        data={calendars}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 10,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: "500",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  check: {
    fontSize: 18,
  },
});
