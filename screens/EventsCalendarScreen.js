 // screens/EventsCalendarScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";

// --- Ngày lễ cố định ---
const holidays = {
  "2025-01-01": "Tết Dương lịch",
  "2025-04-30": "Giải phóng miền Nam",
  "2025-05-01": "Quốc tế Lao động",
  "2025-09-02": "Quốc khánh",
  "2025-12-25": "Giáng sinh",
  "2025-01-29": "Tết Nguyên Đán (mùng 1)",
  "2025-01-30": "Tết Nguyên Đán (mùng 2)",
  "2025-01-31": "Tết Nguyên Đán (mùng 3)",
  "2025-02-14": "Rằm Tháng Giêng",
  "2025-09-06": "Tết Trung Thu",
  "2025-11-20": "Ngày Nhà giáo Việt Nam",
};

export default function EventsCalendarScreen() {
  const [events, setEvents] = useState({});
  const [eventsByDate, setEventsByDate] = useState({});
  const [selectedView, setSelectedView] = useState("month");
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [showModal, setShowModal] = useState(false);
  const [modalEvents, setModalEvents] = useState([]);
  const [modalDate, setModalDate] = useState("");

  const navigation = useNavigation();

  // --- Lấy màu theo loại lịch ---
  const getEventColor = (type) => {
    switch (type) {
      case "Lịch học":
        return "#1E88E5";
      case "Làm thêm":
        return "#8E24AA";
      case "CLB / Sự kiện":
        return "#E53935";
      case "Công việc":
        return "#7b61ff";
      case "Ngày lễ":
        return "#FF7043";
      default:
        return "#43A047";
    }
  };

  useEffect(() => {
  if (!auth.currentUser) return;

  const q = query(
    collection(db, "events"),
    where("userId", "==", auth.currentUser.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const marked = {};
    const byDate = {};

    const now = new Date(); // thời gian hiện tại

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      const start = data.ngayBatDau?.toDate
        ? data.ngayBatDau.toDate()
        : data.ngayBatDau;
      if (!start) return;

      // chỉ lấy sự kiện từ hiện tại trở đi
      if (start < now) return;

      const dateStr = moment(start).format("YYYY-MM-DD");

      // đánh dấu ngày có sự kiện
      if (!marked[dateStr]) marked[dateStr] = { dots: [] };
      marked[dateStr].dots.push({
        key: doc.id,
        color: getEventColor(data.lich?.name),
      });

      // group theo ngày
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push({ id: doc.id, ...data });
    });

    setEvents(marked);
    setEventsByDate(byDate);
  });

  return () => unsubscribe();
}, []);

  // --- Click chọn ngày ---
  const handleDayPress = (dateStr) => {
    setSelectedDate(dateStr);
    const dayEvents = eventsByDate[dateStr] || [];
    const holidayLabel = holidays[dateStr];

    let combinedEvents = [...dayEvents];
    if (holidayLabel) {
      combinedEvents.unshift({
        id: "holiday-" + dateStr,
        tieuDe: holidayLabel,
        lich: { name: "Ngày lễ" },
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
    const holidayLabel = holidays[date.dateString];
    const dayEvents = eventsByDate[date.dateString] || [];
    const hasEvents = dayEvents.length > 0 || holidayLabel;

    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          isSelected && styles.daySelected,
          hasEvents && {
            borderWidth: 2,
            borderColor: holidayLabel ? "#FF7043" : "#1E88E5",
            backgroundColor: holidayLabel ? "#FFF3E0" : "#E3F2FD",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            elevation: 8,
          },
        ]}
        onPress={() => handleDayPress(date.dateString)}
      >
        <Text
          style={[
            styles.dayText,
            state === "disabled" && { color: "#ccc" },
            isToday && { color: "#FF7043", fontWeight: "bold" },
            dayOfWeek === 0 && { color: "red" },
          ]}
        >
          {date.day}
        </Text>

        {/* Lịch âm (placeholder, cần lib để chính xác) */}
        <Text style={styles.lunarText}>
          {moment(date.dateString).subtract(1, "month").format("MM.DD")}
        </Text>

        {/* Hiển thị sự kiện */}
        {dayEvents.map((ev, i) => (
          <Text
            key={i}
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: getEventColor(ev.lich?.name),
              backgroundColor: "#FFF",
              borderRadius: 6,
              paddingHorizontal: 4,
              marginTop: 2,
              maxWidth: 50,
              textShadowColor: "#aaa",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 1,
              overflow: "hidden",
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {ev.tieuDe}
          </Text>
        ))}

        {holidayLabel && (
          <Text style={styles.holidayLabel}>🎉 {holidayLabel}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const calendarTheme = {
    todayTextColor: "#FF7043",
    arrowColor: "#1E88E5",
    monthTextColor: "#000",
  };

  const renderMonthView = () => (
    <Calendar
      style={{ marginVertical: 8 }}
      markingType={"multi-dot"}
      markedDates={{
        ...events,
        [selectedDate]: {
          ...(events[selectedDate] || {}),
          selected: true,
          selectedColor: "#1E88E5",
        },
      }}
      onDayPress={(day) => handleDayPress(day.dateString)}
      theme={calendarTheme}
      dayComponent={({ date, state }) => renderDayCell(date, state)}
    />
  );

  const renderDayView = () => (
    <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 60 }}>
      <Text style={styles.dayTitle}>
        {moment(selectedDate).format("dddd, DD/MM/YYYY")}
      </Text>
      {(eventsByDate[selectedDate] || []).map((ev) => (
        <TouchableOpacity
          key={ev.id}
          style={[
            styles.eventCard,
            { borderLeftColor: getEventColor(ev.lich?.name) },
          ]}
          onPress={() =>
  navigation.navigate("EventScreen", { event: ev })
}
        >
          <Text style={styles.eventTitle}>{ev.tieuDe}</Text>
          <Text style={styles.eventTextSmall}>
            🕒{" "}
            {ev.caNgay
              ? "Cả ngày"
              : `${moment(ev.ngayBatDau.toDate()).format("HH:mm")} - ${moment(
                  ev.ngayKetThuc.toDate()
                ).format("HH:mm")}`}
          </Text>
          {ev.diaDiem && (
            <Text style={styles.eventTextSmall}>📍 {ev.diaDiem}</Text>
          )}
          <Text style={styles.eventTextSmall}>📂 {ev.lich?.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Thanh trên */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>
          {moment(selectedDate).format("MM/YYYY")}
        </Text>
        <View style={styles.topBarCenter}>
          {["month", "day"].map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setSelectedView(v)}
              style={[
                styles.viewBtn,
                selectedView === v && styles.viewBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.viewBtnText,
                  selectedView === v && styles.viewBtnTextActive,
                ]}
              >
                {v === "month" ? "Tháng" : "Ngày"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Ionicons name="ellipsis-vertical" size={22} color="#333" />
      </View>

      {selectedView === "month" && renderMonthView()}
      {selectedView === "day" && renderDayView()}

      {/* Nút thêm sự kiện */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddEvent")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
              Sự kiện ngày {moment(modalDate).format("dddd, DD/MM/YYYY")}
            </Text>

            <ScrollView style={{ marginTop: 8 }}>
              {modalEvents.map((ev) => (
                <View
                  key={ev.id}
                  style={{
                    padding: 16,
                    marginVertical: 8,
                    borderRadius: 14,
                    borderLeftWidth: 6,
                    borderLeftColor: ev.isHoliday
                      ? "#FF7043"
                      : getEventColor(ev.lich?.name),
                    backgroundColor: ev.isHoliday ? "#FFF3E0" : "#E3F2FD",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 5 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: ev.isHoliday ? 18 : 16,
                      fontWeight: "bold",
                      color: ev.isHoliday ? "#D32F2F" : "#1E88E5",
                      marginBottom: 4,
                    }}
                  >
                    {ev.isHoliday
                      ? `🎉 ${ev.tieuDe}`
                      : `${ev.tieuDe} (${ev.lich?.name})`}
                  </Text>

                  {/* Thời gian */}
                  {!ev.isHoliday && (
                    <Text style={{ fontSize: 14, color: "#555", marginBottom: 2 }}>
                      {ev.caNgay
                        ? "🕒 Cả ngày"
                        : `🕒 ${moment(ev.ngayBatDau.toDate()).format(
                            "HH:mm"
                          )} - ${moment(ev.ngayKetThuc.toDate()).format(
                            "HH:mm"
                          )}`}
                    </Text>
                  )}

                  {/* Địa điểm */}
                  {!ev.isHoliday && ev.diaDiem && (
                    <Text style={{ fontSize: 14, color: "#555", marginBottom: 2 }}>
                      📍 {ev.diaDiem}
                    </Text>
                  )}

                  {/* Ghi chú */}
                  {!ev.isHoliday && ev.ghiChu && (
                    <Text style={{ fontSize: 14, color: "#555", marginBottom: 2 }}>
                      📝 {ev.ghiChu}
                    </Text>
                  )}

                  {/* Loại lịch */}
                  {!ev.isHoliday && (
                    <Text style={{ fontSize: 14, color: "#555" }}>
                      📂 {ev.lich?.name}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowModal(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Đóng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  dayCell: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 6,
    width: 60,
    minHeight: 90,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginVertical: 2,
    marginHorizontal: 1,
  },
  daySelected: { backgroundColor: '#1E88E520', borderWidth: 2, borderColor: '#1E88E5' },
  dayText: { fontSize: 16, color: '#222', fontWeight: '500' },
  lunarText: { fontSize: 10, color: '#999', marginTop: 2 },
  holidayLabel: { fontSize: 10, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center', marginTop: 2 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4
  },
  topBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  topBarCenter: { flexDirection: 'row', alignItems: 'center' },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#1E88E5', marginHorizontal: 2 },
  viewBtnActive: { backgroundColor: '#1E88E5' },
  viewBtnText: { fontSize: 13, color: '#1E88E5', fontWeight: '500' },
  viewBtnTextActive: { color: '#fff', fontWeight: 'bold' },

  dayTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 12, textAlign: 'center', color: '#1E88E5' },

  eventCard: { 
    padding: 14, 
    marginVertical: 6, 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    elevation: 4, 
    borderLeftWidth: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2 
  },
  eventTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: '#222' },
  eventTextSmall: { fontSize: 13, color: '#555', marginTop: 2 },

  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    backgroundColor: '#1E88E5', 
    padding: 16, 
    borderRadius: 50, 
    elevation: 6, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4 
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCenter: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitleCenter: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    textAlign: 'center', 
    color: '#1E88E5' 
  },
  closeBtn: { 
    marginTop: 12, 
    backgroundColor: '#1E88E5', 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3 
  },
});
