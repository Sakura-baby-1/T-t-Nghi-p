// screens/EditEventScreen.js – TẾT 2026 ĐỎ VÀNG HOÀN HẢO
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
  StatusBar,
  ImageBackground,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

// Điều chỉnh độ sáng màu hex
function adjustColor(hex, amt = 0) {
  try {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    const num = parseInt(hex,16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.min(255, Math.max(0, r + amt));
    g = Math.min(255, Math.max(0, g + amt));
    b = Math.min(255, Math.max(0, b + amt));
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  } catch { return hex; }
}

export default function EditEventScreen({ route, navigation }) {
  const { event, onUpdate } = route.params; // ← nhận callback từ EventScreen
  const { language } = useSettings(); // language đã có, đảm bảo các useEffect phụ thuộc language
  const { t } = useTranslation();

  const [tieuDe, setTieuDe] = useState(event?.tieuDe || "");
  const [caNgay, setCaNgay] = useState(event?.caNgay || false);
  const [ngayBatDau, setNgayBatDau] = useState(event?.ngayBatDau?.toDate ? event.ngayBatDau.toDate() : new Date());
  const [ngayKetThuc, setNgayKetThuc] = useState(event?.ngayKetThuc?.toDate ? event.ngayKetThuc.toDate() : new Date());
  const [thongBao, setThongBao] = useState(event?.thongBao || t("noneNotification"));
  const [lapLai, setLapLai] = useState(event?.lapLai || t("never"));
  const [diaDiem, setDiaDiem] = useState(event?.diaDiem || "");
  const [url, setUrl] = useState(event?.url || "");
  const [ghiChu, setGhiChu] = useState(event?.ghiChu || "");
  const [lich, setLich] = useState(event?.lich || { name: t("work"), color: "#FFD700" });
  const [showPicker, setShowPicker] = useState({ visible: false, type: "" });

  const formatDate = (date) =>
    new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const handleUpdate = async () => {
    if (!tieuDe.trim()) return Alert.alert(t("notification"), t("titleRequired"));
    if (ngayKetThuc < ngayBatDau) return Alert.alert(t("error"), t("endAfterStart"));

    try {
      const docRef = doc(db, "events", event.id);
      const updatedEvent = {
        ...event,
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
      };
      await updateDoc(docRef, updatedEvent);

      // --- gọi callback để EventScreen update ngay ---
      if (onUpdate) onUpdate(updatedEvent);

      Alert.alert(t("success"), t("eventUpdated"));
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert(t("error"), t("updateFailed"));
    }
  };

  const handleDelete = async () => {
    Alert.alert(t("confirm"), t("deleteEventConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "events", event.id));
            // gọi callback xóa sự kiện khỏi danh sách nếu cần
            if (onUpdate) onUpdate(null);
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
  const handleDateChange = (e, selectedDate) => {
    if (!selectedDate) return setShowPicker({ visible: false, type: "" });
    if (showPicker.type === "start") {
      setNgayBatDau(selectedDate);
      if (selectedDate > ngayKetThuc) setNgayKetThuc(selectedDate);
    } else {
      setNgayKetThuc(selectedDate);
    }
    setShowPicker({ visible: false, type: "" });
  };

  return (
    <ImageBackground source={require("../assets/bg-tet.jpg")} style={{ flex: 1 }} blurRadius={1}>
      <LinearGradient colors={["rgba(211, 47, 47, 0.92)", "rgba(255, 215, 0, 0.12)", "rgba(211, 47, 47, 0.95)"]} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />

          {/* Header động theo màu lịch */}
          {(() => {
            const base = lich.color || '#D32F2F';
            const gradientColors = [adjustColor(base,60), adjustColor(base,0)];
            return (
              <LinearGradient colors={gradientColors} style={styles.headerGradient}>
                <View style={styles.headerRow}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={28} color={adjustColor(base,-30)} />
                    <Text style={[styles.iconText,{color:adjustColor(base,-30)}]}>{t("cancel")}</Text>
                  </TouchableOpacity>
                  <View style={styles.headerTitleBox}>
                    <Text style={[styles.headerTitle,{color:adjustColor(base,-40)}]}>{t('editEventTitle')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.iconBtn, !tieuDe.trim() && { opacity: 0.6 }]}
                    onPress={handleUpdate}
                    disabled={!tieuDe.trim()}
                  >
                    <Text style={[styles.iconText,{color:adjustColor(base,-30)}]}>{t("save")}</Text>
                    <Ionicons name="checkmark" size={28} color={adjustColor(base,-30)} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            );
          })()}

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
          >
            <ScrollView contentContainerStyle={styles.container}>
              {/* Chọn loại lịch */}
              <TouchableOpacity
                style={[styles.rowCard,{borderColor: adjustColor(lich.color||'#FFD700',0)}]}
                onPress={() => navigation.navigate("ManageCalendarsScreen", { selected: lich, onSelect: setLich })}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.colorDot, { backgroundColor: lich.color, borderColor: adjustColor(lich.color||'#D32F2F',-30) }]} />
                  <Text style={[styles.rowTitle,{color: adjustColor(lich.color||'#D32F2F',-30)}]}>{lich.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={26} color={adjustColor(lich.color||'#FFD700',-10)} />
              </TouchableOpacity>

              {/* Tiêu đề */}
              <View style={styles.card}>
                <Text style={styles.label}>{t('eventTitle')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('event_placeholder')}
                  placeholderTextColor="#cc9a00"
                  value={tieuDe}
                  onChangeText={setTieuDe}
                  autoFocus
                />
              </View>

              {/* Thời gian */}
              <View style={styles.card}>
                <View style={styles.rowSplit}>
                  <Text style={styles.labelSmall}>{t('start')}</Text>
                  <TouchableOpacity onPress={() => setShowPicker({ visible: true, type: "start" })}>
                    <Text style={styles.timeText}>{formatDate(ngayBatDau)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.rowSplit}>
                  <Text style={styles.labelSmall}>{t('end')}</Text>
                  <TouchableOpacity onPress={() => setShowPicker({ visible: true, type: "end" })}>
                    <Text style={styles.timeText}>{formatDate(ngayKetThuc)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.rowSplit}>
                  <Text style={styles.labelSmall}>{t('allDay')}</Text>
                  <Switch
                    value={caNgay}
                    onValueChange={setCaNgay}
                    trackColor={{ false: "#ccc", true: "#FFD700" }}
                    thumbColor={caNgay ? "#D32F2F" : "#f4f3f4"}
                  />
                </View>
              </View>

              {/* Lặp lại & Thông báo */}
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.rowOption}
                  onPress={() => navigation.navigate("RepeatScreen", { selected: lapLai, onSelect: setLapLai })}
                >
                  <Text style={styles.rowTitle}>{t('repeat')}</Text>
                  <View style={styles.rowRightBox}>
                    <Text style={styles.rowSub}>{lapLai}</Text>
                    <Ionicons name="chevron-forward" size={24} color="#FFD700" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rowOption}
                  onPress={() =>
                    navigation.navigate("NotificationScreen", {
                      selected: thongBao,
                      onSelect: setThongBao,
                      eventTime: ngayBatDau,
                      eventName: tieuDe,
                    })
                  }
                >
                  <Text style={styles.rowTitle}>{t('notification')}</Text>
                  <View style={styles.rowRightBox}>
                    <Text style={styles.rowSub}>{thongBao}</Text>
                    <Ionicons name="chevron-forward" size={24} color="#FFD700" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Thông tin chi tiết */}
              <View style={styles.card}>
                <Text style={styles.label}>{t('location')}</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={diaDiem}
                  onChangeText={setDiaDiem}
                  placeholder={t('location_placeholder')}
                  placeholderTextColor="#cc9a00"
                />
                <Text style={[styles.label, { marginTop: 14 }]}>{t('url')}</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={url}
                  onChangeText={setUrl}
                  placeholder={t('url_placeholder')}
                  placeholderTextColor="#cc9a00"
                />
                <Text style={[styles.label, { marginTop: 14 }]}>{t('note')}</Text>
                <TextInput
                  style={styles.inputArea}
                  value={ghiChu}
                  onChangeText={setGhiChu}
                  placeholder={t('note_placeholder')}
                  placeholderTextColor="#cc9a00"
                  multiline
                  numberOfLines={5}
                />
              </View>

              {/* Nút XÓA */}
              <TouchableOpacity style={[styles.deleteButton,{backgroundColor: adjustColor(lich.color||'#D32F2F',-30), shadowColor: adjustColor(lich.color||'#D32F2F',-40)}]} onPress={handleDelete}>
                <MaterialCommunityIcons name="trash-can" size={28} color="#fff" />
                <Text style={styles.deleteText}>{t('deleteEvent')}</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Nút Lưu cố định dưới cùng */}
            <TouchableOpacity style={styles.fixedSaveButton} onPress={handleUpdate} disabled={!tieuDe.trim()}>
              {(() => {
                const base = lich.color || '#FFD700';
                const btnColors = [adjustColor(base,50), adjustColor(base,-10)];
                return (
                  <LinearGradient colors={btnColors} style={{ flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 20 }}>
                    <Text style={[styles.saveText,{color: adjustColor(base,-50)}]}>{t('saveChanges')}</Text>
                  </LinearGradient>
                );
              })()}
            </TouchableOpacity>
          </KeyboardAvoidingView>

          {/* DateTime Picker */}
          {showPicker.visible && (
            <DateTimePicker
              value={showPicker.type === "start" ? ngayBatDau : ngayKetThuc}
              mode={caNgay ? "date" : "datetime"}
              display="spinner"
              onChange={handleDateChange}
            />
          )}
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

