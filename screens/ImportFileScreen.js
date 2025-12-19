// screens/ImportTKBScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { db, auth } from "../firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useTranslation } from "react-i18next";

export default function ImportTKBScreen({ navigation }) {
  const { t } = useTranslation();
  const [mssv, setMSSV] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!mssv || !password) {
      Alert.alert(t('error', { defaultValue: 'Lỗi' }), t('email_required', { defaultValue: 'Vui lòng nhập MSSV và mật khẩu!' }));
      return;
    }

    setLoading(true);

    try {
      // --- Bước 1: Login lấy token ---
      const loginRes = await axios.post(
        "https://dkmh.tdmu.edu.vn/api/auth/login",
        { username: mssv, password: password },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = loginRes.data?.token;
      if (!token) throw new Error("Đăng nhập thất bại!");

      // --- Bước 2: Gọi API lấy TKB tuần hiện tại ---
      const tkbRes = await axios.post(
        "https://dkmh.tdmu.edu.vn/api/sch/w-locdsdoituongthoikhoabieu",
        {}, // body rỗng
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const tkbData = tkbRes.data;
      if (!tkbData?.length) throw new Error("Không có dữ liệu TKB!");

      const uid = auth.currentUser?.uid || "demo-user";

      // --- Bước 3: Lưu vào Firestore ---
      for (let ev of tkbData) {
        await addDoc(collection(db, "events"), {
          tieuDe: ev.tenMon,
          ngayBatDau: Timestamp.fromDate(new Date(ev.ngayBatDau)),
          ngayKetThuc: Timestamp.fromDate(new Date(ev.ngayKetThuc)),
          ghiChu: ev.ghiChu || "",
          lapLai: "Không lặp lại",
          caNgay: false,
          lich: { name: "Học tập", key: "study", color: "#42a5f5" },
          color: "#42a5f5",
          userId: uid,
        });
      }

      Alert.alert("✅ Import TKB thành công!");
      navigation.navigate("EventsCalendar");
    } catch (err) {
      console.log(err);
      Alert.alert("❌ Lỗi", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('import_tkb_title', { defaultValue: 'Import TKB từ TDMU' })}</Text>
      <TextInput
        placeholder={t('student_id', { defaultValue: 'MSSV' })}
        style={styles.input}
        value={mssv}
        onChangeText={setMSSV}
        keyboardType="numeric"
      />
      <TextInput
        placeholder={t('login_password_placeholder', { defaultValue: 'Mật khẩu' })}
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleImport}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t('import_button', { defaultValue: 'Import TKB' })}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f6f6f6",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#3F51B5",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16 },
});
