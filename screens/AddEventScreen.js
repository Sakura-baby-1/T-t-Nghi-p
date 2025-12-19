// TaoSuKienScreen.js - PHIÊN BẢN TẾT 2026 SIÊU ĐẸP (17/11/2025)
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import { useTranslation } from "react-i18next";
import moment from "moment";
import { collection, addDoc, query, where, getDocs, doc, setDoc, orderBy, limit, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase";
import { cacheManager, CACHE_KEYS } from "../utils/cacheManager";
import { useSettings } from "../context/SettingsContext";
import useTheme from "../hooks/useTheme";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { generateRepeatDates } from "../utils/repeatEvents";

const offsetMap = { "1m": 1, "5m": 5, "10m": 10, "30m": 30, "1h": 60, "2h": 120, "1d": 1440 };

// Utility: adjust (lighten/darken) hex color
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

// Hàm format ngày giờ đẹp hơn
const formatDateTime = (date, lang = "vi") => {
  if (!date) return "";
  // map simple lang code to locale
  const langToLocale = {
    vi: "vi-VN",
    en: "en-US",
  };
  const locale = langToLocale[lang] || langToLocale.vi;
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
  if (!Device.isDevice || event.thongBao === 'none') return;

  let triggerTime = new Date(eventTime);
  if (offsetMap[event.thongBao]) {
    triggerTime = new Date(triggerTime.getTime() - offsetMap[event.thongBao] * 60000);
  }

  // Nếu thời gian đã qua thì không tạo thông báo
  if (triggerTime < new Date()) return;

  // Format thời gian hiển thị
  const timeStr = event.caNgay 
    ? formatDateTime(eventTime, 'vi').split(',')[1].trim() // Chỉ lấy phần ngày nếu cả ngày
    : formatDateTime(eventTime, 'vi'); // Lấy cả giờ và ngày

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Sự kiện sắp tới!",
      body: `${event.tieuDe}\n${timeStr}`,
      sound: "default",
      data: { event },
    },
    trigger: triggerTime,
  });
};

/* ===================== Helpers cho tìm slot rảnh ===================== */
// Parse giá trị Firestore Timestamp / Date / string -> Date object
function parseFirestoreDate(v) {
  if (!v && v !== 0) return null;
  // Firestore Timestamp has toDate()
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate();
  // Legacy object with seconds/nanoseconds
  if (v && typeof v.seconds === "number") {
    return new Date(v.seconds * 1000 + (v.nanoseconds ? v.nanoseconds / 1e6 : 0));
  }
  if (typeof v === "string") return new Date(v);
  if (v instanceof Date) return v;
  // fallback
  try {
    return new Date(v);
  } catch {
    return null;
  }
}

