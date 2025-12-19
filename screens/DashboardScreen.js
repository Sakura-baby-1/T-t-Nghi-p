// screens/DashboardScreen.js - Dashboard Thống Kê & Báo Cáo Tết 2026
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";
import { useSettings } from "../context/SettingsContext";

const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { isDarkMode, language } = useSettings();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleCard1 = useRef(new Animated.Value(0.8)).current;
  const scaleCard2 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleCard1, {
        toValue: 1,
        delay: 200,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleCard2, {
        toValue: 1,
        delay: 400,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [language]);

  const handleCardPress = (cardAnim, destination) => {
    Animated.sequence([
      Animated.timing(cardAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate(destination);
    });
  };

  return (
    <ImageBackground
      source={isDarkMode ? null : require("../assets/bg-tet.jpg")}
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }}
      blurRadius={2}
    >
      <LinearGradient
        colors={[
          palette?.surfaceGradientStart || "rgba(211,47,47,0.9)",
          palette?.surfaceGradientMid || "rgba(255,215,0,0.15)",
          palette?.surfaceGradientEnd || "rgba(211,47,47,0.95)",
        ]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safe}>
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {/* Back button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color={palette?.onPrimary || "#fff"} />
              <Text style={[styles.backText, { color: palette?.onPrimary || "#fff" }]}>
                {t("back", { defaultValue: "Quay lại" })}
              </Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.headerContainer}>
              <MaterialCommunityIcons
                name="chart-box-multiple"
                size={48}
                color="#FFD700"
                style={{ marginBottom: 12 }}
              />
              <Text style={[styles.header, { color: palette?.accent || "#FFD700" }]}>
                📊 {t("dashboard_title", { defaultValue: "Thống Kê & Báo Cáo" })}
              </Text>
              <Text style={[styles.subtitle, { color: palette?.onPrimary || "#fff" }]}>
                {t("dashboard_subtitle", {
                  defaultValue: "Theo dõi và phân tích hoạt động của bạn",
                })}
              </Text>
            </View>

            {/* Main Cards Container */}
            <View style={styles.cardsContainer}>
              {/* Statistics Card */}
              <Animated.View style={{ transform: [{ scale: scaleCard1 }] }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleCardPress(scaleCard1, "Statistics")}
                >
                  <LinearGradient
                    colors={["#D32F2F", "#FF6B6B", "#FF8E8E"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.mainCard, styles.statisticsCard]}
                  >
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="stats-chart" size={64} color="#FFD700" />
                    </View>
                    <Text style={styles.cardTitle}>
                      {t("statistics", { defaultValue: "Thống Kê" })}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {t("statistics_desc", {
                        defaultValue: "Biểu đồ & phân tích chi tiết",
                      })}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardButtonText}>
                        {t("view_statistics", { defaultValue: "Xem thống kê" })}
                      </Text>
                      <Ionicons name="arrow-forward" size={24} color="#fff" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Report Card */}
              <Animated.View style={{ transform: [{ scale: scaleCard2 }] }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handleCardPress(scaleCard2, "Report")}
                >
                  <LinearGradient
                    colors={["#FFD700", "#FFA000", "#FF8F00"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.mainCard, styles.reportCard]}
                  >
                    <View style={styles.cardIconContainer}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={64}
                        color="#D32F2F"
                      />
                    </View>
                    <Text style={[styles.cardTitle, { color: "#D32F2F" }]}>
                      {t("report", { defaultValue: "Báo Cáo" })}
                    </Text>
                    <Text style={[styles.cardDescription, { color: "#8B0000" }]}>
                      {t("report_desc", {
                        defaultValue: "Tổng hợp & phân tích AI",
                      })}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.cardButtonText, { color: "#D32F2F" }]}>
                        {t("view_report", { defaultValue: "Xem báo cáo" })}
                      </Text>
                      <Ionicons name="arrow-forward" size={24} color="#D32F2F" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Bottom Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <MaterialCommunityIcons
                name="flower-outline"
                size={32}
                color="#FFD700"
                style={{ opacity: 0.6 }}
              />
              <Text style={styles.decorativeText}>
                {t("dashboard_motto", {
                  defaultValue: "Quản lý thời gian hiệu quả",
                })}
              </Text>
              <MaterialCommunityIcons
                name="flower-outline"
                size={32}
                color="#FFD700"
                style={{ opacity: 0.6 }}
              />
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-around",
  },

  // Header
  headerContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  header: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "#D32F2F",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    opacity: 0.95,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Cards
  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 30,
  },
  mainCard: {
    borderRadius: 24,
    padding: 30,
    marginHorizontal: 10,
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    minHeight: 220,
    justifyContent: "space-between",
  },
  statisticsCard: {
    // Red gradient already in LinearGradient
  },
  reportCard: {
    // Gold gradient already in LinearGradient
  },
  cardIconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  cardDescription: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    opacity: 0.95,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Decorative
  decorativeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  decorativeText: {
    fontSize: 14,
    color: "#FFD700",
    fontWeight: "700",
    fontStyle: "italic",
  },
  backButton: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  backText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
