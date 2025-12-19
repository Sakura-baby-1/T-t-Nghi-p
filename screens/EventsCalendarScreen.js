// screens/EventsCalendarScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TouchableWithoutFeedback,
  Modal,
  Alert,
  ImageBackground,
  TextInput,
  Switch,
  Animated,
  Platform,
  PanResponder,
  Dimensions,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import useTheme from "../hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";
import moment from "moment";
import 'moment/locale/vi';
import { solar2lunar } from "../utils/lunarCalendar";
import { askAI } from "../utils/ai";
import { generateRepeatDates } from "../utils/repeatEvents";
import Toast from "react-native-toast-message";
import { useTranslation } from 'react-i18next';
import * as Haptics from "expo-haptics";
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const isNoRepeat = (val) => {
  const v = (val || "").trim().toLowerCase();
  return ["", "không", "khong", "none", "no", "không lặp lại", "khong lap lai", "no repeat", "no-repeat"].includes(v);
};
// Map ngày lễ -> translation key
const holidayKeys = {
  // ========== NĂM 2025 ==========
  // Ngày lễ Dương lịch
  "2025-01-01": "holiday_new_year",           // Tết Dương lịch
  "2025-04-30": "holiday_reunification",      // Giải phóng miền Nam
  "2025-05-01": "holiday_labour",             // Quốc tế Lao động
  "2025-09-02": "holiday_independence",       // Quốc khánh
  "2025-12-25": "holiday_christmas",          // Giáng sinh
  
  // Tết Nguyên Đán 2025 (Ất Tỵ)
  "2025-01-28": "holiday_tet_eve",            // 29 Tết (Giao thừa)
  "2025-01-29": "holiday_tet_day1",           // Mùng 1 Tết
  "2025-01-30": "holiday_tet_day2",           // Mùng 2 Tết
  "2025-01-31": "holiday_tet_day3",           // Mùng 3 Tết
  "2025-02-01": "holiday_tet_day4",           // Mùng 4 Tết
  
  // Ngày lễ Âm lịch 2025
  "2025-02-12": "holiday_full_moon_first",    // Rằm tháng Giêng (15/1 âm)
  "2025-04-07": "holiday_hung_kings",         // Giỗ Tổ Hùng Vương (10/3 âm)
  "2025-05-12": "holiday_buddha_birthday",    // Phật Đản (15/4 âm)
  "2025-10-07": "holiday_mid_autumn",         // Tết Trung thu (15/8 âm)
  "2025-11-20": "holiday_teachers_day",       // Ngày Nhà giáo Việt Nam
  
  // ========== NĂM 2026 ==========
  // Ngày lễ Dương lịch
  "2026-01-01": "holiday_new_year",           // Tết Dương lịch
  "2026-04-30": "holiday_reunification",      // Giải phóng miền Nam
  "2026-05-01": "holiday_labour",             // Quốc tế Lao động
  "2026-09-02": "holiday_independence",       // Quốc khánh
  "2026-12-25": "holiday_christmas",          // Giáng sinh
  
  // Tết Nguyên Đán 2026 (Bính Ngọ)
  "2026-02-16": "holiday_tet_eve",            // 29 Tết (Giao thừa)
  "2026-02-17": "holiday_tet_day1",           // Mùng 1 Tết
  "2026-02-18": "holiday_tet_day2",           // Mùng 2 Tết
  "2026-02-19": "holiday_tet_day3",           // Mùng 3 Tết
  "2026-02-20": "holiday_tet_day4",           // Mùng 4 Tết
  
  // Ngày lễ Âm lịch 2026
  "2026-03-03": "holiday_full_moon_first",    // Rằm tháng Giêng (15/1 âm)
  "2026-03-28": "holiday_hung_kings",         // Giỗ Tổ Hùng Vương (10/3 âm)   
  "2026-05-31": "holiday_buddha_birthday",    // Phật Đản (15/4 âm)
  "2026-09-26": "holiday_mid_autumn",         // Tết Trung thu (15/8 âm)
  "2026-11-20": "holiday_teachers_day",       // Ngày Nhà giáo Việt Nam
};

// --- Thứ tự ưu tiên lịch ---
const calendarPriority = {
  study: 1,
  work: 2,
  health: 3,
  family: 4,
  personal: 5,
  project: 6,
  finance: 7,
  social: 8,
  travel: 9,
  hobby: 10,
};

// --- Màu theo key lịch ---
const calendarColors = {
  study: "#42a5f5",
  work: "#7b61ff",
  health: "#ef5350",
  family: "#66bb6a",
  personal: "#ff7043",
  project: "#ab47bc",
  finance: "#26a69a",
  social: "#29b6f6",
  travel: "#ffa726",
  hobby: "#ffca28",
  holiday: "#FF7043",
};

// --- Map tên lịch sang key ---
const nameToKey = {
  "Học tập": "study",
  "Công việc": "work",
  "Sức khỏe": "health",
  "Gia đình": "family",
  "Cá nhân": "personal",
  "Dự án": "project",
  "Tài chính": "finance",
  "Sự kiện xã hội": "social",
  "Du lịch": "travel",
  "Sở thích": "hobby",
  "Ngày lễ": "holiday",
};

// --- Lấy màu từ lich object ---
const getEventColor = (lich) => {
  if (!lich) return "#a04379ff";
  return lich.color || calendarColors[lich.key || nameToKey[lich.name]] || "#43A047";
};

// --- Lấy icon theo loại lịch ---
const getCalendarIcon = (key) => {
  const icons = {
    work:        { icon: 'briefcase',        emoji: '💼' },
    personal:    { icon: 'heart',            emoji: '❤️' },
    study:       { icon: 'book-open-variant',emoji: '📚' },
    family:      { icon: 'home-heart',       emoji: '🏠' },
    health:      { icon: 'heart-pulse',      emoji: '💪' },
    travel:      { icon: 'airplane',         emoji: '✈️' },
    project:     { icon: 'lightbulb-on',     emoji: '💡' },
    social:      { icon: 'account-group',    emoji: '🎉' },
    finance:     { icon: 'wallet',           emoji: '💰' },
    hobby:       { icon: 'star',             emoji: '🎨' },
  };
  return icons[key] || { icon: 'rocket', emoji: '🚀' };
};

// (Giữ nguyên màu sự kiện; không tô màu toàn bộ màn hình)

// --- AI xếp lịch thông minh ---
const smartScheduleAI = (events = []) => {
  return [...events].sort((a, b) => {
    const aKey = a.lich?.key || "personal";
    const bKey = b.lich?.key || "personal";

    if (calendarPriority[aKey] !== calendarPriority[bKey]) {
      return calendarPriority[aKey] - calendarPriority[bKey];
    }

    const aDate = a.ngayBatDau?.toDate?.() || new Date(a.ngayBatDau);
    const bDate = b.ngayBatDau?.toDate?.() || new Date(b.ngayBatDau);
    return aDate - bDate;
  });
};

export default function EventsCalendarScreen() {
  const { t } = useTranslation();
  const [events, setEvents] = useState({});
  const [eventsByDate, setEventsByDate] = useState({});
  const [allEvents, setAllEvents] = useState([]);
  const [selectedView, setSelectedView] = useState("month");
  const [aiScheduledAt, setAiScheduledAt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [selectedWeekStart, setSelectedWeekStart] = useState(moment().startOf('week').format("YYYY-MM-DD"));
  const [showModal, setShowModal] = useState(false);
  const [modalEvents, setModalEvents] = useState([]);
  const [modalDate, setModalDate] = useState("");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [aiEventCount, setAiEventCount] = useState(0);
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportIsLoading, setExportIsLoading] = useState(false);
  
  // FAB draggable position
  const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // FAB Animation values
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabTranslateY = useRef(new Animated.Value(0)).current;
  const fabOpacity = useRef(new Animated.Value(1)).current;

  // FAB Animation effect - TỐI ƯU: chỉ chạy khi cần thiết
  useEffect(() => {
    // Kiểm tra xem có cần animation không (tắt trong low-performance mode)
    if (!isDarkMode) return; // Chỉ chạy animation trong dark mode để tiết kiệm tài nguyên
    
    // Bounce effect MẠNH MẼ
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.25,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    // Float effect SỐNG ĐỘNG
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(fabTranslateY, {
          toValue: -8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(fabTranslateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow effect NỔI BẬT - BỎ để giảm lag
    // const glow = Animated.loop(...)

    pulse.start();
    float.start();

    return () => {
      pulse.stop();
      float.stop();
    };
  }, [isDarkMode]); // Chỉ chạy lại khi dark mode thay đổi
  
  // Tính năng mới
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchBy, setSearchBy] = useState('title'); // 'title', 'calendar', 'date'
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState("");
  const [quickAddTime, setQuickAddTime] = useState("09:00");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const navigation = useNavigation();
  const { palette, isDarkMode } = useTheme();

  // Cấu hình notifications
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Request permissions
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    };
    
    if (notificationsEnabled) {
      requestPermissions();
    }
  }, [notificationsEnabled]);

  // dayDominantColor removed per request (only color events themselves)



