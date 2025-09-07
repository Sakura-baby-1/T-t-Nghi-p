import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, query, where, getDocs,doc,setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useSettings } from "../context/SettingsContext";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { generateRepeatDates } from "../utils/repeatEvents";

const offsetMap = { "1m": 1, "5m": 5, "10m": 10, "30m": 30, "1h": 60, "2h": 120, "1d": 1440 };
const offsetLabels = {
  "Không thông báo": "Không thông báo",
  "1m": "1 phút trước",
  "5m": "5 phút trước",
  "10m": "10 phút trước",
  "30m": "30 phút trước",
  "1h": "1 giờ trước",
  "2h": "2 giờ trước",
  "1d": "1 ngày trước",
};

// Hàm format ngày giờ đẹp hơn
const formatDateTime = (date, locale = "vi-VN") => {
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  return `${time}, ${day}`;
};


// Lên lịch thông báo
const scheduleEventNotification = async (eventTime, event) => {
  if (!Device.isDevice || event.thongBao === "Không thông báo") return;

  let triggerTime = new Date(eventTime);
  if (offsetMap[event.thongBao]) {
    triggerTime = new Date(triggerTime.getTime() - offsetMap[event.thongBao] * 60000);
  }

  // Nếu thời gian đã qua thì không tạo thông báo
  if (triggerTime < new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sự kiện sắp tới!",
      body: event.tieuDe,
      sound: "default",
      data: { event },
    },
    trigger: triggerTime,
  });
};