function findFreeSlotsForDay(events, duration, dayDate) {
  const dayStart = 0; // 0:00
  const dayEnd = 24 * 60; // 24:00

  const busy = events
    .map(ev => {
      const s = parseFirestoreDate(ev.ngayBatDau);
      const e = parseFirestoreDate(ev.ngayKetThuc);
      if (!s || !e) return null;
      if (
        s.getFullYear() !== dayDate.getFullYear() ||
        s.getMonth() !== dayDate.getMonth() ||
        s.getDate() !== dayDate.getDate()
      )
        return null;
      const startMin = s.getHours() * 60 + s.getMinutes();
      const endMin = e.getHours() * 60 + e.getMinutes();
      return { start: startMin, end: endMin };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  const free = [];
  let lastEnd = dayStart;

  busy.forEach(slot => {
    if (slot.start - lastEnd >= duration) {
      free.push({ start: lastEnd, end: slot.start });
    }
    lastEnd = Math.max(lastEnd, slot.end);
  });

  if (dayEnd - lastEnd >= duration) free.push({ start: lastEnd, end: dayEnd });

  // 🔥 Lọc slot quá khứ nếu là hôm nay
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return free
    .map(s => ({
      startHour: Math.floor(s.start / 60),
      startMinute: s.start % 60,
      endHour: Math.floor(s.end / 60),
      endMinute: s.end % 60,
      length: s.end - s.start,
    }))
    .filter(slot => {
      if (
        dayDate.getFullYear() === now.getFullYear() &&
        dayDate.getMonth() === now.getMonth() &&
        dayDate.getDate() === now.getDate()
      ) return slot.endHour * 60 + slot.endMinute > nowMinutes;
      return true;
    });
}
/* ===================================================================== */

export default function TaoSuKienScreen({ navigation, route }) {
  const { isDarkMode, language } = useSettings(); // language đã có, đảm bảo các useEffect phụ thuộc language
  const { palette } = useTheme();
  const { t } = useTranslation();

  const repeatLabels = {
    none: t('repeat_none', { defaultValue: 'Không lặp lại' }),
    daily: t('repeat_daily', { defaultValue: 'Hàng ngày' }),
    weekly: t('repeat_weekly', { defaultValue: 'Hàng tuần' }),
    monthly: t('repeat_monthly', { defaultValue: 'Hàng tháng' }),
    yearly: t('repeat_yearly', { defaultValue: 'Hàng năm' }),
  };

  const normalizeRepeat = (val) => {
    const v = (val || '').toString().trim().toLowerCase();
    const map = {
      '': 'none',
      'không': 'none', 'khong': 'none', 'không lặp lại': 'none', 'khong lap lai': 'none', 'none': 'none', 'no': 'none', 'no repeat': 'none', 'no-repeat': 'none',
      'hàng ngày': 'daily', 'hang ngay': 'daily', 'daily': 'daily',
      'hàng tuần': 'weekly', 'hang tuan': 'weekly', 'weekly': 'weekly',
      'hàng tháng': 'monthly', 'hang thang': 'monthly', 'monthly': 'monthly',
      'hàng năm': 'yearly', 'hang nam': 'yearly', 'yearly': 'yearly',
    };
    return map[v] || 'none';
  };

  // localized labels for offset selector
  const offsetLabels = {
    "none": t("none", { defaultValue: "Không thông báo" }),
    "1m": t("minBefore", { defaultValue: "1 phút trước" }),
    "5m": t("minBefore", { defaultValue: "5 phút trước" }),
    "10m": t("minBefore", { defaultValue: "10 phút trước" }),
    "30m": t("minBefore", { defaultValue: "30 phút trước" }),
    "1h": t("hourBefore", { defaultValue: "1 giờ trước" }),
    "2h": t("hourBefore", { defaultValue: "2 giờ trước" }),
    "1d": t("dayBefore", { defaultValue: "1 ngày trước" }),
  };

  const getNowVN = () => {
    const now = new Date();
    const offset = 7 * 60;
    return new Date(now.getTime() + (offset + now.getTimezoneOffset()) * 60000);
  };

  const [tieuDe, setTieuDe] = useState("");
  const [caNgay, setCaNgay] = useState(false);
  const [ngayBatDau, setNgayBatDau] = useState(getNowVN());
  const [ngayKetThuc, setNgayKetThuc] = useState(getNowVN());
  const [lapLai, setLapLai] = useState('none');
  const [diaDiem, setDiaDiem] = useState("");
  const [url, setUrl] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [lich, setLich] = useState({ key: "work", color: "#e74c3c" });
  const [nhieuNgay, setNhieuNgay] = useState([]);
  const [showPicker, setShowPicker] = useState({ visible: false, type: "", mode: "date" });
  const [pendingDate, setPendingDate] = useState(null);
  const [iosTempDate, setIosTempDate] = useState(null);
  const [trungTen, setTrungTen] = useState(false);
  const [thongBao, setThongBao] = useState('none');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [thoiLuong, setThoiLuong] = useState(60); // mặc định 60 phút

  const isNoRepeat = (val) => normalizeRepeat(val) === 'none';

  const renderLapLaiLabel = (val) => repeatLabels[normalizeRepeat(val)] || repeatLabels.none;

  // 🔥 Khi chọn lặp lại → xóa nhiều ngày (chỉ 1 sự kiện)
  useEffect(() => {
    if (!isNoRepeat(lapLai) && nhieuNgay.length > 0) {
      setNhieuNgay([]);
    }
  }, [lapLai]);

  // 🔥 Khi chọn nhiều ngày → xóa lặp lại (chỉ 1 sự kiện)
  useEffect(() => {
    if (nhieuNgay.length > 0 && !isNoRepeat(lapLai)) {
      setLapLai('none');
    }
  }, [nhieuNgay]);

  const openPicker = (type) => {
    const current = type === "start" ? ngayBatDau : ngayKetThuc;
    setIosTempDate(current);
    // If all-day: open Date tab; else for time rows open Time tab by default
    const initialTab = caNgay ? 'date' : 'time';
    setShowPicker({ visible: true, type, mode: "datetime", initialTab });
  };

  // ====== State mới cho AI gợi ý thời gian trống ======

  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [slotSuggestions, setSlotSuggestions] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // ====== Gợi ý tiêu đề phân loại theo lịch ======
  const [categorizedSuggestions, setCategorizedSuggestions] = useState([]);
  const [loadingTitleSuggestions, setLoadingTitleSuggestions] = useState(false);
  // =================================================
  // =====================================================

  // Debounce kiểm tra trùng tên - TỐI ƯU CACHE
  const debounceRef = useRef(null);
  const kiemTraTrungTen = async (ten, lichChon) => {
    if (!auth.currentUser || !ten?.trim()) {
      setTrungTen(false);
      return;
    }
    try {
      // 🚀 CACHE: Kiểm tra cache trước - tránh query Firestore liên tục
      const cacheKey = `${CACHE_KEYS.USER_EVENTS}_${lichChon.key}_${ten.toLowerCase()}`;
      if (cacheManager.has(cacheKey)) {
        const cached = cacheManager.get(cacheKey);
        setTrungTen(cached);
        return;
      }

      const q = query(
        collection(db, "events"),
        where("userId", "==", auth.currentUser.uid),
        where("lich.key", "==", lichChon.key),
        where("title_lower", "==", ten.toLowerCase())
      );
      const snap = await getDocs(q);
      const exists = !snap.empty;
      
      // 💾 Lưu vào cache 2 phút
      cacheManager.set(cacheKey, exists, 120000);
      setTrungTen(exists);
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

  // Load và phân tích sự kiện để tạo gợi ý tiêu đề phân loại theo lịch - TỐI ƯU CACHE
  useEffect(() => {
    const run = async () => {
      if (!auth.currentUser) return;
      
      // 🚀 CACHE: Kiểm tra cache title suggestions trước
      const cacheKey = `${CACHE_KEYS.TITLE_SUGGESTIONS}_${auth.currentUser.uid}`;
      if (cacheManager.has(cacheKey)) {
        const cached = cacheManager.get(cacheKey);
        setCategorizedSuggestions(cached);
        return;
      }
      
      setLoadingTitleSuggestions(true);
      try {
        const q = query(
          collection(db, 'events'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('ngayBatDau', 'desc'),
          limit(120)
        );
        const snap = await getDocs(q);
        const events = [];
        snap.forEach(d => events.push(d.data()));
        const suggestions = buildCategorizedTitleSuggestions(events);
        
        // 💾 Lưu vào cache 5 phút
        cacheManager.set(cacheKey, suggestions, 300000);
        setCategorizedSuggestions(suggestions);
      } catch (e) {
        // Thiếu composite index cho where(userId) + orderBy(ngayBatDau)
        if (e.code === 'failed-precondition' && /index/i.test(e.message)) {
          console.warn('Thiếu index Firestore, dùng fallback (client sort). Hãy tạo index để tối ưu.');
          try {
            const q2 = query(
              collection(db, 'events'),
              where('userId', '==', auth.currentUser.uid)
            );
            const snap2 = await getDocs(q2);
            const events2 = [];
            snap2.forEach(d => events2.push(d.data()));
            events2.sort((a, b) => {
              const da = parseFirestoreDate(a.ngayBatDau) || 0;
              const dbb = parseFirestoreDate(b.ngayBatDau) || 0;
              return dbb - da;
            });
            const suggestions = buildCategorizedTitleSuggestions(events2.slice(0, 120));
            cacheManager.set(cacheKey, suggestions, 300000);
            setCategorizedSuggestions(suggestions);
          } catch (inner) {
            console.warn('Fallback cũng lỗi:', inner);
            setCategorizedSuggestions([]);
          }
        } else {
          console.warn('Không thể tạo gợi ý tiêu đề:', e);
          setCategorizedSuggestions([]);
        }
      } finally {
        setLoadingTitleSuggestions(false);
      }
    };
    run();
  }, [auth.currentUser]);

  // Fallback mặc định nếu chưa có dữ liệu người dùng (indexed by key)
  const DEFAULT_TITLE_SUGGESTIONS = {
    'work': ['Họp nhóm', 'Báo cáo tuần', 'Kế hoạch sprint'],
    'personal': ['Sinh nhật', 'Hẹn cà phê', 'Mua sắm'],
    'study': ['Ôn thi', 'Làm bài tập', 'Đọc tài liệu'],
    'family': ['Ăn tối gia đình', 'Thăm ông bà', 'Chuẩn bị lễ'],
    'health': ['Tập gym', 'Chạy bộ', 'Yoga'],
    'travel': ['Lên lịch chuyến đi', 'Đặt vé', 'Chuẩn bị hành lý'],
    'project': ['Review tiến độ', 'Triển khai tính năng', 'Fix bug'],
    'social': ['Gặp bạn', 'Đi ăn tối', 'Tham gia workshop'],
    'finance': ['Tổng kết chi tiêu', 'Lập ngân sách', 'Theo dõi tiết kiệm'],
    'hobby': ['Đọc sách', 'Chơi game', 'Vẽ tranh']
  };

  function buildCategorizedTitleSuggestions(events) {
    if (!events || events.length === 0) {
      // Trả fallback dạng mảng đã chuẩn hóa
      return Object.entries(DEFAULT_TITLE_SUGGESTIONS).map(([calKey, titles]) => ({
        calendarKey: calKey,
        color: guessCalendarColor(calKey, events) || '#FFD700',
        titles: titles.map(ti => ({ title: ti, freq: 0 }))
      }));
    }
    const byCalendar = {};
    events.forEach(ev => {
      const calKey = ev.lich?.key || 'work';
      const title = ev.tieuDe?.trim();
      if (!title) return;
      if (!byCalendar[calKey]) byCalendar[calKey] = { color: ev.lich?.color || '#FFD700', freqMap: {} };
      byCalendar[calKey].freqMap[title] = (byCalendar[calKey].freqMap[title] || 0) + 1;
    });
    // Xây kết quả
    const result = Object.entries(byCalendar).map(([calKey, obj]) => {
      const arr = Object.entries(obj.freqMap)
        .sort((a,b)=>b[1]-a[1])
        .slice(0,5)
        .map(([title,freq])=>({ title, freq }));
      // Bổ sung fallback nếu ít hơn 3
      if (arr.length < 3 && DEFAULT_TITLE_SUGGESTIONS[calKey]) {
        const needed = 3 - arr.length;
        DEFAULT_TITLE_SUGGESTIONS[calKey].some(fb => {
          if (!arr.find(x=>x.title===fb)) arr.push({ title: fb, freq: 0 });
          return arr.length >= 3;
        });
      }
      return { calendarKey: calKey, color: obj.color, titles: arr };
    });
    // Thêm các lịch chưa có sự kiện để luôn hiển thị đa dạng
    Object.keys(DEFAULT_TITLE_SUGGESTIONS).forEach(calKey => {
      if (!result.find(r => r.calendarKey === calKey)) {
        result.push({
          calendarKey: calKey,
          color: guessCalendarColor(calKey, events) || '#FFD700',
          titles: DEFAULT_TITLE_SUGGESTIONS[calKey].slice(0,3).map(ti => ({ title: ti, freq: 0 }))
        });
      }
    });
    // Giới hạn tổng
    return result.slice(0,10);
  }

  function guessCalendarColor(calKey, events) {
    const found = events?.find(e => e.lich?.key === calKey);
    return found?.lich?.color;
  }

  function onPressTitleSuggestion(calendarKey, color, title) {
    setTieuDe(title);
    // Nếu lịch hiện tại khác lịch gợi ý -> đổi lịch theo gợi ý
    if (lich.key !== calendarKey) setLich({ key: calendarKey, color: color || lich.color });
  }

  const luuSuKien = async () => {
    if (!tieuDe.trim()) return Alert.alert(t('notify', { defaultValue: 'Thông báo' }), t('titleRequired', { defaultValue: 'Tiêu đề không được để trống.' }));
    if (ngayKetThuc < ngayBatDau) return Alert.alert(t('error', { defaultValue: 'Lỗi' }), t('endAfterStart', { defaultValue: 'Ngày kết thúc phải sau ngày bắt đầu.' }));
    if (trungTen) return Alert.alert(t('error', { defaultValue: 'Lỗi' }), t('duplicate_name', { defaultValue: 'Tên Lịch đã tồn tại trong lịch này.' }));
    if (url && !/^https?:\/\//i.test(url)) return Alert.alert(t('error', { defaultValue: 'Lỗi' }), t('invalid_url', { defaultValue: 'URL không hợp lệ.' }));

    try {
      const repeatCode = normalizeRepeat(lapLai);
      
      // Validate thời gian
      let batDau = new Date(ngayBatDau);
      let ketThuc = new Date(ngayKetThuc);

      if (caNgay) {
        batDau.setHours(0, 0, 0, 0);
        ketThuc.setHours(23, 59, 59, 999);
        
        // Validate all-day events: must be today or in future
        const today = moment().format("YYYY-MM-DD");
        const eventDate = moment(batDau).format("YYYY-MM-DD");
        if (eventDate < today) {
          return Alert.alert("Lỗi", "Sự kiện cả ngày phải từ hôm nay trở đi.");
        }
      } else {
        if (batDau < new Date()) {
          return Alert.alert("Lỗi", "Thời gian bắt đầu phải sau hiện tại.");
        }
      }

      // 🔥 SỬA: Nếu chọn lặp lại → chỉ tạo MỘT sự kiện với thông tin lặp lại
      if (!isNoRepeat(repeatCode)) {
        // Xác định cách lặp: theo ngày (date) hay theo thứ (weekday)
        let repeatBy = 'date'; // mặc định lặp theo ngày
        if (repeatCode === 'weekly') {
          repeatBy = 'weekday'; // Hằng tuần → lặp theo thứ
        }
        
        const eventData = {
          userId: auth.currentUser.uid,
          tieuDe,
          lich: { key: lich.key, name: t(lich.key), color: lich.color },
          caNgay,
          ngayBatDau: batDau,
          ngayKetThuc: ketThuc,
          nhieuNgay: [],
          lapLai: renderLapLaiLabel(repeatCode),
          lapLaiCode: repeatCode,
          repeatBy: repeatBy, // 🔥 daily/monthly/yearly: 'date', weekly: 'weekday'
          thongBao,
          diaDiem,
          url,
          ghiChu,
          title_lower: tieuDe.toLowerCase(),
          calendar_name_lower: t(lich.key).toLowerCase(),
        };

        // Tạo docId duy nhất cho sự kiện lặp lại (không phụ thuộc vào ngày)
        const docId = `${lich.key}_${tieuDe}_${Date.now()}`.replace(/\s+/g, '_');
        
        await setDoc(doc(db, "events", docId), eventData);
        
        // Tạo thông báo cho ngày đầu tiên
        await scheduleEventNotification(batDau, eventData);
        
        if (route.params?.onGoBack) route.params.onGoBack();
        Alert.alert(t('success', { defaultValue: 'Thành công' }), t('eventSaved', { defaultValue: 'Lịch lặp lại đã được lưu.' }));
        navigation.goBack();
        return;
      }

      // 🔥 Nếu chọn nhiều ngày cụ thể → tạo sự kiện cho từng ngày
      let dsNgay = [];
      if (nhieuNgay.length > 0) {
        dsNgay = nhieuNgay;
      } else {
        dsNgay = [ngayBatDau];
      }

      dsNgay.sort((a, b) => new Date(a) - new Date(b));

      // 🔥 TỐI ƯU: Batch writes thay vì loop with await - NHANH HƠN 5x
      const batch = writeBatch(db);
      const notificationPromises = [];

      for (let d of dsNgay) {
        const batDauNgay = new Date(d);
        const ketThucNgay = new Date(d);

        if (caNgay) {
          batDauNgay.setHours(0, 0, 0, 0);
          ketThucNgay.setHours(23, 59, 59, 999);
        } else {
          batDauNgay.setHours(ngayBatDau.getHours(), ngayBatDau.getMinutes(), 0, 0);
          ketThucNgay.setHours(ngayKetThuc.getHours(), ngayKetThuc.getMinutes(), 0, 0);
        }

        const eventData = {
          userId: auth.currentUser.uid,
          tieuDe,
          lich: { key: lich.key, name: t(lich.key), color: lich.color },
          caNgay,
          ngayBatDau: batDauNgay,
          ngayKetThuc: ketThucNgay,
          nhieuNgay: dsNgay.map(d => new Date(d).toISOString()),
          lapLai: renderLapLaiLabel('none'),
          lapLaiCode: 'none',
          thongBao,
          diaDiem,
          url,
          ghiChu,
          title_lower: tieuDe.toLowerCase(),
          calendar_name_lower: t(lich.key).toLowerCase(),
        };

        // Tạo docId duy nhất cho từng ngày
        const docId = `${lich.key}_${tieuDe}_${batDauNgay.toISOString().slice(0,10)}_${Date.now()}`.replace(/\s+/g, '_');
        
        // 🚀 BATCH: Thêm vào batch thay vì await
        batch.set(doc(db, "events", docId), eventData);

        // 🔔 Tạo thông báo SONG SONG, không block
        notificationPromises.push(scheduleEventNotification(batDauNgay, eventData));
      }

      // ⚡ Commit batch MỘT LẦN thay vì 500 lần - TỐC ĐỘ TĂNG LÊN 5x+
      await batch.commit();
      
      // Chờ thông báo song song (không block lưu)
      await Promise.allSettled(notificationPromises);

      if (route.params?.onGoBack) route.params.onGoBack();
      Alert.alert(t('success', { defaultValue: 'Thành công' }), t('eventSaved', { defaultValue: 'Lịch đã được lưu.' }));
      navigation.goBack();

    } catch (error) {
      console.error("Lưu Lịch lỗi:", error);
      Alert.alert("Lỗi", "Không thể lưu Lịch.");
    }
  };

  const thayDoiNgay = (e, ngayChon) => {
    // Used only by native picker (which we no longer use); keep for compatibility
    if (e?.type === 'dismissed' || !ngayChon) {
      setShowPicker({ visible: false, type: "", mode: "date" });
      setPendingDate(null);
      return;
    }
    setIosTempDate(ngayChon);
  };


  // Hàm gợi ý slot AI đơn giản: chọn slot dài nhất hoặc gần thời gian hiện tại
async function suggestFreeSlotAI(events, slots, duration) {
  if (!slots || slots.length === 0) return null;

  const now = new Date();
  let bestSlot = null;
  let minDiff = Infinity;

  for (let slot of slots) {
    // Tính thời điểm bắt đầu slot
    const slotStart = new Date(now);
    slotStart.setHours(slot.startHour, slot.startMinute, 0, 0);
    const diff = slotStart - now; // khoảng cách đến giờ hiện tại

    if (diff >= 0 && diff < minDiff) {
      minDiff = diff;
      bestSlot = slot;
    }
  }

  // Nếu không có slot sau giờ hiện tại → lấy slot dài nhất
  if (!bestSlot) {
    bestSlot = slots.reduce((a, b) => (a.length > b.length ? a : b));
  }

  const pad = n => (n < 10 ? "0" + n : n);
  return {
    start: `${pad(bestSlot.startHour)}:${pad(bestSlot.startMinute)}`,
    end: `${pad(bestSlot.endHour)}:${pad(bestSlot.endMinute)}`,
  };
}
const goiYThoiGianTrong = async () => {
  if (!auth.currentUser) return;
  setLoadingSlots(true);
  try {
    // 🚀 CACHE: Kiểm tra cache free slots trước (chỉ cache 2 phút)
    const cacheKey = `${CACHE_KEYS.FREE_SLOTS}_${ngayBatDau.toDateString()}`;
    if (cacheManager.has(cacheKey)) {
      const cached = cacheManager.get(cacheKey);
      setSlotSuggestions(cached.suggestions);
      setShowSlotsModal(true);
      setLoadingSlots(false);
      return;
    }

    let eventsSnap;
    try {
      const qBase = query(
        collection(db, 'events'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('ngayBatDau', 'desc'),
        limit(300)
      );
      eventsSnap = await getDocs(qBase);
    } catch (e) {
      // Fallback nếu thiếu index
      console.warn('Slot query fallback (thiếu index):', e.code);
      const qBase2 = query(collection(db, 'events'), where('userId', '==', auth.currentUser.uid));
      eventsSnap = await getDocs(qBase2);
    }

    const dayEvents = [];
    eventsSnap.forEach(ds => {
      const data = ds.data();
      const start = parseFirestoreDate(data.ngayBatDau);
      const end = parseFirestoreDate(data.ngayKetThuc);
      if (!start || !end) return;
      if (start.toDateString() === ngayBatDau.toDateString()) {
        dayEvents.push({ start, end });
      }
    });

    let desired = thoiLuong || 60;
    let slots = findFreeSlotsForDay(dayEvents.map(d=>({ ngayBatDau:d.start, ngayKetThuc:d.end })), desired, ngayBatDau);
    while (slots.length === 0 && desired > 20) {
      desired = Math.round(desired * 0.75);
      slots = findFreeSlotsForDay(dayEvents.map(d=>({ ngayBatDau:d.start, ngayKetThuc:d.end })), desired, ngayBatDau);
    }
    if (!slots.length) {
      setSlotSuggestions([]);
      Alert.alert(t('no_free_slot', { defaultValue: 'Không có slot trống phù hợp.' }));
      return;
    }

    // Lọc slot từ thời gian hiện tại trở đi
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday = ngayBatDau.toDateString() === now.toDateString();
    
    const futureSlots = isToday 
      ? slots.filter(s => s.startHour * 60 + s.startMinute > nowMinutes)
      : slots;

    if (!futureSlots.length) {
      setSlotSuggestions([]);
      Alert.alert(t('no_free_slot', { defaultValue: 'Không còn slot trống trong ngày hôm nay.' }));
      return;
    }

    // Phân loại theo khung giờ: đêm (0-6), sáng (6-12), chiều (12-18), tối (18-24)
    const categorized = {
      dawn: { label: t('dawn', {defaultValue:'Đêm/Sáng sớm (0h-6h)'}), slots: [] },
      morning: { label: t('morning', {defaultValue:'Sáng (6h-12h)'}), slots: [] },
      afternoon: { label: t('afternoon', {defaultValue:'Chiều (12h-18h)'}), slots: [] },
      evening: { label: t('evening', {defaultValue:'Tối (18h-24h)'}), slots: [] }
    };

    futureSlots.forEach(slot => {
      if (slot.startHour >= 0 && slot.startHour < 6) {
        categorized.dawn.slots.push(slot);
      } else if (slot.startHour >= 6 && slot.startHour < 12) {
        categorized.morning.slots.push(slot);
      } else if (slot.startHour >= 12 && slot.startHour < 18) {
        categorized.afternoon.slots.push(slot);
      } else if (slot.startHour >= 18 && slot.startHour < 24) {
        categorized.evening.slots.push(slot);
      }
    });

    // AI scoring: ưu tiên gần hiện tại, khung giờ vàng (9-11, 14-16, 19-21), độ dài phù hợp
    function score(slot){
      const slotStart = new Date(ngayBatDau);
      slotStart.setHours(slot.startHour, slot.startMinute,0,0);
      const diffMin = (slotStart - now)/60000;
      const len = slot.length;
      const hour = slot.startHour;
      let windowScore = (hour>=9&&hour<12)||(hour>=14&&hour<17)||(hour>=19&&hour<22) ? 30:0;
      let proximity = diffMin>=0 ? Math.max(0, 40 - Math.min(40,diffMin)) : -20;
      let lengthScore = Math.min(30, len*0.2);
      return windowScore + proximity + lengthScore;
    }

    // Sort each category by score
    Object.keys(categorized).forEach(key => {
      categorized[key].slots = categorized[key].slots
        .map(s => ({ ...s, score: score(s) }))
        .sort((a,b) => b.score - a.score)
        .slice(0, 5); // top 5 mỗi khung
    });

    setSlotSuggestions(categorized);
    setShowSlotsModal(true);
  } catch (e) {
    console.error('❌ Lỗi phân tích slot:', e);
    Alert.alert(t('error',{defaultValue:'Lỗi'}), t('cannot_suggest_slot',{defaultValue:'Không thể gợi ý thời gian.'}));
  } finally {
    setLoadingSlots(false);
  }
};




  /* ====================================================================== */

  const bgColor = isDarkMode ? "#0f1720" : "#f7fbff";

  return (
    <ImageBackground 
      source={isDarkMode ? null : require("../assets/bg-tet.jpg")} 
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
      blurRadius={1}
    >
      {/* Main background keeps festive subtle tint */}
      <LinearGradient 
        colors={[
          palette?.surfaceGradientStart || "rgba(211, 47, 47, 0.4)", 
          palette?.surfaceGradientMid || "rgba(255, 215, 0, 0.08)", 
          palette?.surfaceGradientEnd || "rgba(211, 47, 47, 0.4)"
        ]} 
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          {/** Dynamic header gradient based on selected calendar color */}
          {(() => {
            const baseColor = lich.color || '#D32F2F';
            const headerGradientColors = [adjustColor(baseColor, 60), adjustColor(baseColor, 0)];
            return (
              <LinearGradient colors={headerGradientColors} style={styles.headerGradient}>
            <View style={styles.headerRow}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={26} color={adjustColor(baseColor,-20)} />
                    <Text style={[styles.iconText,{color:adjustColor(baseColor,-20)}]}>{t('cancel', { defaultValue: 'Hủy' })}</Text>
                  </TouchableOpacity>
              <View style={styles.headerTitleBox}>
                <Text style={[styles.headerTitle,{color:adjustColor(baseColor,-30)}]}>{t('addEvent', { defaultValue: 'Tạo Lịch Mới' })}</Text>
              </View>
              <TouchableOpacity
                style={[styles.iconBtn, !tieuDe.trim() && { opacity: 0.6 }]}
                onPress={luuSuKien}
                disabled={!tieuDe.trim()}
              >
                <Text style={[styles.iconText,{color:adjustColor(baseColor,-20)}]}>{t('save', { defaultValue: 'Lưu' })}</Text>
                <Ionicons name="checkmark" size={26} color={adjustColor(baseColor,-20)} />
              </TouchableOpacity>
            </View>
              </LinearGradient>
            );
          })()}

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <ScrollView contentContainerStyle={styles.container}>
              {trungTen && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#FF1744" />
                  <Text style={styles.warningText}>{t('duplicate_name', { defaultValue: 'Tên Lịch đã tồn tại' })}</Text>
                </View>
              )}

              {/* Chọn loại lịch */}
              <TouchableOpacity
                style={styles.rowCard}
                onPress={() => navigation.navigate("ManageCalendarsScreen", { selected: lich, onSelect: setLich })}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.colorDot, { backgroundColor: lich.color }]} />
                  <Text style={styles.rowTitle}>{t(lich.key || 'work')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={lich.color || '#FFD700'} />
              </TouchableOpacity>

            {/* Tiêu đề sự kiện + Gợi ý phân loại */}
    <View style={styles.card}>
      <Text style={styles.label}>{t('eventTitle', { defaultValue: 'Tiêu đề Lịch' })}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          style={styles.input}
          placeholder={t('event_placeholder', { defaultValue: 'Nhập tiêu đề sự kiện...' })}
          placeholderTextColor="#cc9a00"
          value={tieuDe}
          onChangeText={setTieuDe}
          autoFocus
        />
        <TouchableOpacity style={[styles.aiButtonNextToInput,{borderColor:lich.color || '#FFD700'}]} onPress={goiYThoiGianTrong}>
          <Ionicons name="help-circle-outline" size={30} color={lich.color || '#D32F2F'} />
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 12 }}>
        {/* Gợi ý tiêu đề theo lịch đã chọn (không ghi chữ AI) */}
        <Text style={[styles.suggestHeader,{color:lich.color || '#D32F2F'}]}>{t(lich.key || 'work')} {t('commonly_used', { defaultValue: 'thường dùng' })}</Text>
        {loadingTitleSuggestions && <Text style={styles.habitLoading}>{t('loading', { defaultValue: 'Đang phân tích...' })}</Text>}
        {!loadingTitleSuggestions && (() => {
          const group = categorizedSuggestions.find(g => g.calendarKey === lich.key);
          const list = group?.titles?.length ? group.titles : (DEFAULT_TITLE_SUGGESTIONS[lich.key] || []).map(ti => ({ title: ti, freq: 0 }));
          const color = group?.color || lich.color || '#FFD700';
          return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {list.map((ti, idx) => (
                  <TouchableOpacity
                    key={`${lich.key}-${ti.title}-${idx}-${Date.now()}`}
                    style={[
                    styles.titleChip,
                    { borderColor: color, backgroundColor: tieuDe === ti.title ? color : '#FFFDF5' },
                  ]}
                  onPress={() => onPressTitleSuggestion(lich.key, color, ti.title)}
                >
                  <Text style={[styles.titleChipText, tieuDe === ti.title && { color: '#fff' }, {color: tieuDe === ti.title ? '#fff' : color}]} numberOfLines={1}>
                    {ti.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          );
        })()}
      </View>
    </View>


              {/* Ngày / Thời gian */}
              <View style={styles.card}>
                <View style={styles.rowSplit}>
                  <Text style={styles.labelSmall}>{t('allDay', { defaultValue: 'Cả ngày' })}</Text>
                  <Switch value={caNgay} onValueChange={setCaNgay} trackColor={{ false: "#767577", true: "#FFD700" }} thumbColor={caNgay ? "#D32F2F" : "#f4f3f4"} />
                </View>

                {!caNgay && (
                  <>
                    <View style={styles.rowSplit}>
                      <Text style={styles.labelSmall}>{t('start', { defaultValue: 'Bắt đầu' })}</Text>
                      <TouchableOpacity onPress={() => openPicker("start")}>
                        <Text style={styles.timeText}>{formatDateTime(ngayBatDau, language)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.rowSplit}>
                      <Text style={styles.labelSmall}>{t('end', { defaultValue: 'Kết thúc' })}</Text>
                      <TouchableOpacity onPress={() => openPicker("end")}>
                        <Text style={styles.timeText}>{formatDateTime(ngayKetThuc, language)}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {caNgay && (
                  <View style={styles.rowSplit}>
                    <Text style={styles.labelSmall}>{t('day', { defaultValue: 'Ngày' })}</Text>
                    <TouchableOpacity onPress={() => openPicker("start")}>
                      <Text style={styles.timeText}>{new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(ngayBatDau)}</Text>
                    </TouchableOpacity>
                  </View>
                )}


                </View>
                {/* ===== end thời lượng ===== */}
        

              {/* Lặp lại / Thông báo / Nhiều ngày */}
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.rowOption}
                  onPress={() => navigation.navigate("RepeatScreen", { selected: lapLai, onSelect: setLapLai })}
                >
                  <Text style={styles.rowTitle}>{t('repeat', { defaultValue: 'Lặp lại' })}</Text>
                  <View style={styles.rowRightBox}>
                    <Text style={styles.rowSub}>{renderLapLaiLabel(lapLai)}</Text>
                    <Ionicons name="chevron-forward" size={22} color={lich.color || '#FFD700'} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rowOption}
                  onPress={() => {
                    navigation.navigate("NotificationScreen", {
                      selected: thongBao,
                      onSelect: (val) => {
                        console.log('Selected thongBao:', val);
                        setThongBao(val);
                        setForceUpdate(f => f + 1);
                      },
                      eventData: {
                        tieuDe,
                        ngayBatDau,
                        ngayKetThuc,
                        caNgay,
                        id: null,
                        location: diaDiem,
                        description: ghiChu,
                        lich,
                        calendarColor: lich.color
                      }
                    });
                  }}
                >
                  <Text style={styles.rowTitle}>{t('notification', { defaultValue: 'Thông báo' })}</Text>
                  <View style={styles.rowRightBox}>
                    <Text style={styles.rowSub} key={forceUpdate}>{
                      offsetLabels[thongBao] ||
                      (thongBao.endsWith('m') ? `${parseInt(thongBao)} phút trước` :
                        thongBao.endsWith('h') ? `${parseInt(thongBao)} giờ trước` :
                        thongBao.endsWith('d') ? `${parseInt(thongBao)} ngày trước` :
                        thongBao === 'none' ? t('none', { defaultValue: 'Không thông báo' }) : thongBao)
                    }</Text>
                    <Ionicons name="chevron-forward" size={22} color={lich.color || '#FFD700'} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rowOption}
                  onPress={() => navigation.navigate("MultiDayScreen", { selectedDates: nhieuNgay, onSelect: setNhieuNgay })}
                >
                  <Text style={styles.rowTitle}>{t('multiDays', { defaultValue: 'Nhiều ngày' })}</Text>
                  <View style={styles.rowRightBox}>
                    <Text style={styles.rowSub}>{nhieuNgay.length === 0 ? t('none', { defaultValue: 'Không' }) : `${nhieuNgay.length} ${t('day_count', { defaultValue: 'ngày' })}`}</Text>
                    <Ionicons name="chevron-forward" size={22} color={lich.color || '#FFD700'} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Thông tin chi tiết */}
              <View style={styles.card}>
                <Text style={styles.label}>{t('location', { defaultValue: 'Địa điểm' })}</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={diaDiem}
                  onChangeText={setDiaDiem}
                  placeholder={t('location_placeholder', { defaultValue: 'Nhập địa điểm...' })}
                  placeholderTextColor="#cc9a00"
                />

                <Text style={[styles.label, { marginTop: 12 }]}>{t('url', { defaultValue: 'URL' })}</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={url}
                  onChangeText={setUrl}
                  placeholder={t('url_placeholder', { defaultValue: 'Nhập URL liên kết...' })}
                  placeholderTextColor="#cc9a00"
                />


                  <Text style={[styles.label, { marginTop: 12 }]}>{t('note', { defaultValue: 'Ghi chú' })}</Text>
                  <TextInput
                    style={styles.inputArea}
                    value={ghiChu}
                    onChangeText={setGhiChu}
                    placeholder={t('note_placeholder', { defaultValue: 'Ghi chú chi tiết sự kiện...' })}
                    placeholderTextColor="#cc9a00"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Nút lưu */}
                <TouchableOpacity style={styles.primaryButton} onPress={luuSuKien} disabled={!tieuDe.trim()}>
                  {(() => {
                    const baseColor = lich.color || '#FFD700';
                    const btnColors = [adjustColor(baseColor,40), adjustColor(baseColor,-10)];
                    return (
                      <LinearGradient colors={btnColors} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Text style={[styles.primaryButtonText,{color:adjustColor(baseColor,-40)}]}>{t('save', { defaultValue: 'Lưu Sự Kiện' })}</Text>
                      </LinearGradient>
                    );
                  })()}
                </TouchableOpacity>
              </ScrollView>

              {showPicker.visible && (
                <CupertinoPickerSheet
                  type={showPicker.type}
                  initialDate={showPicker.type === 'start' ? ngayBatDau : ngayKetThuc}
                  initialTab={showPicker.initialTab}
                  onCancel={() => { setShowPicker({ visible:false, type:"", mode:"date" }); setIosTempDate(null); }}
                  onConfirm={(chosen) => {
                    if (showPicker.type === 'start') {
                      setNgayBatDau(chosen);
                      if (chosen > ngayKetThuc) setNgayKetThuc(chosen);
                    } else {
                      if (chosen < ngayBatDau) Alert.alert(t('error', {defaultValue:'Lỗi'}), t('endAfterStart', {defaultValue:'Ngày kết thúc phải sau ngày bắt đầu.'}));
                      else setNgayKetThuc(chosen);
                    }
                    setShowPicker({ visible:false, type:"", mode:"date" });
                    setIosTempDate(null);
                  }}
                />
              )}

         {showSlotsModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>
        {t('suggest_slots_title', { defaultValue: 'Thời gian rảnh từ bây giờ' })}
      </Text>
      <ScrollView style={{ maxHeight: 400 }}>
        {(() => {
          const now = new Date();
          const categories = ['dawn', 'morning', 'afternoon', 'evening'];
          let firstSlot = null;
          
          return categories.map(catKey => {
            const category = slotSuggestions[catKey];
            if (!category || !category.slots || category.slots.length === 0) return null;
            
            return (
              <View key={catKey} style={{ marginBottom: 16 }}>
                <Text style={styles.categoryLabel}>{category.label}</Text>
                {category.slots.map((slot, idx) => {
                  const isFirst = !firstSlot && idx === 0;
                  if (isFirst) firstSlot = slot;
                  
                  return (
                    <TouchableOpacity
                      key={`${catKey}-${idx}`}
                      style={[
                        styles.slotBtn,
                        isFirst && { backgroundColor: '#FFD700', borderWidth: 2, borderColor: '#D32F2F' }
                      ]}
                      onPress={() => {
                        const start = new Date(ngayBatDau);
                        start.setHours(slot.startHour, slot.startMinute, 0, 0);
                        const end = new Date(start.getTime() + Number(thoiLuong || 60) * 60000);
                        const slotEnd = new Date(ngayBatDau);
                        slotEnd.setHours(slot.endHour, slot.endMinute, 0, 0);
                        if (end > slotEnd) end.setTime(slotEnd.getTime());
                        setNgayBatDau(start);
                        setNgayKetThuc(end);
                        setShowSlotsModal(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.slotText, isFirst && { color: '#D32F2F', fontWeight: 'bold' }]}>
                          {`${String(slot.startHour).padStart(2,'0')}:${String(slot.startMinute).padStart(2,'0')} - ${String(slot.endHour).padStart(2,'0')}:${String(slot.endMinute).padStart(2,'0')}`}
                        </Text>
                        <Text style={[styles.slotDuration, isFirst && { color: '#D32F2F', fontWeight: 'bold' }]}>
                          {`${Math.floor(slot.length/60)}h${slot.length%60>0?` ${slot.length%60}m`:''}`}
                        </Text>
                      </View>
                      {isFirst && (
                        <Text style={{ fontSize: 11, color: '#D32F2F', marginTop: 4, fontWeight: '600' }}>
                          ⭐ {t('recommended', {defaultValue:'Gợi ý tốt nhất'})}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          });
        })()}
      </ScrollView>
      <TouchableOpacity onPress={() => setShowSlotsModal(false)} style={styles.closeModalBtn}>
        <Text style={styles.closeModalText}>{t('close', { defaultValue: 'Đóng' })}</Text>
      </TouchableOpacity>
    </View>
  </View>
)}

            </KeyboardAvoidingView>
          </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

function daysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  // leading blanks to align weekday start (Mon-Sun or Sun-Sat? use Mon-Sun visual)
  let startWeekday = (first.getDay() + 6) % 7; // Monday=0
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function CupertinoPickerSheet({ type, initialDate, initialTab = 'date', onCancel, onConfirm }) {
  const [visibleMonth, setVisibleMonth] = useState(initialDate.getMonth());
  const [visibleYear, setVisibleYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate));
  const [hour, setHour] = useState(initialDate.getHours());
  const [minute, setMinute] = useState(initialDate.getMinutes());
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const itemHeight = 50;
  const [tab, setTab] = useState(initialTab); // 'date' | 'time'

  const dayCells = useMemo(() => daysInMonth(visibleYear, visibleMonth), [visibleYear, visibleMonth]);

  const applyConfirm = () => {
    const d = new Date(selectedDate);
    d.setHours(hour, minute, 0, 0);
    onConfirm?.(d);
  };

  const changeMonth = (delta) => {
    let m = visibleMonth + delta;
    let y = visibleYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setVisibleMonth(m);
    setVisibleYear(y);
  };

  const wheelItemStyle = { height: itemHeight, justifyContent: 'center', alignItems: 'center' };

  return (
    <View style={styles.iosPickerSheet}>
      <View style={styles.iosPickerBar}>
        <TouchableOpacity onPress={onCancel}><Text style={styles.iosPickerAction}>Hủy</Text></TouchableOpacity>
        <TouchableOpacity onPress={applyConfirm}><Text style={[styles.iosPickerAction, styles.iosPickerActionConfirm]}>Lưu</Text></TouchableOpacity>
      </View>
      {/* Segmented tabs for Date / Time */}
      <View style={styles.segmentBar}>
        <TouchableOpacity style={[styles.segmentBtn, tab==='date' && styles.segmentBtnActive]} onPress={()=>setTab('date')}>
          <Text style={[styles.segmentText, tab==='date' && styles.segmentTextActive]}>Ngày</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentBtn, tab==='time' && styles.segmentBtnActive]} onPress={()=>setTab('time')}>
          <Text style={[styles.segmentText, tab==='time' && styles.segmentTextActive]}>Giờ</Text>
        </TouchableOpacity>
      </View>

      {tab==='date' && (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity style={styles.calNavBtn} onPress={() => changeMonth(-1)}><Ionicons name="chevron-back" size={22} color="#D32F2F"/></TouchableOpacity>
          <Text style={{ fontWeight: '700', color: '#D32F2F' }}>{`${visibleMonth+1}/${visibleYear}`}</Text>
          <TouchableOpacity style={styles.calNavBtn} onPress={() => changeMonth(1)}><Ionicons name="chevron-forward" size={22} color="#D32F2F"/></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          {['T2','T3','T4','T5','T6','T7','CN'].map((w) => (<Text key={w} style={{ width: `${100/7}%`, textAlign: 'center', color: '#cc9a00', fontWeight: '600' }}>{w}</Text>))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {dayCells.map((d, idx) => {
            const isSelected = d && d.getFullYear()===selectedDate.getFullYear() && d.getMonth()===selectedDate.getMonth() && d.getDate()===selectedDate.getDate();
            const today = new Date();
            const isToday = d && d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
            return (
              <TouchableOpacity key={idx} style={[styles.calDayCell, isSelected && styles.calDayCellSelected, isToday && !isSelected && styles.calDayCellToday]} disabled={!d} onPress={() => d && setSelectedDate(new Date(d))}>
                <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected, isToday && !isSelected && styles.calDayTextToday]}>{d ? d.getDate() : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <TouchableOpacity style={styles.nextBtn} onPress={()=>setTab('time')}>
            <Text style={styles.nextBtnText}>Tiếp tục chọn giờ</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {tab==='time' && (
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Text style={styles.timeSectionLabel}>Chọn giờ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {Array.from({ length: 24 }, (_, h)=>h).map(h => (
            <TouchableOpacity key={h} style={[styles.timeChip, h===hour && styles.timeChipActive]} onPress={()=>setHour(h)}>
              <Text style={[styles.timeChipText, h===hour && styles.timeChipTextActive]}>{String(h).padStart(2,'0')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.timeSectionLabel,{ marginTop: 12 }]}>Chọn phút</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {Array.from({ length: 60 }, (_, i) => i).map(m => (
            <TouchableOpacity key={m} style={[styles.timeChip, m===minute && styles.timeChipActive]} onPress={()=>setMinute(m)}>
              <Text style={[styles.timeChipText, m===minute && styles.timeChipTextActive]}>{String(m).padStart(2,'0')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      )}
    </View>
  );
}

/* ===== Styles TẾT 2026 ===== */
const styles = StyleSheet.create({
  iosPickerSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fefefe', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 12,
  },
  iosPickerBar: {
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  iosPickerAction: { fontSize: 16, color: '#D32F2F', fontWeight: '600' },
  iosPickerActionConfirm: { color: '#007AFF' },
  segmentBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FFF8E1', borderRadius: 12, borderWidth: 1.5, borderColor: '#FFD700' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentBtnActive: { backgroundColor: '#FFD700' },
  segmentText: { color: '#D32F2F', fontWeight: '700' },
  segmentTextActive: { color: '#fff' },
  calNavBtn: { padding: 6, borderRadius: 10, backgroundColor: '#FFF8E1' },
  calDayCell: { width: `${100/7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  calDayCellSelected: { backgroundColor: '#FFD700', borderRadius: 10 },
  calDayCellToday: { borderWidth: 1.5, borderColor: '#007AFF', borderRadius: 10 },
  calDayText: { color: '#D32F2F', fontWeight: '600' },
  calDayTextSelected: { color: '#fff', fontWeight: '800' },
  calDayTextToday: { color: '#007AFF', fontWeight: '700' },
  wheelContainer: { height: 180, position: 'relative' },
  wheel: { height: 180, borderWidth: 1.5, borderColor: '#FFD700', borderRadius: 14, backgroundColor: '#FFFDF5' },
  wheelCenterOverlay: { position: 'absolute', left: 0, right: 0, top: 65, height: 50, justifyContent: 'center', alignItems: 'center' },
  wheelCenterBar: { height: 50, width: '95%', borderWidth: 2, borderColor: '#FFD700', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
  wheelText: { color: '#D32F2F', fontSize: 18, fontWeight: '700' },
  wheelTextSelected: { color: '#007AFF', fontSize: 20, fontWeight: '800' },
  wheelTextDim: { color: '#b36b00' },
  timeSectionLabel: { color: '#cc9a00', fontWeight: '700', marginBottom: 8, fontSize: 14 },
  chipsRow: { gap: 8 },
  timeChip: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFF8E1', borderRadius: 12, borderWidth: 1.5, borderColor: '#FFD700', marginRight: 8 },
  timeChipActive: { backgroundColor: '#FFD700' },
  timeChipText: { color: '#D32F2F', fontWeight: '700' },
  timeChipTextActive: { color: '#fff', fontWeight: '800' },
  nextBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFD700', borderRadius: 12, borderWidth: 1.5, borderColor: '#FFD700' },
  nextBtnText: { color: '#D32F2F', fontWeight: '800' },
aiButtonNextToInput: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#fff",
  justifyContent: "center",
  alignItems: "center",
  marginLeft: 12,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
  elevation: 10,
  borderWidth: 2,
  borderColor: "#FFD700",
},
  headerGradient: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 12 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconText: { color: "#D32F2F", fontWeight: "bold", fontSize: 18 },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { color: "#D32F2F", fontSize: 24, fontWeight: "900" },

  container: { padding: 20, paddingBottom: 60 },
  warningBox: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#fff3f3", borderRadius: 16, borderWidth: 2, borderColor: "#FFD700", marginBottom: 16, elevation: 5 },
  warningText: { marginLeft: 10, color: "#FF1744", fontWeight: "bold", fontSize: 16 },

  rowCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: "#fff", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 10, borderWidth: 1.5, borderColor: "#FFD700" },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  colorDot: { width: 18, height: 18, borderRadius: 9, marginRight: 14, borderWidth: 2, borderColor: "#D32F2F" },
  rowTitle: { fontSize: 18, fontWeight: "bold", color: "#D32F2F" },
  rowSub: { fontSize: 15, color: "#cc9a00", fontWeight: "600" },

  card: { borderRadius: 20, padding: 16, marginBottom: 16, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 10, borderWidth: 1.5, borderColor: "#FFD700" },

  label: { fontSize: 15, fontWeight: "bold", marginBottom: 10, color: "#D32F2F" },
  labelSmall: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#D32F2F" },
  input: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 17, backgroundColor: "#fff", borderWidth: 2, borderColor: "#FFD700", color: "#333", flex: 1 },
  inputSmall: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, backgroundColor: "#fff", borderWidth: 2, borderColor: "#FFD700", color: "#333" },
  inputArea: { borderRadius: 12, padding: 14, fontSize: 16, textAlignVertical: "top", backgroundColor: "#fff", borderWidth: 2, borderColor: "#FFD700", color: "#333" },

  rowSplit: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  timeText: { color: "#333", fontWeight: "bold", fontSize: 16 },
  rowOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#FFD700" },
  rowRightBox: { flexDirection: "row", alignItems: "center", gap: 10 },

  primaryButton: { marginTop: 12, marginBottom: 40, marginHorizontal: 20, borderRadius: 20, overflow: "hidden", elevation: 10, shadowColor: "#FFD700", shadowOpacity: 0.5, shadowRadius: 10 },

  primaryButtonText: { color: "#D32F2F", fontSize: 18, fontWeight: "bold" },

  // modal styles
  modalOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center"
  },
  modalBox: { backgroundColor: "#fff", padding: 24, borderRadius: 24, width: "90%", maxHeight: '80%', elevation: 20, borderWidth: 2, borderColor: "#FFD700" },
  categoryLabel: { fontSize: 16, fontWeight: 'bold', color: '#D32F2F', marginBottom: 8, marginTop: 4 },
  slotBtn: { padding: 14, borderBottomWidth: 1, borderColor: "#FFD700", borderRadius: 12, marginBottom: 8, backgroundColor: '#FFFDF5' },
  slotText: { color: "#D32F2F", fontSize: 16, fontWeight: '600' },
  slotDuration: { color: '#cc9a00', fontSize: 14, fontWeight: '600' },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#D32F2F", marginBottom: 16, textAlign: "center" },
  closeModalBtn: { marginTop: 16, paddingVertical: 12, backgroundColor: "#FFD700", borderRadius: 16, alignItems: "center" },
  closeModalText: { color: "#D32F2F", fontWeight: "bold", fontSize: 18 },
  iconButton: {
  width: 60,
  height: 60,
  borderRadius: 30,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 10,
},
  suggestHeader: { color: '#D32F2F', fontWeight: '700', marginBottom: 6 },
  titleChip: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFFDF5', borderRadius: 18, marginRight: 10, borderWidth: 2 },
  titleChipText: { color: '#D32F2F', fontWeight: '600', maxWidth: 140 },
  habitLoading: { color: '#cc9a00' },
  slotRefreshBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF8E1', paddingVertical:8, paddingHorizontal:14, borderRadius:18, borderWidth:2, borderColor:'#FFD700' },
  slotRefreshText:{ marginLeft:8, color:'#D32F2F', fontWeight:'600' },
  slotChip:{ paddingVertical:8, paddingHorizontal:14, backgroundColor:'#FFEFB3', borderRadius:18, marginRight:10, borderWidth:1.5, borderColor:'#FFD700' },
  slotChipText:{ color:'#D32F2F', fontWeight:'600' },
  noSlotText:{ color:'#cc9a00', fontStyle:'italic' },
});