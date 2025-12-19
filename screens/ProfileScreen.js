// screens/ProfileScreen.js – HỒ SƠ CÁ NHÂN TẾT 2026 ĐẸP NHẤT VIỆT NAM (ĐÃ FIX ẢNH 100%)
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebase"; // Không cần storage nữa
import { updateProfile, updateEmail, updatePassword } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";
import { useFocusEffect } from "@react-navigation/native";

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({
    ten: "",
    email: "",
    photoURL: "",
    mssv: "",
    lop: "",
    nganh: "",
    emailTDMU: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  // Avatar mặc định giống Home - LUÔN DÙNG URL
  const defaultAvatar = "https://i.ibb.co/9ZKwf4L/default-avatar-tet.png";
  const [avatarUri, setAvatarUri] = useState(defaultAvatar);

  // Animations Tết 2026
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarGlow = useRef(new Animated.Value(1)).current;
  const iconBounce = useRef(new Animated.Value(1)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Avatar pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarScale, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(avatarScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Avatar glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(avatarGlow, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(avatarGlow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Icon bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Card float
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -10,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Badge rotation
    Animated.loop(
      Animated.timing(badgeRotate, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const badgeRotation = badgeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Load avatar từ Firestore (giống Home) - TỐI ƯU TỐCĐỘ - CACHE AGGRESSIVELY
  useEffect(() => {
    const loadData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const photoURL = data.photoURL || user.photoURL || defaultAvatar;
          
          // Load dữ liệu ngay KHÔNG có timestamp để cache ảnh tốt nhất
          setUserData({
            ten: data.ten || user.displayName || "Người dùng",
            email: user.email || "",
            photoURL: data.photoURL || user.photoURL || "",
            mssv: data.mssv || "",
            lop: data.lop || "",
            nganh: data.nganh || "",
            emailTDMU: data.emailTDMU || "",
          });
          // Không thêm timestamp - để browser cache ảnh
          setAvatarUri(photoURL);
        } else {
          const photoURL = user.photoURL || defaultAvatar;
          
          setUserData(prev => ({
            ...prev,
            ten: user.displayName || "Người dùng",
            email: user.email || "",
            photoURL: user.photoURL || "",
          }));
          setAvatarUri(photoURL);
        }
      } catch (error) {
        console.warn("Error loading profile data:", error);
        setAvatarUri(defaultAvatar);
      }
    };
    loadData();
  }, []);

  // Refresh avatar mỗi khi quay lại Profile - TỐI ƯU TỐCĐỘ - CHỈ REFRESH KHI CẦN
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        if (uploading) return; // Skip nếu đang upload

        const user = auth.currentUser;
        if (!user) return;

        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            const photo = data.photoURL || user.photoURL || defaultAvatar;
            
            setUserData({
              ten: data.ten || user.displayName || "Người dùng",
              email: user.email || "",
              photoURL: data.photoURL || user.photoURL || "",
              mssv: data.mssv || "",
              lop: data.lop || "",
              nganh: data.nganh || "",
              emailTDMU: data.emailTDMU || "",
            });
            // Không thêm timestamp - giữ cache ảnh
            setAvatarUri(photo);
          }
        } catch (error) {
          console.warn("Error refreshing profile:", error);
        }
      };
      refreshData();
    }, [uploading])
  );

  // ĐỒNG BỘ bị TẮT để tránh conflict khi upload
  // useEffect theo dõi userData.photoURL gây ra việc reset previewImage
  // sau khi upload, làm mất timestamp và ảnh không hiển thị ngay

  const { t } = useTranslation();
  const { palette, isDarkMode } = useTheme();

  // UPLOAD ẢNH LÊN IMGBB (MIỄN PHÍ VĨNH VIỄN) - TỐI ƯU BẢN LÀM MỚI
  const pickAndUploadImage = async () => {
    Haptics.selectionAsync();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.15, // ⚡ TĂNG TỐC: Giảm từ 0.3 xuống 0.15 - file nhỏ 2x, upload nhanh 2x
      base64: true,
    });

    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    const base64 = result.assets[0].base64;
    
    // HIỂN THỊ ẢNH LOCAL NGAY
    setUploading(true);
    setAvatarUri(localUri);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('⏳ Uploading to ImgBB... (chất lượng tối ưu)');

    try {
      const formData = new FormData();
      formData.append('image', base64);
      
      const IMGBB_API_KEY = '96f63025adba7609431701530ce18863';
      
      // ⚡ TĂNG TỐC: Giảm timeout từ 60s xuống 45s - nhanh hơn, vẫn stable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!data.success) throw new Error(data.error?.message || "Upload thất bại");

      const photoURL = data.data.url;
      
      console.log('✅ Uploaded URL:', photoURL);

      // ⚡ TỐI ƯU: Gộp 2 writes (updateProfile + setDoc) thành parallel
      const user = auth.currentUser;
      if (user) {
        // 🚀 Chạy SONG SONG thay vì sequence
        await Promise.all([
          updateProfile(user, { photoURL }),
          setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true })
        ]);
      }

      // HIỂN THỊ URL MỚI NGAY
      setUserData(prev => ({ ...prev, photoURL }));
      setAvatarUri(photoURL);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Thành công!", "Ảnh đã được cập nhật!");
    } catch (error) {
      console.error("Upload failed:", error);
      
      let errorMsg = "Không thể upload ảnh.";
      if (error.name === 'AbortError') {
        errorMsg = "Timeout! Kiểm tra kết nối mạng và thử lại.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      Alert.alert("❌ Lỗi Upload", errorMsg);
      const fallbackUrl = userData.photoURL || defaultAvatar;
      setAvatarUri(fallbackUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Không tìm thấy người dùng");

      // Cập nhật Auth (chỉ tên, KHÔNG cập nhật photoURL vì có thể là base64)
      await updateProfile(user, {
        displayName: userData.ten,
      });

      if (user.email !== userData.email) {
        await updateEmail(user, userData.email);
      }
      if (newPassword.trim()) {
        await updatePassword(user, newPassword);
      }

      // Cập nhật Firestore (GIỮ NGUYÊN photoURL đã có)
      await setDoc(doc(db, "users", user.uid), {
        ten: userData.ten,
        photoURL: userData.photoURL, // Base64 đã được lưu từ pickAndUploadImage
        mssv: userData.mssv,
        lop: userData.lop,
        nganh: userData.nganh,
        emailTDMU: userData.emailTDMU,
      }, { merge: true });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("HOÀN TẤT!", "Hồ sơ đã được cập nhật thành công!", [
        { text: "OK", onPress: () => {
          // Quay về SettingsHome thay vì goBack
          navigation.navigate('Home');
        }}
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Lỗi", error.message || "Có lỗi xảy ra");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "XÓA TÀI KHOẢN VĨNH VIỄN",
      "Tất cả dữ liệu sẽ bị xóa mãi mãi. Bạn có chắc không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "XÓA NGAY",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              await deleteDoc(doc(db, "users", user.uid));
              await user.delete();
              navigation.replace("Login");
            } catch (err) {
              Alert.alert("Lỗi", err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ImageBackground 
      source={isDarkMode ? null : require("../assets/bg-tet.jpg")} 
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
      blurRadius={3}
    >
      <LinearGradient 
        colors={[
          palette?.surfaceGradientStart || "rgba(211,47,47,0.3)", 
          palette?.surfaceGradientMid || "rgba(255,215,0,0.1)", 
          palette?.surfaceGradientEnd || "rgba(211,47,47,0.3)"
        ]} 
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={palette?.isDark ? "light-content" : "dark-content"} />

          {/* Header */}
          <LinearGradient 
            colors={isDarkMode 
              ? [palette?.headerStart || "#2C2C2C", palette?.headerEnd || "#1A1A1A"] 
              : [palette?.accent || "#FFD700", palette?.primary || "#FFA000"]
            } 
            style={styles.header}
          >
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={36} color={isDarkMode ? palette?.accent : "#000"} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDarkMode ? palette?.accent : "#000" }]}>{t('profile_title')}</Text>
            <Animated.View style={{ transform: [{ rotate: badgeRotation }] }}>
              <MaterialCommunityIcons name="crown" size={36} color={isDarkMode ? palette?.accent : "#000"} />
            </Animated.View>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

            {/* Avatar + Upload - HIỂN THỊ NGAY LẬP TỨC */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAndUploadImage} activeOpacity={0.8} disabled={uploading}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: avatarUri || defaultAvatar, cache: 'force-cache' }}
                    style={styles.avatar}
                    resizeMode="cover"
                    progressiveRenderingEnabled={true}
                    onLoad={() => console.log('✅ Profile Image Loaded')}
                    onError={(e) => {
                      console.log('❌ Profile Image Error:', e.nativeEvent?.error);
                      setAvatarUri(defaultAvatar);
                    }}
                  />
                  <LinearGradient colors={[palette?.accent || "#FFD700", palette?.primary || "#FFA000"]} style={[styles.avatarBorder, { borderColor: palette?.accent || 'transparent' }]} />
                  {uploading ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#D32F2F" />
                      <Text style={{ color: "#D32F2F", marginTop: 8, fontWeight: "bold", fontSize: 14 }}>Đang tải...</Text>
                    </View>
                  ) : (
                    <View style={styles.cameraIcon}>
                      <MaterialCommunityIcons name="camera-plus" size={28} color="#D32F2F" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <Text style={[styles.avatarText, { color: palette?.accent || styles.avatarText.color }]}>
                {uploading ? "Đang upload ảnh..." : "Nhấn để đổi ảnh đại diện"}
              </Text>
            </View>

            {/* Form */}
            {[
              { label: t('full_name'), key: 'ten', icon: 'account', autoCap: 'words' },
              { label: t('personal_email'), key: 'email', icon: 'email', autoCap: 'none' },
              { label: t('student_id'), key: 'mssv', icon: 'card-account-details', autoCap: 'none' },
              { label: t('class_label'), key: 'lop', icon: 'google-classroom', autoCap: 'words' },
              { label: t('major'), key: 'nganh', icon: 'school', autoCap: 'words' },
              { label: t('school_email'), key: 'emailTDMU', icon: 'school-outline', autoCap: 'none' },
            ].map((field) => (
              <View key={field.key} style={[styles.inputWrapper, { backgroundColor: isDarkMode ? palette?.card : 'rgba(255,255,255,0.95)' }]}>
                <Animated.View style={{ transform: [{ scale: iconBounce }] }}>
                  <MaterialCommunityIcons name={field.icon} size={24} color={palette?.accent || '#FFD700'} style={styles.inputIcon} />
                </Animated.View>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? palette?.text : '#333' }]}
                  placeholder={field.label}
                  placeholderTextColor={isDarkMode ? palette?.textSecondary : "#cc9a00"}
                  value={userData[field.key]}
                  onChangeText={(text) => setUserData(prev => ({ ...prev, [field.key]: text }))}
                  autoCapitalize={field.autoCap}
                />
              </View>
            ))}

            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? palette?.card : 'rgba(255,255,255,0.95)' }]}>
              <MaterialCommunityIcons name="lock-reset" size={24} color={palette?.accent || '#FFD700'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDarkMode ? palette?.text : '#333' }]}
                placeholder={t('new_password_placeholder')}
                placeholderTextColor={isDarkMode ? palette?.textSecondary : "#cc9a00"}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <TouchableOpacity onPress={handleUpdate} style={styles.saveButton}>
              <LinearGradient colors={[palette?.accent || "#FFD700", palette?.primary || "#FFA000"]} style={styles.saveGradient}>
                <MaterialCommunityIcons name="content-save" size={28} color={palette?.primary || "#D32F2F"} />
                <Text style={[styles.saveText, { color: palette?.primary || styles.saveText.color }]}>{t('save_changes')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
              <LinearGradient colors={["#D32F2F", "#B71C1C"]} style={styles.deleteGradient}>
                <MaterialCommunityIcons name="delete-forever" size={26} color="#fff" />
                <Text style={styles.deleteText}>{t('delete_account_permanent')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: palette?.accent || styles.footerText.color }]}>{t('happy_new_year')}</Text>
              <Text style={[styles.footerBig, { color: palette?.accent || styles.footerBig.color }]}>{t('an_khang')}</Text>
              <Text style={[styles.footerYear, { color: palette?.text || styles.footerYear.color }]}>{t('tet_year')}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 25,
  },
  backButton: {
    width: 36,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#000",
    flex: 1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  avatarSection: { alignItems: "center", marginVertical: 30, width: "100%" },
  avatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    borderColor: "#fff",
    backgroundColor: "#f0f0f0",
    zIndex: 10,
  },
  avatarBorder: {
    position: "absolute",
    top: -8, left: -8, right: -8, bottom: -8,
    borderRadius: 78,
    borderWidth: 8,
    borderColor: "transparent",
    zIndex: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 70,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 25,
    elevation: 15,
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 20,
  },
  avatarText: { fontSize: 18, color: "#FFD700", marginTop: 16, fontWeight: "bold" },
  previewCol: { alignItems: "center" },
  extraLabel: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  extraAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, backgroundColor: "#f0f0f0" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 18,
    elevation: 15,
    borderWidth: 3,
    borderColor: "#FFD700",
    overflow: "hidden",
  },
  inputIcon: { padding: 18 },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingRight: 20,
    fontSize: 17,
    color: "#D32F2F",
    fontWeight: "600",
  },
  saveButton: { marginTop: 10, borderRadius: 30, overflow: "hidden", elevation: 25 },
  saveGradient: { flexDirection: "row", padding: 20, justifyContent: "center", alignItems: "center", gap: 12 },
  saveText: { color: "#D32F2F", fontSize: 20, fontWeight: "bold" },
  deleteButton: { marginTop: 30, borderRadius: 30, overflow: "hidden", elevation: 25 },
  deleteGradient: { flexDirection: "row", padding: 18, justifyContent: "center", alignItems: "center", gap: 10 },
  deleteText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  footer: { alignItems: "center", marginTop: 50 },
  footerText: { fontSize: 18, color: "#FFD700", fontWeight: "600" },
  footerBig: { fontSize: 28, color: "#FFD700", fontWeight: "900", marginVertical: 8, textShadowColor: "#D32F2F", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  footerYear: { fontSize: 20, color: "#fff", fontWeight: "bold" },
});