const handleAiSmartSchedule = async () => {
  const allEvents = Object.values(eventsByDate).flat();
  if (!allEvents.length) {
    Toast.show({
      type: "info",
      text1: "ℹ️ Thông báo",
      text2: "Không có sự kiện để xếp lịch",
      position: "top",
    });
    return;
  }

  // Hiển thị modal xác nhận đẹp
  setAiEventCount(allEvents.length);
  setShowAiConfirmModal(true);
};

// Hàm thực hiện xếp lịch AI
const performAiScheduling = async () => {
  try {
    setAiIsLoading(true);
    const allEvents = Object.values(eventsByDate).flat();

    // Hiển thị loading
    Toast.show({
      type: "info",
      text1: "🤖 AI đang phân tích...",
      text2: "Vui lòng đợi trong giây lát",
      position: "top",
      visibilityTime: 2000,
    });

    console.log("📤 Gửi danh sách sự kiện cho AI:", allEvents.length, "sự kiện");

    // Chuẩn bị dữ liệu cho AI
    const eventsSummary = allEvents.map((ev) => {
      const start = ev.ngayBatDau?.toDate?.() || new Date(ev.ngayBatDau);
      const end = ev.ngayKetThuc?.toDate?.() || new Date(ev.ngayKetThuc);
      
      return {
        id: ev.id,
        title: ev.tieuDe,
        category: ev.lich?.name || "Cá nhân",
        categoryKey: ev.lich?.key || "personal",
        startTime: moment(start).format("YYYY-MM-DD HH:mm"),
        endTime: moment(end).format("YYYY-MM-DD HH:mm"),
        isAllDay: ev.caNgay || false,
        location: ev.diaDiem || "",
        priority: calendarPriority[ev.lich?.key] || 5,
      };
    });

    // Prompt cho AI
    const prompt = `
Bạn là trợ lý xếp lịch thông minh. Phân tích danh sách sự kiện và sắp xếp lại theo thứ tự ưu tiên và thời gian hợp lý nhất.

NGUYÊN TẮC XẾP LỊCH:
1. Ưu tiên theo loại lịch (priority thấp = quan trọng hơn):
   - Học tập (study): 1 - ưu tiên cao nhất
   - Công việc (work): 2 
   - Sức khỏe (health): 3
   - Gia đình (family): 4
   - Cá nhân (personal): 5
   - Dự án (project): 6
   - Tài chính (finance): 7
   - Sự kiện xã hội (social): 8
   - Du lịch (travel): 9
   - Sở thích (hobby): 10

2. Trong cùng ngày, xếp theo thứ tự:
   - Sự kiện cả ngày lên đầu
   - Sự kiện có priority thấp hơn xếp trước
   - Nếu cùng priority, xếp theo thời gian bắt đầu

3. Tránh trùng giờ: Nếu có 2 sự kiện trùng giờ, ưu tiên sự kiện có priority thấp hơn

4. Tối ưu thời gian: Sắp xếp sao cho hợp lý trong ngày (không nhảy múi giờ)

DANH SÁCH SỰ KIỆN:
${JSON.stringify(eventsSummary, null, 2)}

HÃY TRẢ VỀ JSON ARRAY với cấu trúc giống input, đã sắp xếp theo nguyên tắc trên.
CHỈ TRẢ VỀ JSON, KHÔNG THÊM CHÚ THÍCH HAY VĂN BẢN NÀO KHÁC.
`;

            const aiResponse = await askAI(prompt, "Bạn là trợ lý xếp lịch thông minh, chuyên gia về quản lý thời gian.");

            console.log("📥 AI response:", aiResponse?.substring(0, 200) + "...");    // Parse response
    let scheduled = [];
    try {
      // Tìm JSON array trong response
      const jsonStart = aiResponse.indexOf("[");
      const jsonEnd = aiResponse.lastIndexOf("]") + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("Không tìm thấy JSON array trong response");
      }
      
      const jsonStr = aiResponse.slice(jsonStart, jsonEnd);
      const parsedData = JSON.parse(jsonStr);
      
      // Map dữ liệu AI trả về với sự kiện gốc
      scheduled = parsedData.map(aiEvent => {
        const originalEvent = allEvents.find(ev => ev.id === aiEvent.id);
        return originalEvent || aiEvent;
      });

              console.log("✅ Đã parse được", scheduled.length, "sự kiện từ AI");    } catch (err) {
              console.warn("⚠️ Không parse được JSON từ AI, dùng sắp xếp local:", err.message);      // Fallback: Sắp xếp local theo priority
      scheduled = [...allEvents].sort((a, b) => {
        const aKey = a.lich?.key || "personal";
        const bKey = b.lich?.key || "personal";
        const aPriority = calendarPriority[aKey] || 5;
        const bPriority = calendarPriority[bKey] || 5;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        const aDate = a.ngayBatDau?.toDate?.() || new Date(a.ngayBatDau);
        const bDate = b.ngayBatDau?.toDate?.() || new Date(b.ngayBatDau);
        return aDate - bDate;
      });
    }

    if (!scheduled || scheduled.length === 0) {
      throw new Error("Không có sự kiện nào sau khi xếp lịch");
    }

    // Log kết quả
    console.log("📋 === KẾT QUẢ XẾP LỊCH TỪ AI ===");
    scheduled.slice(0, 5).forEach((ev, idx) => {
      const start = ev.ngayBatDau?.toDate?.() || new Date(ev.ngayBatDau);
      console.log(`${idx + 1}. ${ev.tieuDe} (${ev.lich?.name}) - ${moment(start).format("DD/MM HH:mm")} - Priority: ${calendarPriority[ev.lich?.key] || 5}`);
    });

    // Gom sự kiện theo ngày
    const newEventsByDate = {};
    scheduled.forEach((ev) => {
      const dateStr = moment(ev.ngayBatDau?.toDate?.() || ev.ngayBatDau).format("YYYY-MM-DD");
      if (!newEventsByDate[dateStr]) newEventsByDate[dateStr] = [];
      newEventsByDate[dateStr].push(ev);
    });

    // Cập nhật Calendar
    const newMarked = {};
    Object.keys(newEventsByDate).forEach((dateStr) => {
      newMarked[dateStr] = {
        dots: newEventsByDate[dateStr].map((ev, idx) => ({
          key: `${ev.id}-${dateStr}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          color: ev.lich?.color || calendarColors[ev.lich?.key] || "#2196F3",
        })),
      };
    });

    setEventsByDate(newEventsByDate);
    setEvents(newMarked);

    // Schedule notifications cho tất cả sự kiện
    if (notificationsEnabled) {
      scheduled.forEach(async (ev) => {
        await scheduleEventNotification(ev);
      });
      console.log('✅ Đã schedule notifications cho', scheduled.length, 'sự kiện');
    }

    // Tự động chuyển đến ngày đầu tiên có sự kiện
    const firstDateWithEvents = Object.keys(newEventsByDate).sort()[0];
    if (firstDateWithEvents) {
      setSelectedDate(firstDateWithEvents);
      setSelectedView("month"); // Chuyển về view tháng để thấy rõ
      
      // Hiển thị modal sự kiện của ngày đầu tiên
      setTimeout(() => {
        const firstDayEvents = newEventsByDate[firstDateWithEvents];
        const holidayKey = holidayKeys[firstDateWithEvents];
        const holidayLabel = holidayKey ? t(holidayKey) : undefined;

        let combinedEvents = [...firstDayEvents];
        if (holidayLabel) {
          combinedEvents.unshift({
            id: "holiday-" + firstDateWithEvents,
            tieuDe: holidayLabel,
            lich: { name: "Ngày lễ", key: "holiday", color: calendarColors.holiday },
            isHoliday: true,
          });
        }

        setModalEvents(combinedEvents);
        setModalDate(firstDateWithEvents);
        setShowModal(true);
      }, 500);
    }

    // Thông báo thành công
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show({
      type: "success",
      text1: "✅ Xếp lịch thành công!",
      text2: `AI đã sắp xếp ${scheduled.length} sự kiện theo độ ưu tiên`,
      position: "top",
      visibilityTime: 4000,
    });

    // Đánh dấu đã xếp lịch bằng AI để hiển thị chứng nhận
    setAiScheduledAt(new Date());
    setAiIsLoading(false);
    
  } catch (error) {
    console.error("❌ Lỗi AI xếp lịch:", error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Toast.show({
      type: "error",
      text1: "❌ Lỗi xếp lịch",
      text2: error.message || "Không thể kết nối AI",
      position: "top",
    });
    setAiIsLoading(false);
  }
};  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, "events"), where("userId", "==", auth.currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const marked = {};
      const byDate = {};
      const now = new Date();
      const allEventsTemp = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();

        // Chuẩn hóa lich
        if (!data.lich) data.lich = { name: "Cá nhân", key: "personal", color: calendarColors.personal };
        else {
          if (!data.lich.key) data.lich.key = nameToKey[data.lich.name] || "personal";
          if (!data.lich.color) data.lich.color = calendarColors[data.lich.key];
        }

        const start = data.ngayBatDau?.toDate ? data.ngayBatDau.toDate() : data.ngayBatDau;
        if (!start) return;

        // bỏ qua sự kiện quá khứ
        // - Sự kiện thường: bỏ qua nếu thời gian bắt đầu < hiện tại
        // - Sự kiện cả ngày: bỏ qua nếu ngày kết thúc < hôm nay (hiển thị cả ngày kể cả khi đã qua 00:00)
        if (data.caNgay) {
          const end = data.ngayKetThuc?.toDate ? data.ngayKetThuc.toDate() : data.ngayKetThuc;
          if (end) {
            const endDate = moment(end).format("YYYY-MM-DD");
            const nowDate = moment(now).format("YYYY-MM-DD");
            if (endDate < nowDate) return; // Chỉ bỏ qua khi ngày kết thúc đã qua
          }
        } else {
          if (start < now) return; // Sự kiện thường: bỏ qua nếu đã qua giờ bắt đầu
        }

        // Lọc theo filter
        if (selectedFilters.length > 0 && !selectedFilters.includes(data.lich.key)) {
          return;
        }

        const eventData = { id: doc.id, ...data };
        allEventsTemp.push(eventData);

        // --- xử lý lặp lại ---
        let repeatDates = [start];
        const repeatValue = data.lapLaiCode || data.lapLai;
        if (repeatValue && !isNoRepeat(repeatValue)) {
          repeatDates = generateRepeatDates(start, repeatValue);
        }

        repeatDates.forEach((dateItem, repeatIndex) => {
          const dateStr = moment(dateItem).format("YYYY-MM-DD");
          const uniqueInstanceId = `${doc.id}-${dateStr}-${repeatIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // đánh dấu ngày có sự kiện
          if (!marked[dateStr]) marked[dateStr] = { dots: [] };
          marked[dateStr].dots.push({
            key: `${doc.id}-${repeatIndex}-${Math.random().toString(36).substr(2, 9)}`,
            color: getEventColor(data.lich),
          });

          // group theo ngày - tạo instance mới với unique ID
          if (!byDate[dateStr]) byDate[dateStr] = [];
          byDate[dateStr].push({
            ...eventData,
            instanceId: uniqueInstanceId,
            repeatIndex: repeatIndex
          });
        });
      });

      setEvents(marked);
      setEventsByDate(byDate);
      setAllEvents(allEventsTemp);
    });

    return () => unsubscribe();
  }, [selectedFilters]);

  // --- Click chọn ngày ---
  const handleDayPress = (dateStr) => {
    setSelectedDate(dateStr);
    const dayEvents = eventsByDate[dateStr] || [];
    const holidayKey = holidayKeys[dateStr];
    const holidayLabel = holidayKey ? t(holidayKey) : undefined;

    let combinedEvents = [...dayEvents];
    
    // Sort theo priority và thời gian
    combinedEvents.sort((a, b) => {
      const aPriority = calendarPriority[a.lich?.key] || 5;
      const bPriority = calendarPriority[b.lich?.key] || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      const aStart = a.ngayBatDau?.toDate?.() || new Date(a.ngayBatDau);
      const bStart = b.ngayBatDau?.toDate?.() || new Date(b.ngayBatDau);
      return aStart - bStart;
    });
    
    if (holidayLabel) {
      combinedEvents.unshift({
        id: "holiday-" + dateStr,
        tieuDe: holidayLabel,
        lich: { name: "Ngày lễ", key: "holiday", color: calendarColors.holiday },
        isHoliday: true,
      });
    }

    if (combinedEvents.length > 0) {
      setModalEvents(combinedEvents);
      setModalDate(dateStr);
      setShowModal(true);
    }
  };

  // --- Render ô ngày ---
  const renderDayCell = (date, state) => {
    const isSelected = date.dateString === selectedDate;
    const isToday = date.dateString === moment().format("YYYY-MM-DD");
    const dayOfWeek = moment(date.dateString).day();
    const holidayKey = holidayKeys[date.dateString];
    const holidayLabel = holidayKey ? t(holidayKey) : undefined;
    const dayEvents = eventsByDate[date.dateString] || [];
    const hasEvents = dayEvents.length > 0 || holidayLabel;

    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          isSelected && styles.daySelected,
          // 🔥 Ngày hiện tại: viền vàng đậm + background gradient
          isToday && {
            borderWidth: 3,
            borderColor: "#FFD700",
            backgroundColor: isDarkMode ? '#2A1810' : '#FFF9E5',
            shadowColor: "#FFD700",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: 12,
          },
          hasEvents && !isToday && {
            borderWidth: 2,
            borderColor: holidayLabel ? "#FF7043" : "#1E88E5",
                  backgroundColor: isDarkMode 
              ? (holidayLabel ? '#3D3228' : '#1E2635')
              : (holidayLabel ? "#FFF3E0" : "#E3F2FD"),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            elevation: 8,
          },
        ]}
        onPress={() => handleDayPress(date.dateString)}
        onLongPress={() => {
          setSelectedDate(date.dateString);
          setShowQuickAdd(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      >
        {/* 🔥 Badge "HÔM NAY" (localized) */}
        {isToday && (
          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: '#D32F2F',
            paddingHorizontal: 3,
            paddingVertical: 1,
            borderRadius: 4,
            zIndex: 10,
          }}>
            <Text style={{ color: '#fff', fontSize: 7, fontWeight: '900' }}>{t('today', { defaultValue: 'Hôm nay' }).toUpperCase()}</Text>
          </View>
        )}
        <Text
          style={[
            styles.dayText,
            state === "disabled" && { color: "#ccc" },
            // 🔥 Ngày hiện tại: màu vàng đậm, to hơn
            isToday && { color: "#D32F2F", fontWeight: "900", fontSize: 20 },
            !isToday && dayOfWeek === 0 && { color: "red" },
          ]}
        >
          {date.day}
        </Text>
        <Text style={styles.lunarText}>
          {(() => {
            try {
              const [y, m, d] = date.dateString.split('-').map(Number);
              const lunar = solar2lunar(d, m, y);
              return `${lunar.lunarDay}/${lunar.lunarMonth}` + (lunar.isLeap ? ' N' : '');
            } catch {
              return '';
            }
          })()}
        </Text>

        {dayEvents.slice(0, 2).map((ev, i) => (
          <Text
            key={i}
            style={{
              fontSize: 9,
              fontWeight: "700",
              color: getEventColor(ev.lich),
              backgroundColor: "#FFF",
              borderRadius: 4,
              paddingHorizontal: 2,
              paddingVertical: 1,
              marginTop: 1,
              maxWidth: 44,
              textShadowColor: "#aaa",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
              overflow: "hidden",
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {ev.tieuDe}
          </Text>
        ))}

        {holidayLabel && <Text style={styles.holidayLabel}>🎉 {holidayLabel}</Text>}
      </TouchableOpacity>
    );
  };

  const calendarTheme = {
    todayTextColor: "#FF7043",
    arrowColor: isDarkMode ? palette?.accent : "#D32F2F",
    monthTextColor: isDarkMode ? palette?.text : "#000",
    textDayFontColor: isDarkMode ? palette?.text : "#000",
    textMonthFontColor: isDarkMode ? palette?.text : "#000",
    textDayHeaderFontColor: isDarkMode ? palette?.textSecondary : "#666",
    backgroundColor: isDarkMode ? palette?.background : "#fff",
    calendarBackground: isDarkMode ? palette?.surface : "#fff",
    selectedDayBackgroundColor: "#D32F2F",
    selectedDayTextColor: "#fff",
    dayTextColor: isDarkMode ? palette?.text : "#2d3436",
    textDisabledColor: isDarkMode ? palette?.textDisabled : "#ccc",
  };

 const renderWeekView = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = moment(selectedWeekStart).add(i, 'days');
      weekDays.push(day);
    }

    return (
      <View style={{ paddingHorizontal: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity 
            onPress={() => setSelectedWeekStart(moment(selectedWeekStart).subtract(1, 'week').format('YYYY-MM-DD'))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={isDarkMode ? palette?.accent : "#D32F2F"} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: isDarkMode ? palette?.text : '#000', backgroundColor: isDarkMode ? palette?.surface : 'rgba(255,215,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            Tuần {moment(selectedWeekStart).week()} - {moment(selectedWeekStart).format('MMMM YYYY')}
          </Text>
          <TouchableOpacity 
            onPress={() => setSelectedWeekStart(moment(selectedWeekStart).add(1, 'week').format('YYYY-MM-DD'))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-forward" size={24} color={isDarkMode ? palette?.accent : "#D32F2F"} />
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {weekDays.map((day, idx) => {
            const dateStr = day.format('YYYY-MM-DD');
            const dayEvents = eventsByDate[dateStr] || [];
            const isToday = dateStr === moment().format('YYYY-MM-DD');
            const isWeekend = day.day() === 0 || day.day() === 6;
            const holidayKey = holidayKeys[dateStr];
            
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedDate(dateStr);
                  handleDayPress(dateStr);
                }}
                onLongPress={() => {
                  setSelectedDate(dateStr);
                  setShowQuickAdd(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={{
                  width: 140,
                  marginHorizontal: 4,
                  padding: 12,
                  borderRadius: 16,
                  // 🔥 Ngày hiện tại nổi bật hơn
                  backgroundColor: isToday 
                    ? (isDarkMode ? '#2A1810' : '#FFF9E5') 
                    : isWeekend 
                      ? (isDarkMode ? '#2A323F' : '#FFF9E5') 
                      : holidayKey 
                        ? (isDarkMode ? '#3D3228' : '#FFF3E0') 
                        : (isDarkMode ? '#1A1F2E' : '#fff'),
                  borderWidth: isToday ? 3 : 2,
                  borderColor: isToday ? '#FFD700' : (isDarkMode ? palette?.border : '#ddd'),
                  elevation: isToday ? 10 : 4,
                  shadowColor: isToday ? '#FFD700' : '#000',
                  shadowOpacity: isToday ? 0.5 : 0.2,
                  shadowRadius: isToday ? 8 : 4,
                }}
              >
                {/* 🔥 Badge HÔM NAY cho week view (localized) */}
                {isToday && (
                  <View style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    backgroundColor: '#D32F2F',
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: '#FFD700',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{t('today', { defaultValue: 'Hôm nay' }).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={{ fontSize: 14, fontWeight: '700', color: isToday ? '#D32F2F' : (isWeekend ? '#FF7043' : (isDarkMode ? palette?.text : '#333')), textAlign: 'center' }}>
                  {day.format('dddd')} {/* 🔥 Hiển thị tên thứ đầy đủ */}
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: isToday ? '#D32F2F' : (isDarkMode ? palette?.text : '#333'), textAlign: 'center' }}>
                  {day.format('DD')}
                </Text>
                {holidayKey && (
                  <Text style={{ fontSize: 10, color: '#D32F2F', textAlign: 'center', marginTop: 4 }}>🎉</Text>
                )}
                <View style={{ marginTop: 8 }}>
                  {dayEvents.slice(0, 3).map((ev, i) => {
                    const priority = calendarPriority[ev.lich?.key] || 5;
                    const eventColor = getEventColor(ev.lich);
                    return (
                      <View key={`${ev.id}-${i}`} style={{ marginTop: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: eventColor,
                          }} />
                          <Text style={{ fontSize: 12, color: isDarkMode ? palette?.text : '#000', fontWeight: '700', flex: 1 }} numberOfLines={1}>
                            {ev.tieuDe}
                          </Text>
                          {priority <= 3 && <Text style={{ fontSize: 10 }}>⚠️</Text>}
                        </View>
                      </View>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <Text style={{ fontSize: 10, color: isDarkMode ? palette?.textSecondary : '#999', marginTop: 4, textAlign: 'center' }}>
                      +{dayEvents.length - 3} khác
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

 const renderMonthView = () => (
  <View style={{ paddingHorizontal: 8 }}>
    {/* 🔥 Nút VỀ HÔM NAY cho Month View */}
    <TouchableOpacity
      style={{
        alignSelf: 'center',
        backgroundColor: '#D32F2F',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFD700',
        marginTop: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 6,
      }}
      onPress={() => {
        const today = moment().format('YYYY-MM-DD');
        setSelectedDate(today);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
    >
      <Ionicons name="calendar-sharp" size={18} color="#FFD700" />
      <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '900' }}>{t('back_to_today', { defaultValue: 'Về hôm nay' }).toUpperCase()}</Text>
    </TouchableOpacity>
    
    <Calendar
      key={selectedDate} // 🔥 Force re-render khi selectedDate thay đổi
      current={selectedDate} // 🔥 Calendar sẽ scroll về tháng của selectedDate
      style={{ marginVertical: 8, borderRadius: 16, elevation: 4 }}
      markingType={"multi-dot"}
      markedDates={Object.keys(events).reduce((acc, dateStr) => {
        const item = events[dateStr] || {};
        acc[dateStr] = {
          ...item,
          dots: Array.isArray(item.dots) ? item.dots : [], // đảm bảo luôn có mảng dots
        };
        return acc;
      }, {
        [selectedDate]: {
          ...(events[selectedDate] || { dots: [] }),
          selected: true,
          selectedColor: "#D32F2F",
        },
      })}
      onDayPress={(day) => handleDayPress(day.dateString)}
      theme={calendarTheme}
      dayComponent={({ date, state }) => renderDayCell(date, state)}
    />
  </View>
);
  

  const renderDayView = () => {
    const AnimatedIconComponent = ({ calendarKey, color }) => {
      const scaleAnim = useRef(new Animated.Value(1)).current;
      const rotateAnim = useRef(new Animated.Value(0)).current;
      const bounceAnim = useRef(new Animated.Value(0)).current;
      const calendarInfo = getCalendarIcon(calendarKey);

      useEffect(() => {
        // Animation mạnh mẽ hơn: scale lớn hơn, nhanh hơn
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.4,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );

        // Rotation cho TẤT CẢ icon, nhanh hơn
        const rotate = Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        );

        // Thêm hiệu ứng bounce
        const bounce = Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -6,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: 700,
              useNativeDriver: true,
            }),
          ])
        );

        pulse.start();
        rotate.start();
        bounce.start();

        return () => {
          pulse.stop();
          rotate.stop();
          bounce.stop();
        };
      }, []);

      const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });

      return (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { rotate: spin },
              { translateY: bounceAnim },
            ],
          }}
        >
          <MaterialCommunityIcons name={calendarInfo.icon} size={20} color={color} />
        </Animated.View>
      );
    };

    return (
    <ImageBackground 
      source={isDarkMode ? null : require('../assets/bg-tet.jpg')} 
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
      blurRadius={3}
    >
      <LinearGradient 
        colors={[
          palette?.surfaceGradientStart || 'rgba(211,47,47,0.98)', 
          palette?.surfaceGradientMid || 'rgba(255,215,0,0.12)', 
          palette?.surfaceGradientEnd || 'rgba(211,47,47,0.98)'
        ]} 
        style={{ flex: 1 }}
      >
        <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 60 }}>
        <View
  style={{
    marginVertical: 22,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  }}
>
  <Text
    style={{
      ...styles.dayTitle,
      fontSize: 24,
      fontWeight: "900",
      color: "#B30000",
      textAlign: "center",
      letterSpacing: 0.6,
      textShadowColor: "rgba(0,0,0,0.15)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
      textTransform: "capitalize",
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#FFD700",
      backgroundColor: "#FFF9E6",
    }}
  >
    {selectedDate === moment().format("YYYY-MM-DD") 
      ? `📌 ${moment(selectedDate).format("dddd, DD/MM/YYYY")}` 
      : moment(selectedDate).format("dddd, DD/MM/YYYY")}
  </Text>

  <Text
    style={{
      textAlign: "center",
      fontSize: 15,
      color: "#333",
      fontWeight: "700",
      marginTop: 12,
      backgroundColor: "#FFF3DD",
      paddingVertical: 7,
      paddingHorizontal: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#FFDF9E",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}
  >
    📅 {(eventsByDate[selectedDate] || []).length} sự kiện
  </Text>
</View>

          {(eventsByDate[selectedDate] || []).map((ev) => {
            const priority = calendarPriority[ev.lich?.key] || 5;
            const isHighPriority = priority <= 3;
            const isMediumPriority = priority > 3 && priority <= 6;
            
            return (
            <TouchableOpacity
              key={ev.instanceId || ev.id}
              style={[
                styles.eventCard, 
                { 
                  borderLeftColor: getEventColor(ev.lich),
                  borderLeftWidth: isHighPriority ? 8 : 6,
                  backgroundColor: isHighPriority 
                    ? '#FFE5E5' 
                    : isMediumPriority 
                      ? '#FFF9E5' 
                      : 'rgba(255,255,255,0.98)',
                  borderWidth: isHighPriority ? 2 : 1,
                  borderColor: isHighPriority ? getEventColor(ev.lich) : 'rgba(255,215,0,0.3)',
                  elevation: isHighPriority ? 10 : 6,
                }
              ]}
              onPress={() => navigation.navigate("EventScreen", { eventId: ev.id, event: ev })}
            >
              {/* Header với icon và priority */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: getEventColor(ev.lich) + '22',
                    borderWidth: 2,
                    borderColor: getEventColor(ev.lich),
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <AnimatedIconComponent calendarKey={ev.lich?.key} color={getEventColor(ev.lich)} />
                  </View>
                  <Text style={{ position: 'absolute', fontSize: 18, top: -6, left: 36 }}>
                    {getCalendarIcon(ev.lich?.key).emoji}
                  </Text>
                  {isHighPriority && (
                    <View style={{
                      backgroundColor: '#D32F2F',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>
                        ƯU TIÊN
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: '#666', fontWeight: '700' }}>
                  P{priority}
                </Text>
              </View>
              
              {/* Tên công việc nổi bật */}
              <Text style={[
                styles.eventTitle,
                {
                  fontSize: isHighPriority ? 22 : 20,
                  fontWeight: '900',
                  color: isDarkMode ? palette?.text : '#000',
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }
              ]}>{ev.tieuDe}</Text>
              
              {/* Badge lịch siêu nổi bật */}
              <View style={{
                backgroundColor: getEventColor(ev.lich),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginBottom: 10,
                elevation: 4,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 2 },
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="folder" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {t(ev.lich?.key)}
                  </Text>
                </View>
              </View>
              
              {/* Thông tin chi tiết */}
              <Text style={[styles.eventTextSmall, { color: isDarkMode ? palette?.textSecondary : '#555' }]}>
                🕒 {ev.caNgay ? "Cả ngày" : `${moment(ev.ngayBatDau?.toDate ? ev.ngayBatDau.toDate() : new Date(ev.ngayBatDau)).format("HH:mm")} - ${moment(ev.ngayKetThuc?.toDate ? ev.ngayKetThuc.toDate() : new Date(ev.ngayKetThuc)).format("HH:mm")}`}
              </Text>
              {ev.diaDiem && <Text style={[styles.eventTextSmall, { color: isDarkMode ? palette?.textSecondary : '#555' }]}>📍 {ev.diaDiem}</Text>}
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
    );
  };

  // Tìm kiếm sự kiện nâng cao
  const handleSearch = (text) => {
    setSearchText(text);
    
    if (text.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const lowerText = text.toLowerCase();
    let results = [];

    if (searchBy === 'title') {
      // Tìm theo tiêu đề + mô tả
      results = allEvents.filter(ev => 
        ev.tieuDe?.toLowerCase().includes(lowerText) ||
        ev.ghiChu?.toLowerCase().includes(lowerText)
      ).sort((a, b) => {
        const aDate = a.ngayBatDau?.toDate?.() || new Date(a.ngayBatDau);
        const bDate = b.ngayBatDau?.toDate?.() || new Date(b.ngayBatDau);
        return aDate - bDate;
      });
    } else if (searchBy === 'calendar') {
      // Tìm theo loại lịch
      results = allEvents.filter(ev => 
        ev.lich?.name?.toLowerCase().includes(lowerText) ||
        ev.lich?.key?.toLowerCase().includes(lowerText)
      );
    } else if (searchBy === 'date') {
      // Tìm theo ngày (dd/mm hoặc dd/mm/yyyy)
      results = allEvents.filter(ev => {
        const date = ev.ngayBatDau?.toDate?.() || new Date(ev.ngayBatDau);
        const dateStr = moment(date).format('DD/MM/YYYY');
        const shortStr = moment(date).format('DD/MM');
        return dateStr.includes(lowerText) || shortStr.includes(lowerText);
      });
    }

    setSearchResults(results);
  };

  // Toggle filter
  const toggleFilter = (key) => {
    setSelectedFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Schedule notification cho sự kiện
  const scheduleEventNotification = async (event) => {
    if (!notificationsEnabled) return;

    try {
      const startDate = event.ngayBatDau?.toDate?.() || new Date(event.ngayBatDau);
      const now = new Date();
      
      // Chỉ schedule cho sự kiện tương lai
      if (startDate <= now) return;

      // Nhắc trước 10 phút
      const trigger10Min = new Date(startDate.getTime() - 10 * 60 * 1000);
      if (trigger10Min > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ Sắp tới: ${event.tieuDe}`,
            body: `Sự kiện sẽ bắt đầu sau 10 phút`,
            data: { eventId: event.id },
          },
          trigger: { date: trigger10Min },
        });
      }

      // Nhắc trước 1 giờ cho sự kiện quan trọng
      const priority = calendarPriority[event.lich?.key] || 5;
      if (priority <= 3) {
        const trigger1Hour = new Date(startDate.getTime() - 60 * 60 * 1000);
        if (trigger1Hour > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `📌 Quan trọng: ${event.tieuDe}`,
              body: `Sự kiện ưu tiên cao sẽ bắt đầu sau 1 giờ`,
              data: { eventId: event.id },
            },
            trigger: { date: trigger1Hour },
          });
        }
      }

      console.log('✅ Đã schedule notification cho:', event.tieuDe);
    } catch (error) {
      console.error('❌ Lỗi schedule notification:', error);
    }
  };

  // Quick Add sự kiện
  const handleQuickAdd = async () => {
    if (!quickAddDate.trim()) {
      Toast.show({ type: 'error', text1: '⚠️ Vui lòng nhập tiêu đề', position: 'top' });
      return;
    }

    try {
      const [hours, minutes] = quickAddTime.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 giờ

      // Lấy trường lịch mặc định
      const defaultCalendar = { 
        name: 'Cá nhân', 
        key: 'personal', 
        color: calendarColors.personal 
      };

      const newEvent = {
        // Trường chính
        tieuDe: quickAddDate.trim(),
        title_lower: quickAddDate.trim().toLowerCase(),
        
        // Thời gian (dùng đúng trường database)
        ngayBatDau: startDate,
        ngayKetThuc: endDate,
        
        // Lịch
        lich: defaultCalendar,
        calendar_name_lower: defaultCalendar.name.toLowerCase(),
        
        // Các trường khác
        caNgay: false,
        ghiChu: '',
        diaDiem: '',
        moTa: '',
        phong: '',
        url: '',
        lapLai: 'Không lặp lại',
        thongBao: 'Không thông báo',
        
        // Metadata
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        completed: false,
      };

      // Lưu vào Firestore
      const { addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'events'), newEvent);
      
      // Schedule notification
      await scheduleEventNotification({ ...newEvent, id: docRef.id });
      
      setShowQuickAdd(false);
      setQuickAddDate('');
      setQuickAddTime('09:00');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ 
        type: 'success', 
        text1: '✅ Đã thêm sự kiện', 
        text2: `${quickAddDate} - ${moment(startDate).format('HH:mm')}`,
        position: 'top' 
      });
    } catch (error) {
      console.error('Quick add error:', error);
      Toast.show({ type: 'error', text1: '❌ Lỗi thêm sự kiện', position: 'top' });
    }
  };

  // Export PDF
  const handleExport = async () => {
    const monthEvents = Object.values(eventsByDate).flat();
    if (!monthEvents.length) {
      Toast.show({
        type: "info",
        text1: "ℹ️ Thông báo",
        text2: "Không có sự kiện để xuất",
        position: "top",
      });
      return;
    }
    setShowExportModal(true);
  };

  // Thực hiện xuất lịch
  const performExport = async () => {
    try {
      setExportIsLoading(true);
      const monthEvents = Object.values(eventsByDate).flat();
      const content = `
🎊═══════════════════════════════════🎊
   LỊCH TẾT 2026 - ${moment(selectedDate).locale('vi').format("MMMM YYYY").toUpperCase()}
🎊═══════════════════════════════════🎊

📅 Ngày xuất: ${moment().format('DD/MM/YYYY HH:mm')}
📊 Tổng số sự kiện: ${monthEvents.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHI TIẾT SỰ KIỆN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${monthEvents.map((ev, i) => `
${i + 1}. ${ev.tieuDe}
   📅 ${moment(ev.ngayBatDau?.toDate?.() || ev.ngayBatDau).format('DD/MM/YYYY HH:mm')}
   📂 ${ev.lich?.name || 'Cá nhân'}
   📍 ${ev.diaDiem || 'Không có'}
   📝 ${ev.ghiChu || 'Không có'}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎊 Xuất từ Lịch Tết 2026 🎊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      const fileName = `Lich_${moment(selectedDate).format('MM-YYYY')}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: 'utf8' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain' });
        Toast.show({ type: 'success', text1: '✅ Đã xuất lịch', position: 'top' });
      }
      setShowExportModal(false);
      setExportIsLoading(false);
    } catch (error) {
      console.error('Export error:', error);
      Toast.show({ type: 'error', text1: '❌ Lỗi xuất file', position: 'top' });
      setExportIsLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={isDarkMode ? null : require('../assets/bg-tet.jpg')} 
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
      blurRadius={3}
    >
      <LinearGradient 
        colors={[
          palette?.surfaceGradientStart || 'rgba(211,47,47,0.98)', 
          palette?.surfaceGradientMid || 'rgba(255,215,0,0.12)', 
          palette?.surfaceGradientEnd || 'rgba(211,47,47,0.98)'
        ]} 
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
      {aiScheduledAt && (
        <View style={styles.aiRibbon}>
          <MaterialCommunityIcons name="robot" size={18} color="#fff" />
          <Text style={styles.aiRibbonText}>ĐÃ XẾP LỊCH BẰNG AI</Text>
          <Text style={styles.aiRibbonTime}>{moment(aiScheduledAt).format('DD/MM/YYYY HH:mm')}</Text>
        </View>
      )}
      {/* Header Hoàng Gia */}
      <LinearGradient 
        colors={isDarkMode 
          ? [palette?.headerStart || "#2C2C2C", palette?.headerEnd || "#1A1A1A"] 
          : [palette?.accent || '#FFD700', palette?.primary || '#FFA000']
        } 
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color={isDarkMode ? palette?.accent : "#000"} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? palette?.accent : '#000' }]}>
            {moment(selectedDate).locale('vi').format("MMMM YYYY")}
          </Text>
          <View style={styles.viewToggle}>
            {["month", "week", "day"].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => {
                  setSelectedView(v);
                  if (v === 'week') {
                    setSelectedWeekStart(moment(selectedDate).startOf('week').format("YYYY-MM-DD"));
                  }
                }}
                style={[styles.viewBtn, selectedView === v && styles.viewBtnActive]}
              >
                <Text style={[styles.viewBtnText, selectedView === v && styles.viewBtnTextActive]}>
                  {v === "month" ? t('month_label') : v === "week" ? "Tuần" : t('day_label')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
            <Ionicons name="search" size={24} color={isDarkMode ? palette?.accent : "#000"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilterMenu(true)} style={styles.iconBtn}>
            <MaterialCommunityIcons name="filter-variant" size={24} color={isDarkMode ? palette?.accent : "#000"} />
            {selectedFilters.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{selectedFilters.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} style={styles.iconBtn}>
            <Ionicons name="download-outline" size={24} color={isDarkMode ? palette?.accent : "#000"} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#FFD700" />
            <TextInput
              style={[styles.searchInput, { color: isDarkMode ? palette?.text : '#000', backgroundColor: isDarkMode ? palette?.surface : '#fff' }]}
              placeholder="Tìm kiếm sự kiện..."
              value={searchText}
              onChangeText={handleSearch}
              autoFocus
              placeholderTextColor={isDarkMode ? palette?.textSecondary : "#999"}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchText(""); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={20} color="#FFD700" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Type Filter */}
          <View style={styles.searchTypeBar}>
            {[
              { key: 'title', label: '📝 Tiêu đề' },
              { key: 'calendar', label: '📅 Loại lịch' },
              { key: 'date', label: '🗓️ Ngày' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.searchTypeBtn,
                  searchBy === tab.key && styles.searchTypeActive,
                ]}
                onPress={() => {
                  setSearchBy(tab.key);
                  setSearchResults([]);
                  setSearchText("");
                }}
              >
                <Text style={[
                  styles.searchTypeText,
                  searchBy === tab.key && styles.searchTypeTextActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <ScrollView
              style={styles.searchResultsContainer}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.searchResultsTitle}>
                Tìm thấy {searchResults.length} kết quả
              </Text>
              {searchResults.slice(0, 10).map(event => {
                const date = event.ngayBatDau?.toDate?.() || new Date(event.ngayBatDau);
                const timeStr = moment(date).format('HH:mm');
                const dateStr = moment(date).format('DD/MM/YYYY');
                const color = getEventColor(event.lich);
                
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.searchResultItem, { borderLeftColor: color }]}
                    onPress={() => {
                      setSelectedDate(moment(date).format('YYYY-MM-DD'));
                      setShowSearch(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.searchResultColor, { backgroundColor: color }]} />
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle} numberOfLines={2}>
                        {event.tieuDe}
                      </Text>
                      <Text style={styles.searchResultMeta}>
                        {timeStr} • {dateStr} • {event.lich?.name}
                      </Text>
                      {event.ghiChu && (
                        <Text style={styles.searchResultNote} numberOfLines={1}>
                          {event.ghiChu}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#FFD700" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {searchText.length > 0 && searchResults.length === 0 && (
            <View style={styles.searchEmpty}>
              <Ionicons name="search" size={40} color="#ccc" />
              <Text style={styles.searchEmptyText}>Không tìm thấy kết quả</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {selectedView === "month" && renderMonthView()}
        {selectedView === "week" && renderWeekView()}
        {selectedView === "day" && renderDayView()}
      </ScrollView>

      {/* Quick Add Modal */}
      <Modal visible={showQuickAdd} animationType="slide" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.filterModal, { backgroundColor: isDarkMode ? palette?.surface : '#fff' }]}>
            <Text style={[styles.filterModalTitle, { color: isDarkMode ? palette?.accent : '#D32F2F' }]}>⚡ Thêm nhanh sự kiện</Text>
            <Text style={{ textAlign: 'center', color: isDarkMode ? palette?.textSecondary : '#666', marginBottom: 16 }}>
              {moment(selectedDate).format('dddd, DD/MM/YYYY')}
            </Text>
            
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: isDarkMode ? palette?.border : '#ddd',
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                marginBottom: 12,
                backgroundColor: isDarkMode ? palette?.background : '#fff',
                color: isDarkMode ? palette?.text : '#000',
              }}
              placeholder="Tiêu đề sự kiện..."
              value={quickAddDate}
              onChangeText={setQuickAddDate}
              autoFocus
              placeholderTextColor={isDarkMode ? palette?.textSecondary : '#999'}
            />

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDarkMode ? palette?.text : '#333', marginBottom: 8 }}>
                🕒 Thời gian bắt đầu
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: isDarkMode ? palette?.border : '#ddd',
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? palette?.background : '#fff',
                  }}
                  onPress={() => {
                    const hours = parseInt(quickAddTime.split(':')[0]);
                    const newHours = hours > 0 ? hours - 1 : 23;
                    setQuickAddTime(`${String(newHours).padStart(2, '0')}:${quickAddTime.split(':')[1]}`);
                  }}
                >
                  <Text style={{ fontSize: 20, color: isDarkMode ? palette?.text : '#000' }}>-</Text>
                </TouchableOpacity>
                
                <View style={{
                  flex: 2,
                  borderWidth: 2,
                  borderColor: '#D32F2F',
                  borderRadius: 12,
                  padding: 12,
                  alignItems: 'center',
                  backgroundColor: isDarkMode ? '#6B1C1C' : '#FFE5E5',
                }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: isDarkMode ? '#FFB300' : '#D32F2F' }}>
                    {quickAddTime}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: isDarkMode ? palette?.border : '#ddd',
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? palette?.background : '#fff',
                  }}
                  onPress={() => {
                    const hours = parseInt(quickAddTime.split(':')[0]);
                    const newHours = hours < 23 ? hours + 1 : 0;
                    setQuickAddTime(`${String(newHours).padStart(2, '0')}:${quickAddTime.split(':')[1]}`);
                  }}
                >
                  <Text style={{ fontSize: 20, color: isDarkMode ? palette?.text : '#000' }}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {['06:00', '09:00', '12:00', '14:00', '18:00', '20:00'].map(time => (
                  <TouchableOpacity
                    key={time}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      borderRadius: 8,
                      backgroundColor: quickAddTime === time ? '#D32F2F' : (isDarkMode ? '#2A323F' : '#f5f5f5'),
                      alignItems: 'center',
                    }}
                    onPress={() => setQuickAddTime(time)}
                  >
                    <Text style={{ 
                      fontSize: 12, 
                      fontWeight: '700',
                      color: quickAddTime === time ? '#fff' : (isDarkMode ? palette?.text : '#666')
                    }}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterModalActions}>
              <TouchableOpacity 
                style={[styles.filterBtn, styles.filterBtnClear]}
                onPress={() => {
                  setShowQuickAdd(false);
                  setQuickAddDate('');
                  setQuickAddTime('09:00');
                }}
              >
                <Text style={styles.filterBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterBtn, styles.filterBtnApply]}
                onPress={handleQuickAdd}
                disabled={!quickAddDate.trim()}
              >
                <Text style={[styles.filterBtnText, { color: '#fff' }]}>Thêm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB Menu */}
      {showFabMenu && (
        <TouchableWithoutFeedback onPress={() => setShowFabMenu(false)}>
          <View style={styles.fabMenuOverlay}>
            <View style={styles.fabMenu}>
              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  navigation.navigate("AddEvent");
                }}
              >
                <Ionicons name="add-circle-outline" size={24} color="#D32F2F" />
                <Text style={styles.fabMenuText}>Thêm sự kiện</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  handleAiSmartSchedule();
                }}
              >
                <MaterialCommunityIcons name="robot" size={24} color="#D32F2F" />
                <Text style={styles.fabMenuText}>AI xếp lịch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setShowFabMenu(false);
                  navigation.navigate("SyncTKB");
                }}
              >
                <Ionicons name="sync" size={24} color="#D32F2F" />
                <Text style={styles.fabMenuText}>Đồng bộ TKB</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* FAB Draggable với Animation */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [
              ...fabPan.getTranslateTransform(),
              { scale: fabScale },
              { translateY: fabTranslateY },
            ],
            opacity: fabOpacity,
          },
        ]}
        {...PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            fabPan.setOffset({
              x: fabPan.x._value,
              y: fabPan.y._value,
            });
            fabPan.setValue({ x: 0, y: 0 });
          },
          onPanResponderMove: Animated.event(
            [null, { dx: fabPan.x, dy: fabPan.y }],
            { useNativeDriver: false }
          ),
          onPanResponderRelease: (e, gesture) => {
            fabPan.flattenOffset();
            // Thả hoàn toàn tự do - KHÔNG giới hạn, thả ở đâu cũng được
          },
        }).panHandlers}
      >
        <TouchableOpacity onPress={() => setShowFabMenu(!showFabMenu)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Filter Modal */}
      <Modal visible={showFilterMenu} animationType="slide" transparent>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.filterModal}>
            <Text style={styles.filterModalTitle}>Lọc theo loại lịch</Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {Object.entries(calendarColors).map(([key, color]) => {
                const name = Object.keys(nameToKey).find(k => nameToKey[k] === key) || key;
                const isSelected = selectedFilters.includes(key);
                
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.filterItem, isSelected && styles.filterItemSelected]}
                    onPress={() => toggleFilter(key)}
                  >
                    <View style={[styles.filterColorDot, { backgroundColor: color }]} />
                    <Text style={styles.filterItemText}>{t(key)}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={color} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.filterModalActions}>
              <TouchableOpacity 
                style={[styles.filterBtn, styles.filterBtnClear]}
                onPress={() => setSelectedFilters([])}
              >
                <Text style={styles.filterBtnText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterBtn, styles.filterBtnApply]}
                onPress={() => setShowFilterMenu(false)}
              >
                <Text style={[styles.filterBtnText, { color: '#fff' }]}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

     {/* Modal sự kiện */}
