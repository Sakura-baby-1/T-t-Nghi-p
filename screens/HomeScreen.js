// screens/HomeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Image,
  Dimensions,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart } from "react-native-chart-kit";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useSettings } from "../context/SettingsContext";

export default function HomeScreen({ navigation }) {
  const { isDarkMode } = useSettings();

  const [greeting, setGreeting] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ weekEvents: 0, pending: 0, events: [] });
  const [quote, setQuote] = useState("");
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
const [upcomingReminders, setUpcomingReminders] = useState([]); // cho 5 sự kiện nhắc nhở

  const user = auth.currentUser;
  const username = user?.displayName || "Người dùng";

  // --- Lời chào ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(`Chào buổi sáng, ${username} ☀️`);
    else if (hour < 18) setGreeting(`Chào buổi chiều, ${username} 🌤️`);
    else setGreeting(`Chào buổi tối, ${username} 🌙`);
  }, [username]);

  useEffect(() => {
  if (!auth.currentUser) return;

  const unsubscribe = onSnapshot(
    query(collection(db, "events"), where("userId", "==", auth.currentUser.uid)),
    (snapshot) => {
      const now = new Date();

      const events = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          tieuDe: data.tieuDe || "Sự kiện",
          caNgay: data.caNgay || false,
          startDate: data.ngayBatDau?.toDate() || new Date(),
          endDate: data.ngayKetThuc?.toDate() || null,
          location: data.diaDiem || "",
          description: data.ghiChu || "",
          lapLai: data.lapLai || "Không lặp lại",
          thongBao: data.thongBao || "Không thông báo",
          type: data.lich?.name || "",
          calendarColor: data.lich?.color || "#7b61ff",
        };
      });

      // --- Home screen: tất cả sự kiện sắp tới ---
      const allUpcoming = events
        .filter(ev => ev.startDate >= now)
        .sort((a, b) => a.startDate - b.startDate);

      setNotifications(allUpcoming); // hiển thị tất cả trên home

      // --- Notification: chỉ 5 sự kiện gần nhất ---
      const upcomingForReminder = allUpcoming.slice(0, 5);
      setUpcomingReminders(upcomingForReminder); // dùng để lập lịch nhắc nhở
    }
  );

  return () => unsubscribe();
}, []);


