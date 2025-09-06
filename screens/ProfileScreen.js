// ProfileScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { auth, db } from "../firebase";
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen() {
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();

  const [userData, setUserData] = useState({
    ten: "",
    email: "",
    photoBase64: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const defaultAvatar = "https://www.gravatar.com/avatar/?d=mp";

  // --- Lấy dữ liệu từ Firestore ---
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          ten: data.ten || user.displayName || user.uid,
          email: user.email,
          photoBase64: data.photoBase64 || "",
        });
        setPreviewImage(
          data.photoBase64
            ? "data:image/jpeg;base64," + data.photoBase64
            : user.photoURL || defaultAvatar
        );
      } else {
        setUserData({
          ten: user.displayName || user.uid,
          email: user.email,
          photoBase64: "",
        });
        setPreviewImage(user.photoURL || defaultAvatar);
      }
    };
    fetchUserData();
  }, []);

  // --- Chọn ảnh ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64Data = result.assets[0].base64;
      const uri = "data:image/jpeg;base64," + base64Data;
      setPreviewImage(uri);
      setUserData((prev) => ({ ...prev, photoBase64: base64Data }));
    }
  };

  // --- Cập nhật thông tin ---
  const handleUpdate = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Firebase Auth
      await updateProfile(user, {
        displayName: userData.ten || user.uid,
        photoURL: previewImage,
      });
      if (user.email !== userData.email) {
        await updateEmail(user, userData.email);
      }
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      // Firestore
      await setDoc(
        doc(db, "users", user.uid),
        {
          ten: userData.ten || user.uid,
          photoBase64: userData.photoBase64 || "",
        },
        { merge: true }
      );

      Alert.alert(t("success"), t("profileUpdated"));
    } catch (error) {
      Alert.alert(t("error"), error.message);
    }
  };

  // --- Xóa tài khoản ---
  const handleDeleteAccount = async () => {
    Alert.alert(t("deleteAccount"), t("deleteAccountConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, "users", user.uid));
            await user.delete();
          } catch (error) {
            Alert.alert(t("error"), error.message);
          }
        },
      },
    ]);
  };

  const colors = {
    bg: isDarkMode ? "#121212" : "#f5f7fb",
    card: isDarkMode ? "#1e1e1e" : "#fff",
    text: isDarkMode ? "#fff" : "#333",
    placeholder: isDarkMode ? "#aaa" : "#999",
    avatarBorder: "#7b61ff",
    deleteButton: "#E53935",
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Avatar */}
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          <Image
            source={{ uri: previewImage || defaultAvatar }}
            style={[styles.avatar, { borderColor: colors.avatarBorder }]}
          />
          <Text style={[styles.changeAvatarText, { color: colors.text }]}>
            {t("changeAvatar")}
          </Text>
        </TouchableOpacity>

        {/* Tên */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Tên</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder="Nhập tên"
            placeholderTextColor={colors.placeholder}
            value={userData.ten}
            onChangeText={(text) => setUserData({ ...userData, ten: text })}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            value={userData.email}
            onChangeText={(text) => setUserData({ ...userData, email: text })}
          />
        </View>

        {/* Mật khẩu mới */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Mật khẩu mới</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
            ]}
            placeholder="Nhập mật khẩu mới"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>

        {/* Nút lưu */}
        <TouchableOpacity onPress={handleUpdate} style={{ marginTop: 10 }}>
          <LinearGradient colors={["#4CAF50", "#81C784"]} style={styles.button}>
            <Text style={styles.buttonText}>Lưu thay đổi</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Nút xóa */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.deleteButton }]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.buttonText}>Xóa tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: { alignItems: "center", marginBottom: 25 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    marginBottom: 8,
  },
  changeAvatarText: { fontWeight: "600", marginTop: 4 },
  inputGroup: { marginBottom: 15 },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  deleteButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
