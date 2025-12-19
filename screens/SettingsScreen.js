// screens/SettingsScreen.js – CÀI ĐẶT TẾT 2026 SIÊU SANG TRỌNG
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  StatusBar,
  Alert,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { useSettings } from "../context/SettingsContext";
import useTheme from "../hooks/useTheme";

export default function SettingsScreen({ setUser }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isDarkMode, setIsDarkMode, isNotify, setIsNotify, language, setLanguage } = useSettings();
  const { palette } = useTheme();
  
  const defaultAvatar = "https://i.ibb.co/9ZKwf4L/default-avatar-tet.png";
  const [userAvatar, setUserAvatar] = useState(defaultAvatar);
  const [userName, setUserName] = useState("Người dùng");

  // Animations Tết 2026
  const logoScale = useRef(new Animated.Value(1)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Header pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerScale, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(headerScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Icon rotation
    Animated.loop(
      Animated.timing(iconRotate, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Card floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Load avatar từ Firestore
  useFocusEffect(
    React.useCallback(() => {
      const loadUserAvatar = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const photoURL = data.photoURL || user.photoURL || defaultAvatar;
          const userName = data.ten || user.displayName || "Người dùng";
          setUserAvatar(`${photoURL}?v=${Date.now()}`);
          setUserName(userName);
        } else {
          const photoURL = user.photoURL || defaultAvatar;
          setUserAvatar(`${photoURL}?v=${Date.now()}`);
          setUserName(user.displayName || "Người dùng");
        }
      };
      loadUserAvatar();
    }, [])
  );

  const iconRotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const toggleLanguage = () => {
    Haptics.selectionAsync();
    setLanguage(language === "vi" ? "en" : "vi");
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout_title'),
      t('logout_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await signOut(auth);
              setUser(null);
            } catch (error) {
              Alert.alert(t('error'), error.message);
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      icon: 'account',
      label: t('profile', { defaultValue: 'Tài khoản' }),
      color: palette?.accent || '#FFD700',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      icon: 'bell-ring',
      label: t('notify', { defaultValue: 'Thông báo' }),
      color: palette?.danger || '#FF6B6B',
      right: <Switch value={isNotify} onValueChange={setIsNotify} thumbColor={isNotify ? (isDarkMode ? palette?.accent : '#FFD700') : (isDarkMode ? '#444' : '#666')} trackColor={{ true: (isDarkMode ? palette?.accent : '#FFA000'), false: (isDarkMode ? '#222' : '#444') }} />,
    },
    {
      icon: 'weather-night',
      label: t('darkMode', { defaultValue: 'Chế độ tối' }),
      color: palette?.primary || '#9B59B6',
      right: <Switch value={isDarkMode} onValueChange={setIsDarkMode} thumbColor={isDarkMode ? (palette?.accent || '#FFD700') : (isDarkMode ? '#444' : '#666')} trackColor={{ true: (palette?.accent || '#FFA000'), false: (isDarkMode ? '#222' : '#444') }} />,
    },
    {
      icon: 'earth',
      label: t('language', { defaultValue: 'Ngôn ngữ' }),
      color: palette?.success || '#27AE60',
      isLanguage: true,
    },
    {
      icon: 'robot-happy',
      label: t('ai_always_on', { defaultValue: 'AI luôn bật' }),
      color: palette?.primary || '#3498DB',
      right: <MaterialCommunityIcons name='check-circle' size={28} color={palette?.accent || '#FFD700'} />,
    },
    {
      icon: 'calendar-heart',
      label: t('app_version_name', { defaultValue: 'Phiên bản' }),
      color: palette?.danger || '#E91E63',
      right: <Text style={{ color: palette?.accent || '#FFD700', fontWeight: '900', fontSize: 16 }}>{t('year_name', { defaultValue: 'ẤT TỴ' })}</Text>,
    },
  ];

  return (
    <ImageBackground 
      source={isDarkMode ? null : require("../assets/bg-tet.jpg")} 
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
      blurRadius={3}
    >
      <LinearGradient 
        colors={[
          palette?.surfaceGradientStart || "rgba(211,47,47,0.98)", 
          palette?.surfaceGradientMid || "rgba(255,215,0,0.15)", 
          palette?.surfaceGradientEnd || "rgba(211,47,47,0.98)"
        ]} 
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />

          {/* Header Hoàng Gia */}
          <Animated.View style={{ transform: [{ scale: headerScale }] }}>
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
              <Text style={[styles.headerTitle, { color: isDarkMode ? palette?.accent : "#000" }]}>{t('settings', { defaultValue: 'CÀI ĐẶT' })}</Text>
              <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
                <MaterialCommunityIcons name="crown" size={36} color={isDarkMode ? palette?.accent : "#000"} />
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>

            {/* Avatar người dùng */}
            <Animated.View 
              style={[
                styles.logoContainer,
                { transform: [{ translateY: cardFloat }] }
              ]}
            >
              <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                <Image 
                  source={{ uri: userAvatar || defaultAvatar }}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </Animated.View>
              <Animated.View style={{ opacity: glowPulse }}>
                <Text style={[styles.schoolName, { color: palette?.accent || '#FFD700' }]}>{userName}</Text>
              </Animated.View>
            </Animated.View>

            {/* Danh sách cài đặt */}
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingItem}
                onPress={item.onPress}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isDarkMode ? [palette?.card || "#1E1E1E", palette?.card || "#1E1E1E"] : ["#fff", "#fff"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.itemContent}>
                    <Animated.View style={{ transform: [{ scale: glowPulse }] }}>
                      <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
                    </Animated.View>
                    <Text style={[styles.itemLabel, { color: isDarkMode ? palette?.text : (palette?.primary || styles.itemLabel.color) }]}>{item.label}</Text>
                  {item.right && <View style={{ marginLeft: "auto" }}>{item.right}</View>}
                  {item.isLanguage && (
                    <View style={styles.languageSelector}>
                      <TouchableOpacity
                        style={[styles.langOption, language === 'vi' && styles.langActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setLanguage('vi');
                        }}
                      >
                        <Text style={styles.flag}>🇻🇳</Text>
                        <Text style={[styles.langText, language === 'vi' && styles.langTextActive, { color: isDarkMode ? (language === 'vi' ? '#000' : palette?.text) : (language === 'vi' ? '#000' : '#666') }]}>{t('vietnamese', { defaultValue: 'Tiếng Việt' })}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.langOption, language === 'en' && styles.langActive]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setLanguage('en');
                        }}
                      >
                        <Text style={styles.flag}>🇬🇧</Text>
                        <Text style={[styles.langText, language === 'en' && styles.langTextActive, { color: isDarkMode ? (language === 'en' ? '#000' : palette?.text) : (language === 'en' ? '#000' : '#666') }]}>{t('english', { defaultValue: 'English' })}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {item.onPress && !item.isLanguage && <MaterialCommunityIcons name="chevron-right" size={28} color={palette?.accent || "#FFD700"} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Nút Đăng xuất Hoàng Gia */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <LinearGradient 
                colors={isDarkMode 
                  ? [palette?.danger || "#EF5350", "#D32F2F"] 
                  : [palette?.primary || "#D32F2F", palette?.danger || "#B71C1C"]
                } 
                style={styles.logoutGradient}
              >
                <MaterialCommunityIcons name="logout" size={30} color="#fff" />
                <Text style={styles.logoutText}>{t('logout_royal', { defaultValue: 'Đăng xuất Hoàng Gia' })}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Trang trí cuối trang */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: palette?.accent || styles.footerText.color }]}>{t('made_for', { defaultValue: 'Dành riêng cho' })}</Text>
              <Text style={[styles.footerBig, { color: palette?.accent || styles.footerBig.color }]}>{t('tet_vietnam', { defaultValue: 'Tết Việt Nam' })}</Text>
              <Text style={[styles.version, { color: palette?.text || styles.version.color }]}>{t('version_label', { defaultValue: 'Phiên bản' })}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