export default function TaoSuKienScreen({ navigation, route }) {
  const { isDarkMode, language } = useSettings();

  const getNowVN = () => {
    const now = new Date();
    const offset = 7 * 60;
    return new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
  };

  const [tieuDe, setTieuDe] = useState("");
  const [caNgay, setCaNgay] = useState(false);
  const [ngayBatDau, setNgayBatDau] = useState(getNowVN());
  const [ngayKetThuc, setNgayKetThuc] = useState(getNowVN());
  const [lapLai, setLapLai] = useState("Không lặp lại");
  const [diaDiem, setDiaDiem] = useState("");
  const [url, setUrl] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [lich, setLich] = useState({ name: "Công việc", color: "#7b61ff" });
  const [nhieuNgay, setNhieuNgay] = useState([]);
  const [showPicker, setShowPicker] = useState({ visible: false, type: "" });
  const [trungTen, setTrungTen] = useState(false);
  const [thongBao, setThongBao] = useState("Không thông báo");

  // Debounce kiểm tra trùng tên
  const debounceRef = useRef(null);
  const kiemTraTrungTen = async (ten, lichChon) => {
    if (!auth.currentUser || !ten?.trim()) {
      setTrungTen(false);
      return;
    }
    try {
      const q = query(
        collection(db, "events"),
        where("userId", "==", auth.currentUser.uid),
        where("calendar_name_lower", "==", lichChon.name.toLowerCase()),
        where("title_lower", "==", ten.toLowerCase())
      );
      const snap = await getDocs(q);
      setTrungTen(!snap.empty);
    } catch (e) {
      console.warn("Kiểm tra trùng tên thất bại:", e);
      setTrungTen(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      kiemTraTrungTen(tieuDe, lich);
    }, 500);
  }, [tieuDe, lich]);

  const luuSuKien = async () => {
  if (!tieuDe.trim()) return Alert.alert("Thông báo", "Tiêu đề không được để trống.");
  if (ngayKetThuc < ngayBatDau) return Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu.");
  if (trungTen) return Alert.alert("Lỗi", "Tên Lịch đã tồn tại trong lịch này.");
  if (url && !/^https?:\/\//i.test(url)) return Alert.alert("Lỗi", "URL không hợp lệ.");

  try {
    let dsNgay = [];

    if (lapLai !== "Không lặp lại") {
      // Nếu chọn lặp lại → generate ngày theo lặp
      dsNgay = generateRepeatDates(ngayBatDau, lapLai, 30);
    } else if (nhieuNgay.length > 0) {
      // Nếu chọn nhiều ngày → lấy ngày người dùng chọn
      dsNgay = nhieuNgay;
    } else {
      dsNgay = [ngayBatDau];
    }

    dsNgay.sort((a, b) => new Date(a) - new Date(b));

    for (let d of dsNgay) {
      const batDau = new Date(d);
      const ketThuc = new Date(d);

      if (caNgay) {
        batDau.setHours(0, 0, 0, 0);
        ketThuc.setHours(23, 59, 59, 999);
      } else {
        batDau.setHours(ngayBatDau.getHours(), ngayBatDau.getMinutes(), 0, 0);
        ketThuc.setHours(ngayKetThuc.getHours(), ngayKetThuc.getMinutes(), 0, 0);

        if (batDau < new Date()) 
          return Alert.alert("Lỗi", "Thời gian bắt đầu phải sau hiện tại.");
      }

      const eventData = {
        userId: auth.currentUser.uid,
        tieuDe,
        lich: { name: lich.name, color: lich.color },
        caNgay,
        ngayBatDau: batDau,
        ngayKetThuc: ketThuc,
        nhieuNgay: dsNgay.map(d => new Date(d).toISOString()),
        lapLai,
        thongBao,
        diaDiem,
        url,
        ghiChu,
        title_lower: tieuDe.toLowerCase(),
        calendar_name_lower: lich.name.toLowerCase(),
      };

      // Tạo docId duy nhất cho từng ngày → tránh bị trùng khi lặp lại
      const docId = `${lich.name}_${tieuDe}_${batDau.toISOString().slice(0,10)}`;
      await setDoc(doc(db, "events", docId), eventData);

      // Tạo thông báo cho từng ngày
      await scheduleEventNotification(batDau, eventData);
    }

    if (route.params?.onGoBack) route.params.onGoBack();
    Alert.alert("Thành công", "Lịch đã được lưu.");
    navigation.goBack();

  } catch (error) {
    console.error("Lưu Lịch lỗi:", error);
    Alert.alert("Lỗi", "Không thể lưu Lịch.");
  }
};



  const thayDoiNgay = (e, ngayChon) => {
    if (!ngayChon) return setShowPicker({ visible: false, type: "" });
    if (showPicker.type === "start") {
      setNgayBatDau(ngayChon);
      if (ngayChon > ngayKetThuc) setNgayKetThuc(ngayChon);
    } else {
      if (ngayChon < ngayBatDau) Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu.");
      else setNgayKetThuc(ngayChon);
    }
    setShowPicker({ visible: false, type: "" });
  };




  const bgColor = isDarkMode ? "#0f1720" : "#f7fbff";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDarkMode ? ["#0b1220", "#1e293b"] : ["#4facfe", "#8f94fb"]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color="#fff" />
            <Text style={styles.iconText}>Hủy</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Tạo Lịch</Text>
          </View>
          <TouchableOpacity
            style={[styles.iconBtn, !tieuDe.trim() && { opacity: 0.6 }]}
            onPress={luuSuKien}
            disabled={!tieuDe.trim()}
          >
            <Text style={styles.iconText}>Lưu</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {trungTen && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={16} color="#b71c1c" />
              <Text style={styles.warningText}>Tên Lịch đã tồn tại</Text>
            </View>
          )}

          {/* Chọn loại lịch */}
          <TouchableOpacity
            style={[styles.rowCard]}
            onPress={() => navigation.navigate("ManageCalendarsScreen", { selected: lich, onSelect: setLich })}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.colorDot, { backgroundColor: lich.color }]} />
              <Text style={styles.rowTitle}>{lich.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9aa0b4" />
          </TouchableOpacity>

          {/* Tiêu đề sự kiện */}
          <View style={[styles.card, { backgroundColor: isDarkMode ? "#0f1724" : "#fff" }]}>
            <Text style={[styles.label, { color: isDarkMode ? "#cbd5e1" : "#44546a" }]}>Tiêu đề Lịch</Text>
            <TextInput
              style={[styles.input, { color: isDarkMode ? "#fff" : "#222" }]}
              placeholder="Nhập tiêu đề"
              placeholderTextColor={isDarkMode ? "#6b7280" : "#9aa0b4"}
              value={tieuDe}
              onChangeText={setTieuDe}
              autoFocus
            />
          </View>

          {/* Ngày / Thời gian */}
          <View style={[styles.card, { backgroundColor: isDarkMode ? "#0f1724" : "#fff" }]}>
            <View style={styles.rowSplit}>
              <Text style={[styles.labelSmall, { color: isDarkMode ? "#cbd5e1" : "#44546a" }]}>Bắt đầu</Text>
              <TouchableOpacity onPress={() => setShowPicker({ visible: true, type: "start" })}>
                <Text style={styles.timeText}>{formatDateTime(ngayBatDau, language)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowSplit}>
              <Text style={[styles.labelSmall, { color: isDarkMode ? "#cbd5e1" : "#44546a" }]}>Kết thúc</Text>
              <TouchableOpacity onPress={() => setShowPicker({ visible: true, type: "end" })}>
                <Text style={styles.timeText}>{formatDateTime(ngayKetThuc, language)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowSplit}>
              <Text style={[styles.labelSmall, { color: isDarkMode ? "#cbd5e1" : "#44546a" }]}>Cả ngày</Text>
              <Switch value={caNgay} onValueChange={setCaNgay} />
            </View>
          </View>

          {/* Lặp lại / Thông báo / Nhiều ngày */}
          <View style={[styles.card, { backgroundColor: isDarkMode ? "#0f1724" : "#fff" }]}>
            <TouchableOpacity
              style={styles.rowOption}
              onPress={() => navigation.navigate("RepeatScreen", { selected: lapLai, onSelect: setLapLai })}
            >
              <Text style={styles.rowTitle}>Lặp lại</Text>
              <View style={styles.rowRightBox}>
                <Text style={styles.rowSub}>{lapLai}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9aa0b4" />
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
              <Text style={styles.rowTitle}>Thông báo</Text>
              <View style={styles.rowRightBox}>
                <Text style={styles.rowSub}>{offsetLabels[thongBao]}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9aa0b4" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rowOption}
              onPress={() => navigation.navigate("MultiDayScreen", { selectedDates: nhieuNgay, onSelect: setNhieuNgay })}
            >
              <Text style={styles.rowTitle}>Nhiều ngày</Text>
              <View style={styles.rowRightBox}>
                <Text style={styles.rowSub}>{nhieuNgay.length === 0 ? "Không" : `${nhieuNgay.length} ngày`}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9aa0b4" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Thông tin chi tiết */}
          <View style={[styles.card, { backgroundColor: isDarkMode ? "#0f1724" : "#fff" }]}>
            <Text style={[styles.label, { color: isDarkMode ? "#cbd5e1" : "#44546a" }]}>Địa điểm</Text>
            <TextInput
              style={[styles.inputSmall, { color: isDarkMode ? "#fff" : "#222" }]}
              value={diaDiem}
              onChangeText={setDiaDiem}
              placeholder="Nhập địa điểm"
              placeholderTextColor={isDarkMode ? "#6b7280" : "#9aa0b4"}
            />

            <Text style={[styles.label, { color: isDarkMode ? "#cbd5e1" : "#44546a", marginTop: 8 }]}>URL</Text>
            <TextInput
              style={[styles.inputSmall, { color: isDarkMode ? "#fff" : "#222" }]}
              value={url}
              onChangeText={setUrl}
              placeholder="Nhập URL"
              placeholderTextColor={isDarkMode ? "#6b7280" : "#9aa0b4"}
            />


              <Text style={[styles.label, { color: isDarkMode ? "#cbd5e1" : "#44546a", marginTop: 8 }]}>Ghi chú</Text>
              <TextInput
                style={[styles.inputArea, { color: isDarkMode ? "#fff" : "#222" }]}
                value={ghiChu}
                onChangeText={setGhiChu}
                placeholder="Nhập ghi chú"
                placeholderTextColor={isDarkMode ? "#6b7280" : "#9aa0b4"}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Nút lưu */}
            <TouchableOpacity style={styles.primaryButton} onPress={luuSuKien} disabled={!tieuDe.trim()}>
              <Text style={styles.primaryButtonText}>Lưu</Text>
            </TouchableOpacity>
          </ScrollView>

          {showPicker.visible && (
            <DateTimePicker
              value={showPicker.type === "start" ? ngayBatDau : ngayKetThuc}
              mode="datetime"
              display="default"
              onChange={thayDoiNgay}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ===== Styles ===== */
  const styles = StyleSheet.create({
    headerGradient: {
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 18,
      paddingBottom: 14,
      paddingHorizontal: 12,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconText: { color: "#fff", marginLeft: 6, fontWeight: "600" },
    headerTitleBox: { alignItems: "center" },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },

    container: { padding: 16, paddingBottom: 40 },
    warningBox: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff3f3", borderRadius: 10, borderWidth: 1, borderColor: "#ffd6d6", marginBottom: 12 },
    warningText: { marginLeft: 8, color: "#b71c1c", fontWeight: "600" },

    rowCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderRadius: 14, backgroundColor: "#fff", marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    rowLeft: { flexDirection: "row", alignItems: "center" },
    colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
    rowTitle: { fontSize: 16, fontWeight: "600" },
    rowSub: { fontSize: 13, color: "#8b95a7" },

    card: { borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },

    label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
    labelSmall: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
    input: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, backgroundColor: "transparent" },
    inputSmall: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, backgroundColor: "transparent" },
    inputArea: { borderRadius: 10, padding: 12, fontSize: 14, textAlignVertical: "top", backgroundColor: "transparent" },

    rowSplit: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    timeText: { color: "#1f2937", fontWeight: "600" },
    rowOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
    rowRightBox: { flexDirection: "row", alignItems: "center", gap: 8 },

    primaryButton: { marginTop: 8, marginBottom: 30, marginHorizontal: 16, backgroundColor: "#1E88E5", paddingVertical: 14, borderRadius: 14, alignItems: "center", shadowColor: "#1E88E5", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