<Modal
  visible={showModal}
  animationType="fade"
  transparent={true}
  onRequestClose={() => setShowModal(false)}
>
  <View style={styles.modalOverlayCenter}>
    <View style={styles.modalContentCenter}>
      <Text style={styles.modalTitleCenter}>
        {t('schedule_for_day', { date: moment(modalDate).format('dddd, DD/MM/YYYY') })}
      </Text>

      <ScrollView style={{ marginTop: 8 }}>
        {modalEvents.map((ev) => {
          // Xác định độ ưu tiên
          const priority = calendarPriority[ev.lich?.key] || 5;
          const isHighPriority = priority <= 3; // study, work, health
          const isMediumPriority = priority > 3 && priority <= 6;
          
          // Animated Icon Component
          const AnimatedIconComponent = ({ calendarKey, color }) => {
            const scaleAnim = useRef(new Animated.Value(1)).current;
            const rotateAnim = useRef(new Animated.Value(0)).current;
            const bounceAnim = useRef(new Animated.Value(0)).current;
            const calendarInfo = getCalendarIcon(calendarKey);

            useEffect(() => {
              const pulse = Animated.loop(
                Animated.sequence([
                  Animated.timing(scaleAnim, {
                    toValue: 1.4,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                  Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                  }),
                ])
              );

              const rotate = Animated.loop(
                Animated.timing(rotateAnim, {
                  toValue: 1,
                  duration: 2000,
                  useNativeDriver: true,
                })
              );

              const bounce = Animated.loop(
                Animated.sequence([
                  Animated.timing(bounceAnim, {
                    toValue: -6,
                    duration: 700,
                    useNativeDriver: true,
                  }),
                  Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 700,
                    useNativeDriver: true,
                  }),
                ])
              );

              pulse.start();
              rotate.start();
              bounce.start();

              return () => {
                pulse.stop();
                rotate.stop();
                bounce.stop();
              };
            }, []);

            const spin = rotateAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });

            return (
              <Animated.View
                style={{
                  transform: [
                    { scale: scaleAnim },
                    { rotate: spin },
                    { translateY: bounceAnim },
                  ],
                }}
              >
                <MaterialCommunityIcons name={calendarInfo.icon} size={18} color={color} />
              </Animated.View>
            );
          };
          
          return (
            <View
              key={ev.instanceId || ev.id}
              style={{
                padding: 16,
                marginVertical: 8,
                borderRadius: 14,
                borderLeftWidth: isHighPriority ? 8 : 6,
                borderLeftColor: ev.isHoliday ? "#FF7043" : getEventColor(ev.lich),
                backgroundColor: ev.isHoliday 
                  ? "#FFF3E0" 
                  : isHighPriority 
                    ? "#FFE5E5" 
                    : isMediumPriority 
                      ? "#FFF9E5" 
                      : "#E3F2FD",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: isHighPriority ? 0.4 : 0.3,
                shadowRadius: 6,
                elevation: isHighPriority ? 12 : 8,
                borderWidth: isHighPriority ? 2 : 0,
                borderColor: isHighPriority ? getEventColor(ev.lich) : 'transparent',
              }}
            >
              {/* Header với icon ưu tiên */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {!ev.isHoliday && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    backgroundColor: isHighPriority ? 'rgba(211,47,47,0.15)' : 'transparent',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    marginRight: 8,
                  }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: getEventColor(ev.lich) + '22',
                      borderWidth: 2,
                      borderColor: getEventColor(ev.lich),
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 4,
                    }}>
                      <AnimatedIconComponent calendarKey={ev.lich?.key} color={getEventColor(ev.lich)} />
                    </View>
                    <Text style={{ fontSize: 16 }}>{getCalendarIcon(ev.lich?.key).emoji}</Text>
                    {isHighPriority && (
                      <View style={{
                        backgroundColor: '#D32F2F',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginLeft: 4,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                          ƯU TIÊN
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <Text style={{ fontSize: 12, color: '#666', fontWeight: '700' }}>
                  {!ev.isHoliday && `Priority ${priority}`}
                </Text>
              </View>
              
              {/* Tên công việc nổi bật */}
              <Text
                style={{
                  fontSize: ev.isHoliday ? 18 : isHighPriority ? 20 : 18,
                  fontWeight: "900",
                  color: ev.isHoliday ? "#D32F2F" : (isDarkMode ? palette?.text : "#000"),
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}
              >
                {ev.isHoliday ? `🎉 ${ev.tieuDe}` : ev.tieuDe}
              </Text>
              
              {/* Badge lịch siêu nổi bật */}
              {!ev.isHoliday && (
                <View style={{
                  backgroundColor: getEventColor(ev.lich),
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  marginBottom: 10,
                  elevation: 4,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 2 },
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="folder" size={14} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {t(ev.lich?.key)}
                    </Text>
                  </View>
                </View>
              )}

            {/* Thời gian */}
            {!ev.isHoliday && (
              <Text style={{ fontSize: 14, color: isDarkMode ? palette?.textSecondary : "#555", marginBottom: 2 }}>
                {ev.caNgay
                  ? `🕒 ${t('allDay')}`
                  : `🕒 ${moment(ev.ngayBatDau?.toDate ? ev.ngayBatDau.toDate() : new Date(ev.ngayBatDau)).format("HH:mm")} - ${moment(
                      ev.ngayKetThuc?.toDate ? ev.ngayKetThuc.toDate() : new Date(ev.ngayKetThuc)
                    ).format("HH:mm")}`}
              </Text>
            )}

            {/* Mô tả */}
            {!ev.isHoliday && ev.moTa?.trim() && (
              <Text style={{ fontSize: 14, color: isDarkMode ? palette?.textSecondary : "#555", marginBottom: 2 }}>
                📖 {ev.moTa}
              </Text>
            )}

            {/* Địa điểm */}
            {!ev.isHoliday && ev.diaDiem?.trim() && (
              <Text style={{ fontSize: 14, color: isDarkMode ? palette?.textSecondary : "#555", marginBottom: 2 }}>
                📍 {ev.diaDiem}
              </Text>
            )}

            {/* Phòng */}
            {!ev.isHoliday && ev.phong?.trim() && (
              <Text style={{ fontSize: 14, color: isDarkMode ? palette?.textSecondary : "#555", marginBottom: 2 }}>
                🏫 {ev.phong}
              </Text>
            )}

            {/* Ghi chú */}
            {!ev.isHoliday && ev.ghiChu?.trim() && (
              <Text style={{ fontSize: 14, color: isDarkMode ? palette?.textSecondary : "#555", marginBottom: 2 }}>
                📝 {ev.ghiChu}
              </Text>
            )}
          </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{t('close')}</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      {/* AI Schedule Confirmation Modal */}
      <Modal
        visible={showAiConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAiConfirmModal(false)}
      >
        <View style={[styles.modalOverlayCenter, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.aiConfirmContainer, { backgroundColor: palette?.surface || '#fff' }]}>
            {/* Header */}
            <LinearGradient
              colors={['#7b61ff', '#5e4fa2']}
              style={styles.aiConfirmHeader}
            >
              <MaterialCommunityIcons name="robot" size={40} color="#fff" />
              <Text style={styles.aiConfirmTitle}>🤖 AI Xếp Lịch</Text>
              <Text style={styles.aiConfirmSubtitle}>Sắp xếp thông minh theo độ ưu tiên</Text>
            </LinearGradient>

            {/* Content */}
            <View style={styles.aiConfirmContent}>
              <View style={styles.aiConfirmCard}>
                <View style={styles.aiStatBox}>
                  <Text style={styles.aiStatNumber}>{aiEventCount}</Text>
                  <Text style={styles.aiStatLabel}>Sự kiện</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.aiConfirmText, { color: palette?.text || '#333' }]}>
                    AI sẽ phân tích và sắp xếp lại toàn bộ lịch của bạn theo:
                  </Text>
                  <View style={styles.aiFeatureList}>
                    <Text style={styles.aiFeatureItem}>✓ Độ ưu tiên (Học tập, Công việc...)</Text>
                    <Text style={styles.aiFeatureItem}>✓ Thứ tự thời gian hợp lý</Text>
                    <Text style={styles.aiFeatureItem}>✓ Tránh xung đột giờ</Text>
                  </View>
                </View>
              </View>

              <View style={styles.aiConfirmWarning}>
                <Ionicons name="information-circle" size={20} color="#ff9800" />
                <Text style={styles.aiConfirmWarningText}>
                  Lịch hiện tại sẽ được sắp xếp lại. Bạn có thể hoàn tác bất cứ lúc nào.
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.aiConfirmActions}>
              <TouchableOpacity
                style={[styles.aiConfirmBtn, styles.aiCancelBtn]}
                onPress={() => setShowAiConfirmModal(false)}
                disabled={aiIsLoading}
              >
                <Text style={styles.aiCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiConfirmBtn, styles.aiStartBtn, aiIsLoading && { opacity: 0.6 }]}
                onPress={async () => {
                  setShowAiConfirmModal(false);
                  await performAiScheduling();
                }}
                disabled={aiIsLoading}
              >
                {aiIsLoading ? (
                  <>
                    <MaterialCommunityIcons name="loading" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.aiStartBtnText}>Đang xử lý...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="robot" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.aiStartBtnText}>Xếp Lịch Ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Schedule Modal */}
      <Modal
        visible={showExportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={[styles.modalOverlayCenter, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.exportConfirmContainer, { backgroundColor: palette?.surface || '#fff' }]}>
            {/* Header */}
            <LinearGradient
              colors={['#26a69a', '#1b7873']}
              style={styles.exportConfirmHeader}
            >
              <Ionicons name="download" size={40} color="#fff" />
              <Text style={styles.exportConfirmTitle}>📥 Xuất Lịch</Text>
              <Text style={styles.exportConfirmSubtitle}>Lưu lịch của bạn dưới dạng tệp văn bản</Text>
            </LinearGradient>

            {/* Content */}
            <View style={styles.exportConfirmContent}>
              <View style={styles.exportConfirmCard}>
                <View style={styles.exportStatBox}>
                  <Text style={styles.exportStatNumber}>{Object.values(eventsByDate).flat().length}</Text>
                  <Text style={styles.exportStatLabel}>Sự kiện</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.exportConfirmText, { color: palette?.text || '#333' }]}>
                    Lịch {moment(selectedDate).locale('vi').format("MMMM YYYY")}
                  </Text>
                  <Text style={styles.exportConfirmSubText}>
                    Tệp sẽ được lưu với tên: Lich_{moment(selectedDate).format('MM-YYYY')}.txt
                  </Text>
                </View>
              </View>

              <View style={styles.exportConfirmInfo}>
                <Ionicons name="information-circle" size={20} color="#1976d2" />
                <Text style={styles.exportConfirmInfoText}>
                  Bạn có thể chia sẻ tệp này qua email, tin nhắn hoặc lưu trữ trên thiết bị.
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.exportConfirmActions}>
              <TouchableOpacity
                style={[styles.exportConfirmBtn, styles.exportCancelBtn]}
                onPress={() => setShowExportModal(false)}
                disabled={exportIsLoading}
              >
                <Text style={styles.exportCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportConfirmBtn, styles.exportStartBtn, exportIsLoading && { opacity: 0.6 }]}
                onPress={performExport}
                disabled={exportIsLoading}
              >
                {exportIsLoading ? (
                  <>
                    <MaterialCommunityIcons name="loading" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.exportStartBtnText}>Đang xuất...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.exportStartBtnText}>Xuất Ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  
  // AI Schedule Modal Styles
  aiConfirmContainer: {
    width: '85%',
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  aiConfirmHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiConfirmTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  aiConfirmSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  aiConfirmContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  aiConfirmCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(123,97,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7b61ff',
  },
  aiStatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  aiStatNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#7b61ff',
  },
  aiStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
  },
  aiConfirmText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  aiFeatureList: {
    marginTop: 10,
    gap: 6,
  },
  aiFeatureItem: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  aiConfirmWarning: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  aiConfirmWarningText: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  aiConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  aiConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  aiCancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  aiCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  aiStartBtn: {
    backgroundColor: '#7b61ff',
  },
  aiStartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Export Modal Styles
  exportConfirmContainer: {
    width: '85%',
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  exportConfirmHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportConfirmTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  exportConfirmSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  exportConfirmContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  exportConfirmCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(38,166,154,0.08)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#26a69a',
  },
  exportStatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  exportStatNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#26a69a',
  },
  exportStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
  },
  exportConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  exportConfirmSubText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
    marginTop: 6,
  },
  exportConfirmInfo: {
    flexDirection: 'row',
    backgroundColor: 'rgba(25,118,210,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
    gap: 10,
  },
  exportConfirmInfoText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  exportConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  exportConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  exportCancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exportCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  exportStartBtn: {
    backgroundColor: '#26a69a',
  },
  exportStartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  
  aiRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    borderWidth: 2,
    borderColor: '#FFD700',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  aiRibbonText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
  aiRibbonTime: { color: '#C8E6C9', fontWeight: '700', marginLeft: 8 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },

  dayCell: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: 50,
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.98)',
    marginVertical: 3,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  daySelected: {
    backgroundColor: 'rgba(255,215,0,0.4)',
    borderWidth: 3,
    borderColor: '#D32F2F',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  dayText: { fontSize: 15, color: '#222', fontWeight: '700' },
  lunarText: { fontSize: 10, color: '#888', marginTop: 2, fontWeight: '500' },
  holidayLabel: { fontSize: 9, fontWeight: '800', color: '#D32F2F', textAlign: 'center', marginTop: 2 },

  viewBtn: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 18 },
  viewBtnActive: { backgroundColor: 'rgba(0,0,0,0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  viewBtnText: { fontSize: 13, color: '#000', fontWeight: '700' },
  viewBtnTextActive: { color: '#FFD700', fontWeight: '900' },

  dayTitle: { fontSize: 24, fontWeight: '900', marginVertical: 20, textAlign: 'center', color: '#000', backgroundColor: 'rgba(255,215,0,0.4)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, overflow: 'hidden', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2, letterSpacing: 0.5 },

  eventCard: { 
    padding: 20, 
    marginVertical: 10, 
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.98)', 
    borderRadius: 24, 
    elevation: 8, 
    borderLeftWidth: 6, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  eventTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, color: '#000', letterSpacing: 0.5 },
  eventTextSmall: { fontSize: 14, color: '#555', marginTop: 4, lineHeight: 22, fontWeight: '500' },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#D32F2F',
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
    elevation: 12,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    zIndex: 100,
    borderWidth: 3,
    borderColor: '#FFD700',
  },

  fabMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99,
  },

  fabMenu: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 18,
    zIndex: 100,
    borderWidth: 3,
    borderColor: 'rgba(255,215,0,0.6)',
  },

  fabMenuItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16, 
    paddingHorizontal: 14, 
    borderBottomWidth: 1.5, 
    borderBottomColor: 'rgba(211,47,47,0.15)' 
  },
  fabMenuText: { fontSize: 16, color: '#D32F2F', fontWeight: '800', letterSpacing: 0.5 },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Filter Badge
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D32F2F',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },

  // Filter Modal
  filterModal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  filterItemSelected: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  filterColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  filterItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  filterModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterBtnClear: {
    backgroundColor: '#f5f5f5',
  },
  filterBtnApply: {
    backgroundColor: '#D32F2F',
  },
  filterBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCenter: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,215,0,0.6)',
  },
  modalTitleCenter: { fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center', color: '#D32F2F', letterSpacing: 0.8, textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  closeBtn: { marginTop: 20, backgroundColor: '#D32F2F', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6, borderWidth: 2, borderColor: '#FFD700' },
  dayHeaderCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dayHeaderTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  dayHeaderSubtitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Advanced Search Styles
  searchContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 12,
  },
  searchTypeBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  searchTypeActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  searchTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textAlign: 'center',
  },
  searchTypeTextActive: {
    color: '#fff',
  },
  searchResultsContainer: {
    maxHeight: 300,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  searchResultColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  searchResultMeta: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultNote: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  searchEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  searchEmptyText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
    marginTop: 12,
  },
});