/* STYLE TẾT 2026 – HOÀNG KIM SANG TRỌNG NHẤT VIỆT NAM */
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

  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: "#FFD700",
    backgroundColor: "#f0f0f0",
    marginBottom: 12,
  },
  schoolName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFD700",
    textAlign: "center",
    textShadowColor: "rgba(211,47,47,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },

  settingItem: {
    marginBottom: 14,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 16,
    borderWidth: 2.5,
    borderColor: "#FFD700",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  itemLabel: {
    flex: 1,
    marginLeft: 16,
    fontSize: 17,
    fontWeight: "bold",
    color: "#D32F2F",
  },

  logoutButton: {
    marginTop: 30,
    borderRadius: 26,
    overflow: "hidden",
    elevation: 25,
  },
  logoutGradient: {
    flexDirection: "row",
    padding: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 14,
  },

  footer: {
    alignItems: "center",
    marginTop: 36,
  },
  footerText: { fontSize: 16, color: "#FFD700", fontWeight: "600" },
  footerBig: { fontSize: 26, color: "#FFD700", fontWeight: "900", marginVertical: 8, textShadowColor: "#D32F2F", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6 },
  version: { fontSize: 15, color: "#fff", fontWeight: "bold" },

  languageSelector: {
    flexDirection: "column",
    marginLeft: "auto",
    gap: 8,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: "rgba(100,100,100,0.15)",
    gap: 7,
  },
  langActive: {
    backgroundColor: "#FFD700",
    elevation: 5,
  },
  flag: {
    fontSize: 22,
  },
  langText: {
    fontSize: 14,
    fontWeight: "600",
  },
  langTextActive: {
    fontWeight: "900",
  },
});