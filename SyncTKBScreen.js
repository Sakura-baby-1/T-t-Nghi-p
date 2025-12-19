// screens/SyncTKBScreen.js – GIAO DIỆN HOÀNG KIM 2026
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import moment from "moment";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const API_BASE = "https://dkmh.tdmu.edu.vn/api";
const TDMU_LOGIN_URL = "https://dkmh.tdmu.edu.vn/#/login";

// Lưu currUser
const saveCurrUser = async (currUser) => {
  await AsyncStorage.setItem("tdmu_currUser", JSON.stringify(currUser));
};

// Lấy currUser
const getCurrUser = async () => {
  const str = await AsyncStorage.getItem("tdmu_currUser");
  return str ? JSON.parse(str) : null;
};

// Gọi API TKB
const getTKB = async () => {
  const currUser = await getCurrUser();
  if (!currUser?.ASPNET_SessionId) throw new Error("Bạn chưa đăng nhập TDMU!");

  const res = await axios.get(`${API_BASE}/dkmh/w-locsinhvieninfo`, {
    headers: { Cookie: `ASP.NET_SessionId=${currUser.ASPNET_SessionId}` },
  });

  return res.data;
};

// Kiểm tra lịch tuần này
const hasClassesThisWeek = (data) => {
  const start = moment().startOf("isoWeek");
  const end = moment().endOf("isoWeek");

  return data.some((item) => {
    const d = moment(item.ngayHoc, "YYYY-MM-DD");
    return d.isBetween(start, end, "day", "[]");
  });
};

export default function SyncTKBScreen() {
  const [loading, setLoading] = useState(false);
  const [tkbData, setTKBData] = useState(null);

  useEffect(() => {
    const handleUrl = async ({ url }) => {
      if (!url.includes("CurrUser=")) return;

      try {
        const params = new URLSearchParams(url.split("?")[1]);
        const currUserStr = params.get("CurrUser");

        const currUser = JSON.parse(decodeURIComponent(currUserStr));
        await saveCurrUser(currUser);

        setLoading(true);
        const data = await getTKB();
        setTKBData(data);

        Haptics.notificationAsync("success");

        if (hasClassesThisWeek(data)) {
          Alert.alert("🎉 Thành công", "Đồng bộ TKB tuần này thành công!");
        } else {
          Alert.alert("📭 Không có lịch học tuần này!");
        }
      } catch (e) {
        Alert.alert("❌ Lỗi", e.message);
      } finally {
        setLoading(false);
        WebBrowser.dismissBrowser();
      }
    };

    const listener = Linking.addEventListener("url", handleUrl);
    return () => listener.remove();
  }, []);

  const login = async () => {
    Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(TDMU_LOGIN_URL);
  };

  return (
    <ImageBackground source={require("./assets/bg-tet.jpg")} style={{ flex: 1 }} blurRadius={3}>
      <LinearGradient
        colors={["rgba(211,47,47,0.95)", "rgba(255,215,0,0.15)", "rgba(211,47,47,0.95)"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />

          {/* HEADER HOÀNG GIA */}
          <LinearGradient colors={["#FFD700", "#FFA000"]} style={styles.header}>
            <MaterialCommunityIcons name="calendar-star" size={36} color="#D32F2F" />
            <Text style={styles.headerTitle}>ĐỒNG BỘ TKB</Text>
            <MaterialCommunityIcons name="crown" size={36} color="#D32F2F" />
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 120 }}>

            {/* CARD WELCOME */}
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeText}>Đón Tết – Nhận Lịch Học</Text>
              <Text style={styles.appName}>TẾT 2026</Text>
              <Text style={styles.wish}>Chúc bạn một năm mới Đại Cát – Đại Lợi</Text>
            </View>

            {/* NÚT ĐĂNG NHẬP */}
            <TouchableOpacity activeOpacity={0.85} onPress={login} style={styles.buttonShadow}>
              <LinearGradient colors={["#D32F2F", "#B71C1C"]} style={styles.button}>
                <MaterialCommunityIcons name="login" size={28} color="#fff" />
                <Text style={styles.buttonText}>ĐĂNG NHẬP TDMU</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* LOADING */}
            {loading && (
              <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 20 }} />
            )}

            {/* CARD TKB */}
            {tkbData && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📚 Dữ liệu TKB</Text>
                <Text style={styles.cardText}>{JSON.stringify(tkbData, null, 2)}</Text>
              </View>
            )}

          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

/* ========== STYLE HOÀNG GIA TẾT ========== */
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#D32F2F",
    marginHorizontal: 14,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },

  welcomeCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 26,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 3,
    borderColor: "#FFD700",
  },
  welcomeText: { fontSize: 18, color: "#FFD700", fontWeight: "600" },
  appName: {
    fontSize: 38,
    color: "#FFD700",
    fontWeight: "900",
    marginVertical: 4,
    textShadowColor: "#D32F2F",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
  },
  wish: { fontSize: 18, color: "#fff", fontWeight: "bold" },

  buttonShadow: {
    borderRadius: 30,
    overflow: "hidden",
    elevation: 20,
    marginBottom: 26,
  },
  button: {
    flexDirection: "row",
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginLeft: 16,
  },

  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "#FFD700",
    elevation: 18,
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#D32F2F",
    marginBottom: 10,
  },
  cardText: {
    fontSize: 13,
    color: "#000",
    fontWeight: "500",
  },
});
