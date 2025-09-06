// screens/EventScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../firebase";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

export default function EventScreen({ route, navigation }) {
  const { event } = route.params;
  const { isDarkMode, language } = useSettings();
  const { t } = useTranslation();

  // --- State ---
  const [tieuDe, setTieuDe] = useState(event?.tieuDe || "");
  const [caNgay, setCaNgay] = useState(event?.caNgay || false);
  const [ngayBatDau, setNgayBatDau] = useState(
    event?.ngayBatDau?.toDate ? event.ngayBatDau.toDate() : new Date()
  );
  const [ngayKetThuc, setNgayKetThuc] = useState(
    event?.ngayKetThuc?.toDate ? event.ngayKetThuc.toDate() : new Date()
  );
  const [thongBao, setThongBao] = useState(event?.thongBao || t("noNotification"));
  const [lapLai, setLapLai] = useState(event?.lapLai || t("noRepeat"));
  const [diaDiem, setDiaDiem] = useState(event?.diaDiem || "");
  const [url, setUrl] = useState(event?.url || "");
  const [ghiChu, setGhiChu] = useState(event?.ghiChu || "");
  const [lich, setLich] = useState(event?.lich || { name: t("work"), color: "#7b61ff" });
  const [showPicker, setShowPicker] = useState({ visible: false, type: "" });

  // --- Format ngày ---
  const formatDate = (date) =>
    new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  // --- Cập nhật sự kiện ---
  const handleUpdate = async () => {
    if (!tieuDe.trim()) return Alert.alert(t("notification"), t("titleRequired"));
    if (ngayKetThuc < ngayBatDau) return Alert.alert(t("error"), t("endAfterStart"));
    try {
      const docRef = doc(db, "events", event.id);
      await updateDoc(docRef, {
        tieuDe,
        caNgay,
        ngayBatDau,
        ngayKetThuc,
        thongBao,
        lapLai,
        diaDiem,
        url,
        ghiChu,
        lich,
      });
      Alert.alert(t("success"), t("eventUpdated"));
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert(t("error"), t("updateFailed"));
    }
  };

  // --- Xóa sự kiện ---
  const handleDelete = async () => {
    Alert.alert(t("confirm"), t("deleteEventConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "events", event.id));
            Alert.alert(t("success"), t("eventDeleted"));
            navigation.goBack();
          } catch (error) {
            console.error(error);
            Alert.alert(t("error"), t("deleteFailed"));
          }
        },
      },
    ]);
  };

  // --- Picker ngày ---
  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      showPicker.type === "start"
        ? setNgayBatDau(selectedDate)
        : setNgayKetThuc(selectedDate);
    }
    setShowPicker({ visible: false, type: "" });
  };

  // --- Theme ---
  const bgColor = isDarkMode ? "#121212" : "#f9f9f9";
  const cardColor = isDarkMode ? "#1e1e1e" : "#fff";
  const borderColor = isDarkMode ? "#333" : "#ddd";
  const textColor = isDarkMode ? "#fff" : "#000";
  const subTextColor = isDarkMode ? "#ccc" : "#777";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.cancel, { color: "#1E88E5" }]}>{t("cancel")}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>{t("eventDetail")}</Text>
          <TouchableOpacity onPress={handleUpdate}>
            <Text style={[styles.save, { color: "#1E88E5" }]}>{t("save")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Lịch */}
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("ManageCalendarsScreen", { selected: lich, onSelect: setLich })
            }
          >
            <View style={styles.rowLeft}>
              <View style={[styles.colorDot, { backgroundColor: lich.color }]} />
              <Text style={[styles.rowText, { color: textColor }]}>{lich.name}</Text>
            </View>
            <Text style={[styles.rowRight, { color: subTextColor }]}>›</Text>
          </TouchableOpacity>

          {/* Tiêu đề */}
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
            placeholder={t("eventTitle")}
            placeholderTextColor={subTextColor}
            value={tieuDe}
            onChangeText={setTieuDe}
          />

          {/* Cả ngày */}
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: textColor }]}>{t("allDayEvent")}</Text>
            <Switch value={caNgay} onValueChange={setCaNgay} />
          </View>

          {/* Ngày bắt đầu / kết thúc */}
          <TouchableOpacity style={styles.row} onPress={() => setShowPicker({ visible: true, type: "start" })}>
            <Text style={[styles.rowText, { color: textColor }]}>{t("start")}</Text>
            <Text style={[styles.rowRight, { color: subTextColor }]}>{formatDate(ngayBatDau)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => setShowPicker({ visible: true, type: "end" })}>
            <Text style={[styles.rowText, { color: textColor }]}>{t("end")}</Text>
            <Text style={[styles.rowRight, { color: subTextColor }]}>{formatDate(ngayKetThuc)}</Text>
          </TouchableOpacity>

          {showPicker.visible && (
            <DateTimePicker
              value={showPicker.type === "start" ? ngayBatDau : ngayKetThuc}
              mode={caNgay ? "date" : "datetime"}
              display="default"
              onChange={handleDateChange}
            />
          )}

          {/* Lặp lại */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("RepeatScreen", { selected: lapLai, onSelect: setLapLai })}
          >
            <Text style={[styles.rowText, { color: textColor }]}>{t("repeat")}</Text>
            <Text style={[styles.rowRight, { color: subTextColor }]}>{lapLai} ›</Text>
          </TouchableOpacity>

          {/* Thông báo */}
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate("NotificationScreen", { selected: thongBao, onSelect: setThongBao })
            }
          >
            <Text style={[styles.rowText, { color: textColor }]}>{t("notification")}</Text>
            <Text style={[styles.rowRight, { color: subTextColor }]}>{thongBao} ›</Text>
          </TouchableOpacity>

          {/* Địa điểm / URL / Ghi chú */}
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
            placeholder={t("location")}
            placeholderTextColor={subTextColor}
            value={diaDiem}
            onChangeText={setDiaDiem}
          />
          <TextInput
            style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
            placeholder="URL"
            placeholderTextColor={subTextColor}
            value={url}
            onChangeText={setUrl}
          />
          <TextInput
            style={[styles.input, { height: 100, backgroundColor: cardColor, color: textColor, borderColor }]}
            placeholder={t("note")}
            placeholderTextColor={subTextColor}
            multiline
            value={ghiChu}
            onChangeText={setGhiChu}
          />

          {/* Xóa */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>🗑 {t("deleteEvent")}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Nút lưu */}
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
          <LinearGradient
            colors={isDarkMode ? ["#fbc02d", "#fdd835"] : ["#42a5f5", "#1E88E5"]}
            style={styles.saveButton}
          >
            <Text style={styles.saveButtonText}>{t("saveChanges")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { height: 55, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 15, borderBottomWidth: 1 },
  cancel: { fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  save: { fontSize: 16 },
  scrollContent: { padding: 15, paddingBottom: 180 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1 },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowText: { fontSize: 16 },
  rowRight: { fontSize: 14 },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 10 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 14, fontSize: 16, marginBottom: 15, borderWidth: 1 },
  deleteButton: { backgroundColor: "#F44336", padding: 15, borderRadius: 8, marginTop: 25, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  deleteText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  saveButton: { position: "absolute", bottom: 20, left: 20, right: 20, paddingVertical: 16, borderRadius: 30, alignItems: "center", elevation: 4 },
  saveButtonText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
});
