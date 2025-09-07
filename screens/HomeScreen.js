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

      // --- Lấy khoảng thời gian trong ngày hôm nay ---
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // --- Lọc sự kiện trong hôm nay và sau thời điểm hiện tại ---
      const todayEvents = events
        .filter(
          (ev) =>
            ev.startDate >= now && // chưa diễn ra
            ev.startDate >= startOfToday &&
            ev.startDate <= endOfToday
        )
        .sort((a, b) => a.startDate - b.startDate);

      // --- Giữ tối đa 5 sự kiện ---
      const top5Today = todayEvents.slice(0, 5);

      setNotifications(top5Today); // Home hiển thị 5 sự kiện gần nhất trong hôm nay
      setUpcomingReminders(top5Today); // Notification cũng dùng chung
    }
  );

  return () => unsubscribe();
}, []);




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

{/* --- Sự kiện sắp tới --- */}
<Text style={[styles.sectionTitle, { color: isDarkMode ? "#fff" : "#333" }]}>
  🔔 Sự Kiện Sắp Tới
</Text>

{notifications.length > 0 ? (
  <FlatList
    data={notifications}
    horizontal
    keyExtractor={(item) => item.id}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 20 }}
    snapToInterval={270}       // width + marginRight
    decelerationRate="fast"    // scroll mượt
    renderItem={({ item }) => (
      <LinearGradient
        colors={["#ff9a9e", "#fad0c4"]}
        style={{
          width: 250,
          marginRight: 20,
          borderRadius: 20,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          style={{ padding: 16, flex: 1 }}
          onPress={() => {
            setSelectedEvent(item);
            setDetailModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          {item.type && <Text style={{ fontWeight: "700", fontSize: 12, marginBottom: 4 }}>📂 {item.type}</Text>}

          <Text
            style={{
              fontWeight: "800",
              fontSize: 18,                 // tăng size
              marginBottom: 6,
              color: "#1E88E5",             // màu nổi bật
              textShadowColor: "rgba(0,0,0,0.2)", // shadow nhẹ
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
            numberOfLines={2}         
            ellipsizeMode="tail"      
          >
            {item.tieuDe}
          </Text>

          <Text style={{ fontSize: 13, color: "#555" }}>
            🕒 {item.startDate.toLocaleDateString()}{" "}
            {item.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {item.endDate
              ? ` - ${item.endDate.toLocaleDateString()} ${item.endDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    )}
  />
) : (
  <Text style={{ color: "#999", fontStyle: "italic", paddingHorizontal: 20 }}>
    Không có sự kiện sắp tới
  </Text>
)}


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

      {/* --- Thống Kê Tuần  --- */}
function WeeklyStatsModal({ stats, onClose, onSelectEvent }) {
  const { width } = Dimensions.get("window");
  const [filter, setFilter] = useState("all"); // all, completed, pending

  // Filter events dựa theo trạng thái
  const now = new Date();
  const filteredEvents = stats.events.filter((e) => {
    const start = new Date(e.ngayBatDau);
    if (filter === "completed") return start < now;
    if (filter === "pending") return start >= now;
    return true;
  });

  return (
    <Modal visible={true} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f7fb" }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderColor: "#ddd" }}>
          <Text style={{ fontWeight: "700", fontSize: 20, color: "#1E88E5" }}>Thống Kê Tuần</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Số liệu */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 20 }}>
          <TouchableOpacity onPress={() => setFilter("all")} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#4a90e2" }}>{stats.weekEvents}</Text>
            <Text>Tổng sự kiện</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter("pending")} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#e67e22" }}>{stats.pending}</Text>
            <Text>Chưa hoàn thành</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter("completed")} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#2ecc71" }}>{stats.weekEvents - stats.pending}</Text>
            <Text>Đã hoàn thành</Text>
          </TouchableOpacity>
        </View>

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


        {/* Danh sách sự kiện */}
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isCompleted = new Date(item.ngayBatDau) < now;
            return (
              <TouchableOpacity
                style={{ padding: 12, borderRadius: 12, marginVertical: 6, backgroundColor: "#fff", borderLeftWidth: 4, borderLeftColor: isCompleted ? "#2ecc71" : "#e67e22" }}
                onPress={() => onSelectEvent(item)}
              >
                <Text style={{ fontWeight: "700", fontSize: 16, color: "#333" }}>{item.tieuDe}</Text>
                <Text style={{ fontSize: 12, color: "#555" }}>
                  🕒 {new Date(item.ngayBatDau).toLocaleString()} - {item.ngayKetThuc ? new Date(item.ngayKetThuc).toLocaleString() : "-"}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: "center", color: "#999", marginTop: 20 }}>Không có sự kiện nào</Text>}
        />
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

  notifListContainer: {
  maxHeight: 320, // chiều cao tối đa, bạn có thể tăng/giảm tuỳ màn hình
},
notifCard: {
  borderRadius: 16,
  elevation: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},
notifContent: {
  padding: 16,
  borderRadius: 16,
},
notifType: {
  fontWeight: "700",
  fontSize: 12,
  marginBottom: 4,
},
notifTitle: {
  fontWeight: "700",
  fontSize: 16,
  marginBottom: 6,
},
notifTime: {
  fontSize: 13,
}
});