// --- Hiển thị danh sách sự kiện ---
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: isDarkMode ? "#fff" : "#333" }]}>
    🔔 Sự kiện sắp tới
  </Text>

  {notifications.length > 0 ? (
    notifications.map((event) => (
      <View key={event.id} style={{ marginBottom: 12 }}>
        <LinearGradient
          colors={[event.calendarColor, "#ffaaa6"]}
          style={styles.notifCard}
        >
          <TouchableOpacity
            style={{ padding: 16, borderRadius: 16 }}
            onPress={() => {
              setSelectedEvent(event);
              setDetailModalVisible(true);
            }}
          >
            <Text style={styles.notifTitle}>{event.tieuDe}</Text>
            <Text style={styles.notifTime}>
              🕒 {event.startDate.toLocaleDateString()}{" "}
              {event.caNgay
                ? "(Cả ngày)"
                : event.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
                  (event.endDate
                    ? ` - ${event.endDate.toLocaleDateString()} ${event.endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "")}
            </Text>
            {event.type && <Text>📂 Lịch: {event.type}</Text>}
            {event.location && <Text>📍 Địa điểm: {event.location}</Text>}
            {event.description && <Text>📝 Ghi chú: {event.description}</Text>}
            {event.lapLai && event.lapLai !== "Không lặp lại" && <Text>🔁 Lặp lại: {event.lapLai}</Text>}
            {event.thongBao && event.thongBao !== "Không thông báo" && <Text>🔔 Thông báo: {event.thongBao}</Text>}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    ))
  ) : (
    <Text style={{ color: "#999", fontStyle: "italic" }}>Không có sự kiện sắp tới</Text>
  )}
</View>

  // --- Câu trích dẫn ---
  useEffect(() => {
    const quotes = [
      "Hãy sống như thể bạn sẽ chết ngày mai, học như thể bạn sẽ sống mãi mãi.",
      "Thành công = 1% may mắn + 99% nỗ lực.",
      "Mỗi ngày là một cơ hội mới để thay đổi.",
      "Đừng chờ đợi. Thời gian sẽ không bao giờ là 'đúng lúc'.",
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? "#121212" : "#f5f7fb" }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* --- Header --- */}
        <LinearGradient
          colors={["#4a90e2", "#6dd5ed", "#50c9c3"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
              <Image
                source={{ uri: user?.photoURL || "https://i.pravatar.cc/100" }}
                style={[styles.avatar, { borderWidth: 3, borderColor: "#fff" }]}
              />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.quote}>{quote}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* --- Thanh tìm kiếm --- */}
        <View style={[styles.searchBar, { backgroundColor: isDarkMode ? "#1e1e1e" : "#fff" }]}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#bbb" : "#777"} />
          <TextInput
            placeholder="Tìm kiếm sự kiện..."
            placeholderTextColor={isDarkMode ? "#777" : "#aaa"}
            style={{ marginLeft: 12, flex: 1, fontSize: 14, fontWeight: "500", color: isDarkMode ? "#fff" : "#000" }}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

    {/* --- Thông báo sự kiện sắp tới --- */}
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: isDarkMode ? "#fff" : "#333" }]}>
    🔔 Sự Kiện Sắp Tới
  </Text>

  {notifications.length > 0 ? (
    notifications.map((event) => (
      <View key={event.id} style={{ marginBottom: 12 }}>
        <LinearGradient
          colors={["#ff8b94", "#ffaaa6"]}
          style={styles.notifCard}
        >
          <TouchableOpacity
            style={{ padding: 16, borderRadius: 16 }}
            onPress={() => {
              setSelectedEvent(event);
              setDetailModalVisible(true);
            }}
          >
            {/* 📂 Lịch */}
            {event.type && (
              <Text style={[styles.notifText, { fontWeight: "bold" }]}>
                📂 {event.type}
              </Text>
            )}

            {/* 📝 Tiêu đề */}
           <Text style={styles.notifTitle}>{event.tieuDe}</Text>

            {/* 🕒 Thời gian */}
            <Text style={styles.notifTime}>
              🕒 {event.startDate.toLocaleDateString()}{" "}
              {event.startDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {event.endDate
                ? ` - ${event.endDate.toLocaleDateString()} ${event.endDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    ))
  ) : (
    <Text style={{ color: "#999", fontStyle: "italic" }}>
      Không có sự kiện sắp tới
    </Text>
  )}
</View>


        {/* --- Hành động nhanh --- */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#fff" : "#333" }]}>⚡ Hành Động Nhanh</Text>
          <View style={styles.quickActions}>
            {[
              { icon: "person-circle", text: "Hồ sơ", color: "#ff7675", action: () => navigation.navigate("Profile") },
              { icon: "add-circle", text: "Thêm Sự Kiện", color: "#a29bfe", action: () => navigation.navigate("AddEvent") },
              { icon: "calendar", text: "Lịch", color: "#55efc4", action: () => navigation.navigate("EventsCalendar") },
              { icon: "stats-chart", text: "Thống Kê Tuần", color: "#fab1a0", action: () => setModalVisible(true) },
              { icon: "chatbubble-ellipses", text: "Trợ Lý AI", color: "#8e44ad", action: () => navigation.navigate("AIChat") },
              { icon: "settings", text: "Cài Đặt", color: "#ffeaa7", action: () => navigation.navigate("Settings") },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.actionBtn, { backgroundColor: isDarkMode ? "#1e1e1e" : "#fff" }]}
                onPress={item.action}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.color + "55" }]}>
                  <Ionicons name={item.icon} size={26} color={item.color} />
                </View>
                <Text style={[styles.actionText, { color: isDarkMode ? "#fff" : "#333" }]}>{item.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* --- Nút AI Chat nổi --- */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("AIChat")}>
        <Ionicons name="rocket" size={28} color="#fff" />
      </TouchableOpacity>


      {/* --- Weekly Stats Modal --- */}
      {modalVisible && (
        <WeeklyStatsModal
          stats={stats}
          showEvents={showEvents}
          setShowEvents={setShowEvents}
          onClose={() => { setModalVisible(false); setShowEvents(false); }}
          onSelectEvent={(e) => { setSelectedEvent(e); setDetailModalVisible(true); }}
        />
      )}

      {/* --- Event Detail Modal --- */}
      {detailModalVisible && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setDetailModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}
// --- Modal Thống Kê Tuần ---
function WeeklyStatsModal({ stats, showEvents, setShowEvents, onClose, onSelectEvent }) {
  const { width } = Dimensions.get("window");

  // Lọc sự kiện dựa trên trạng thái
  const filteredEvents = stats.events.filter((e) => {
    const now = new Date();
    if (showEvents === "completed") return new Date(e.startDate) < now;  // đã hoàn thành
    if (showEvents === "pending") return new Date(e.startDate) >= now;   // chưa hoàn thành
    return true; // tất cả
  });

  return (
    <Modal visible={true} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f7fb" }}>
        {/* --- Header --- */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Thống Kê Tuần</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        {/* --- Thẻ số liệu --- */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={() => setShowEvents("all")}>
            <Text style={[styles.statNumber, { color: "#4a90e2" }]}>{stats.weekEvents}</Text>
            <Text style={styles.statLabel}>Tổng Sự Kiện</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => setShowEvents("pending")}>
            <Text style={[styles.statNumber, { color: "#e67e22" }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Chưa Hoàn Thành</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => setShowEvents("completed")}>
            <Text style={[styles.statNumber, { color: "#2ecc71" }]}>{stats.weekEvents - stats.pending}</Text>
            <Text style={styles.statLabel}>Đã Hoàn Thành</Text>
          </TouchableOpacity>
        </View>

        {/* --- Biểu đồ tròn --- */}
        {stats.weekEvents > 0 && (
          <PieChart
            data={[
              { name: "Đã Hoàn Thành", population: stats.weekEvents - stats.pending, color: "#2ecc71", legendFontColor: "#333", legendFontSize: 13 },
              { name: "Chưa Hoàn Thành", population: stats.pending, color: "#e67e22", legendFontColor: "#333", legendFontSize: 13 },
            ]}
            width={width - 40}
            height={200}
            chartConfig={{ color: () => "#333" }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="16"
            absolute
          />
        )}

        {/* --- Danh sách sự kiện --- */}
        {showEvents && (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isCompleted = new Date(item.startDate) < new Date();
              return (
                <TouchableOpacity
                  style={[styles.eventCard, { borderLeftColor: isCompleted ? "#2ecc71" : "#e67e22" }]}
                  onPress={() => onSelectEvent(item)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={isCompleted ? "checkmark-circle" : "time"}
                      size={22}
                      color={isCompleted ? "#2ecc71" : "#e67e22"}
                      style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      <Text style={styles.eventTime}>{new Date(item.startDate).toLocaleString()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// --- Modal Chi Tiết Sự Kiện ---
function EventDetailModal({ event, onClose }) {
  if (!event) return null; // tránh crash khi event null

  // Convert timestamp -> Date
  const startDate =
    event.startDate?.toDate?.() || new Date(event.startDate || Date.now());
  const endDate =
    event.endDate?.toDate?.() ||
    (event.endDate ? new Date(event.endDate) : null);

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.detailOverlay}>
        <View style={styles.detailContainer}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <Text style={styles.detailHeaderTitle}>Chi Tiết Sự Kiện</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Nội dung */}
         <ScrollView showsVerticalScrollIndicator={false}>
  <Text style={styles.detailTitle}>
    📌 {event.tieuDe || "Không có tên sự kiện"}
  </Text>

            <Text style={styles.detailText}>
              🕒 {startDate.toLocaleString()} -{" "}
              {endDate ? endDate.toLocaleString() : "-"}
            </Text>

            {event.location && (
              <Text style={styles.detailText}>📍 Địa Điểm: {event.location}</Text>
            )}

            {event.type && (
              <Text style={styles.detailText}>📂 Loại: {event.type}</Text>
            )}

            <Text style={styles.detailText}>
              📝 Mô Tả: {event.description || "Không có mô tả"}
            </Text>

            {event.calendar?.name && (
              <Text style={styles.detailText}>📅 Lịch: {event.calendar.name}</Text>
            )}
          </ScrollView>

          {/* Nút đóng */}
          <TouchableOpacity style={styles.closeBtnModal} onPress={onClose}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              Đóng
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 6 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  greeting: { fontSize: 20, fontWeight: "700", color: "#fff" },
  quote: { fontSize: 14, color: "#e3f2fd" },
  searchBar: { flexDirection: "row", marginHorizontal: 20, padding: 14, borderRadius: 30, alignItems: "center", marginTop: -25, marginBottom: 20, elevation: 8 },
  section: { marginVertical: 16, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  notifCard: { borderRadius: 16, elevation: 4, shadowColor: "#000" },
  notifTitle: { fontWeight: "700", color: "#222", fontSize: 15 },
  notifTime: { color: "#777", fontSize: 12, marginTop: 6 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  actionBtn: { width: "47%", padding: 20, borderRadius: 18, alignItems: "center", marginBottom: 16, elevation: 4 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  actionText: { fontWeight: "700", fontSize: 14 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: "#50c9c3", alignItems: "center", justifyContent: "center", elevation: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: "#ddd", backgroundColor: "#fff", elevation: 2 },
  modalHeaderTitle: { fontWeight: "700", fontSize: 20, color: "#1E88E5" },
  statsContainer: { flexDirection: "row", justifyContent: "space-around", marginVertical: 20 },
  statCard: { alignItems: "center" },
  statNumber: { fontSize: 26, fontWeight: "700" },
  statLabel: { fontSize: 14, color: "#555" },
  eventCard: { borderLeftWidth: 4, padding: 12, borderRadius: 12, marginVertical: 6, backgroundColor: "#fff", elevation: 2 },
  eventTitle: { fontWeight: "700", fontSize: 15, color: "#333" },
  eventTime: { fontSize: 12, color: "#555" },
  detailOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  detailContainer: { width: "90%", maxHeight: "80%", backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 12 },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, backgroundColor: "#50c9c3", padding: 10, borderRadius: 12 },
  detailHeaderTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  detailTitle: { fontSize: 20, fontWeight: "bold", color: "#1E88E5", marginBottom: 10, textShadowColor: "#aaa", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  detailText: { fontSize: 14, color: "#555", marginBottom: 6 },
  closeBtnModal: { marginTop: 16, backgroundColor: "#1E88E5", padding: 14, borderRadius: 12, alignItems: "center" },

});