/* ===== STYLE TẾT 2026 SIÊU ĐẸP ===== */
const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 14 : 20,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    elevation: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconText: { color: "#D32F2F", fontWeight: "bold", fontSize: 18 },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { color: "#D32F2F", fontSize: 26, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },

  container: { padding: 20, paddingBottom: 100 },

  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#fff",
    marginBottom: 16,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  colorDot: { width: 20, height: 20, borderRadius: 10, marginRight: 16, borderWidth: 3, borderColor: "#D32F2F" },
  rowTitle: { fontSize: 19, fontWeight: "bold", color: "#D32F2F" },
  rowSub: { fontSize: 15, color: "#cc9a00", fontWeight: "600" },

  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: "#FFD700",
  },

  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#D32F2F" },
  labelSmall: { fontSize: 15, fontWeight: "600", color: "#D32F2F" },
  input: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 18,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FFD700",
    color: "#333",
  },
  inputSmall: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FFD700",
    color: "#333",
  },
  inputArea: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#FFD700",
    color: "#333",
    minHeight: 100,
  },

  rowSplit: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  timeText: { color: "#333", fontWeight: "bold", fontSize: 17 },
  rowOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#FFD700" },
  rowRightBox: { flexDirection: "row", alignItems: "center", gap: 12 },

  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    paddingVertical: 18,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 15,
    shadowColor: "#D32F2F",
  },
  deleteText: { color: "#fff", fontWeight: "bold", fontSize: 18, marginLeft: 10 },

  fixedSaveButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 20,
  },
  saveText: { color: "#D32F2F", fontSize: 20, fontWeight: "bold" },
});