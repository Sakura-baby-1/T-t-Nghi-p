// screens/ReportScreen.js - Báo Cáo Tóm Tắt & AI Gợi Ý Tết 2026
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Animated,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";
import { useSettings } from "../context/SettingsContext";
import { useEvents } from "../context/EventsContext";
import { askAI } from "../utils/ai";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ReportScreen({ navigation }) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const { isDarkMode, language } = useSettings();
  const { events, loading: eventsLoading, statistics } = useEvents();

  const [loadingAI, setLoadingAI] = useState(false);
  const [aiNarrative, setAiNarrative] = useState(""); // Narrative text from AI
  const [actionTips, setActionTips] = useState([]); // Actionable tips
  const [filterPeriod, setFilterPeriod] = useState("week"); // week, month, all
  const [reportGenerated, setReportGenerated] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation
  useEffect(() => {
    if (!eventsLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [eventsLoading]);

  // AI result animation
  useEffect(() => {
    if (aiNarrative) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [aiNarrative]);

  // Glow animation for Tết theme
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Calculate summary data based on filter period
  const summaryData = React.useMemo(() => {
    const now = new Date();
    let filtered = events;

    // Helper function to get event date
    const getEventDate = (e) => {
      // Try ngayBatDau first (Firestore timestamp)
      if (e.ngayBatDau) {
        return e.ngayBatDau?.toDate ? e.ngayBatDau.toDate() : new Date(e.ngayBatDau);
      }
      // Fallback to start
      if (e.start) {
        return e.start?.toDate ? e.start.toDate() : new Date(e.start);
      }
      // Fallback to startDate
      if (e.startDate) {
        return new Date(e.startDate);
      }
      return new Date();
    };

    if (filterPeriod === 'week') {
      // Lấy ngày đầu tuần (Thứ Hai) và cuối tuần (Chủ Nhật)
      const dayOfWeek = now.getDay(); // 0 = Chủ Nhật, 1 = Thứ Hai
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const mondayThisWeek = new Date(now);
      mondayThisWeek.setDate(now.getDate() - daysToMonday);
      mondayThisWeek.setHours(0, 0, 0, 0);
      
      const sundayThisWeek = new Date(mondayThisWeek);
      sundayThisWeek.setDate(mondayThisWeek.getDate() + 6);
      sundayThisWeek.setHours(23, 59, 59, 999);
      
      filtered = events.filter(e => {
        const eDate = getEventDate(e);
        return eDate >= mondayThisWeek && eDate <= sundayThisWeek;
      });
    } else if (filterPeriod === 'month') {
      // Lấy ngày đầu tháng đến ngày cuối tháng
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);
      
      filtered = events.filter(e => {
        const eDate = getEventDate(e);
        return eDate >= firstDay && eDate <= lastDay;
      });
    }

    // Count by type
    const typeCounts = {};
    filtered.forEach(e => {
      const type = e.type || 'Khác';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const topType = Object.keys(typeCounts).length > 0
      ? Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b)
      : 'N/A';

    const avgPerDay = filterPeriod === 'week'
      ? (filtered.length / 7).toFixed(1)
      : filterPeriod === 'month'
      ? (filtered.length / 30).toFixed(1)
      : (filtered.length / (events.length > 0 ? 365 : 1)).toFixed(1);

    return {
      totalEvents: filtered.length,
      topType,
      avgPerDay,
      typeCounts,
      periodLabel: filterPeriod === 'week' ? 'Tuần này' : filterPeriod === 'month' ? 'Tháng này' : 'Tất cả thời gian',
    };
  }, [events, filterPeriod]);

  // AI Analysis - Simple & Direct
  const runAIAnalysis = async () => {
    const { totalEvents, topType, avgPerDay, periodLabel, typeCounts } = summaryData;

    if (totalEvents === 0) {
      // Lấy thông tin chi tiết về sự kiện để debug
      const allEventDates = events.map(e => {
        const eDate = e.start?.toDate ? e.start.toDate() : new Date(e.start);
        return eDate.toLocaleDateString('vi-VN');
      }).join('\n');
      
      Alert.alert(
        "Không có dữ liệu", 
        `Không tìm thấy sự kiện nào trong ${periodLabel.toLowerCase()}.\n\nSự kiện hiện có:\n${allEventDates || 'Không có'}\n\nChọn "Tất cả" để xem tất cả sự kiện.`
      );
      return;
    }

    const prompt = `Bạn là trợ lý quản lý thời gian chuyên nghiệp. Phân tích lịch và cho 1 phản hồi ngắn gọn, dễ hiểu:

**DỮ LIỆU:**
- Khoảng: ${periodLabel}
- Tổng sự kiện: ${totalEvents}
- TB/ngày: ${avgPerDay}
- Loại chính: ${topType}

**TRẢ LỜI THEO FORMAT:**

**ĐÁNH GIÁ & CÂN BẰNG:**
[1 đoạn, 3-4 dòng: mức độ bận + cân bằng giữa công việc/sức khỏe/phát triển + gợi ý cân bằng cụ thể]

**GỢI Ý HÀNH ĐỘNG:**
💪 [Sức khỏe - 1 dòng, dễ áp dụng]
🎯 [Năng suất - 1 dòng, rõ ràng]
✨ [Phát triển - 1 dòng, động viên]

Viết tiếng Việt, ngắn gọn, thực tế.`;

    setLoadingAI(true);
    setAiNarrative("");
    setActionTips([]);
    
    try {
      const res = await askAI(prompt, "Phân tích lịch ngắn gọn, dễ hiểu, thực tế.");
      
      if (!res || typeof res !== 'string' || res.trim().length < 20) {
        throw new Error('Response không hợp lệ');
      }

      // Parse response đơn giản
      let narrative = '';
      let tips = [];

      // Tách đánh giá & cân bằng
      const evalMatch = res.match(/\*\*ĐÁNH GIÁ & CÂN BẰNG:\*\*\n?([\s\S]*?)(?=\*\*GỢI Ý HÀNH ĐỘNG:|$)/i);
      if (evalMatch) {
        narrative = evalMatch[1].trim();
      } else {
        narrative = res;
      }

      // Tách gợi ý hành động
      const tipsMatch = res.match(/\*\*GỢI Ý HÀNH ĐỘNG:\*\*\n?([\s\S]*?)$/i);
      if (tipsMatch) {
        const tipText = tipsMatch[1].trim();
        const tipLines = tipText.split('\n').filter(l => l.trim().length > 0);
        
        const icons = ['💪', '🎯', '✨'];
        const colors = ['#4CAF50', '#FF9800', '#9C27B0'];
        const labels = ['Sức Khỏe', 'Năng Suất', 'Phát Triển'];

        tips = tipLines.map((line, idx) => {
          // Xóa icon nếu có
          let text = line.replace(/^[💪🎯✨]\s*/, '').trim();
          return {
            id: idx + 1,
            text: text,
            icon: icons[idx] || '💡',
            color: colors[idx] || '#607D8B',
            label: labels[idx] || 'Gợi Ý',
          };
        }).filter(t => t.text.length > 5);
      }

      setAiNarrative(narrative || "Không thể phân tích lúc này");
      
      // Fallback tips nếu parse không được
      if (tips.length === 0) {
        tips = [
          { id: 1, text: 'Dành thời gian vận động và nghỉ ngơi mỗi ngày', icon: '💪', color: '#4CAF50', label: 'Sức Khỏe' },
          { id: 2, text: 'Ưu tiên 3 việc quan trọng, dùng Pomodoro 25p-5p', icon: '🎯', color: '#FF9800', label: 'Năng Suất' },
          { id: 3, text: 'Học điều mới 20 phút mỗi ngày', icon: '✨', color: '#9C27B0', label: 'Phát Triển' },
        ];
      }

      setActionTips(tips);
      console.log('✅ AI Report OK:', narrative.length, 'ký tự,', tips.length, 'gợi ý');
      setReportGenerated(true);
    } catch (err) {
      console.error("❌ AI error:", err.message);
      
      // Fallback narrative
      const level = avgPerDay > 3 ? '🔥 CAO' : avgPerDay > 1.5 ? '✅ VỪA' : '😌 THẤP';
      const narrative = `Bạn có ${totalEvents} sự kiện trong ${periodLabel.toLowerCase()} (${avgPerDay} sự kiện/ngày). Mức độ bận rộn: ${level}. Loại chính: ${topType}. Để cân bằng, hãy ưu tiên sức khỏe, tập trung vào 3 việc quan trọng mỗi ngày, và dành thời gian phát triển bản thân.`;
      
      setAiNarrative(narrative);
      setActionTips([
        { id: 1, text: 'Dành thời gian vận động và nghỉ ngơi mỗi ngày', icon: '💪', color: '#4CAF50', label: 'Sức Khỏe' },
        { id: 2, text: 'Ưu tiên 3 việc quan trọng, dùng Pomodoro 25p-5p', icon: '🎯', color: '#FF9800', label: 'Năng Suất' },
        { id: 3, text: 'Học điều mới 20 phút mỗi ngày', icon: '✨', color: '#9C27B0', label: 'Phát Triển' },
      ]);
      setReportGenerated(true);
      setLoadingAI(false);
    }
  };

  // Share report
  const handleShare = async () => {
    if (!aiNarrative) {
      Alert.alert("Chưa có báo cáo", "Hãy tạo báo cáo trước");
      return;
    }
    
    try {
      const shareText = `🧧 BÁO CÁO LỊCH TẾT 2026 🧧\n\n` +
        `📅 ${summaryData.periodLabel}\n` +
        `📊 ${summaryData.totalEvents} sự kiện\n` +
        `📈 TB: ${summaryData.avgPerDay} sự kiện/ngày\n\n` +
        `💡 ĐÁNH GIÁ:\n${aiNarrative}\n\n` +
        `✨ GỢI Ý HÀNH ĐỘNG:\n${actionTips.map(tip => `${tip.icon} ${tip.text}`).join('\n')}`;
      
      await Share.share({ message: shareText });
    } catch (err) {
      console.warn("Share error:", err);
    }
  };

  // Export report as text file
  const handleExport = async () => {
    if (!aiNarrative) {
      Alert.alert("Chưa có báo cáo", "Hãy tạo báo cáo trước");
      return;
    }

    try {
      if (!aiNarrative || actionTips.length === 0) {
        Alert.alert("Chưa có dữ liệu", "Vui lòng tạo báo cáo trước");
        return;
      }
      
      const { totalEvents, topType, avgPerDay, periodLabel, typeCounts } = summaryData;
      
      const reportContent = `
🧧═══════════════════════════════════🧧
   BÁO CÁO LỊCH TẾT 2026
🧧═══════════════════════════════════🧧

📅 Ngày xuất: ${new Date().toLocaleDateString('vi-VN', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

📊 TỔNG QUAN (${periodLabel}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎯 Tổng số sự kiện: ${totalEvents}
  📈 Trung bình/ngày: ${avgPerDay}
  🏆 Loại phổ biến nhất: ${topType}

📋 PHÂN BỔ THEO LOẠI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(typeCounts).map(([type, count]) => 
  `  • ${type}: ${count} sự kiện (${((count/totalEvents)*100).toFixed(1)}%)`
).join('\n')}

💡 ĐÁNH GIÁ & CÂN BẰNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${aiNarrative}

✨ GỢI Ý HÀNH ĐỘNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${actionTips.map((tip, i) => 
  `  ${i + 1}. ${tip.icon} ${tip.text}`
).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎊 Chúc mừng năm mới - Tết 2026! 🎊
📱 Xuất từ ứng dụng Lịch Tết 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      const fileName = `BaoCao_Tet2026_${new Date().toISOString().slice(0, 10)}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, reportContent, {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Xuất báo cáo Tết 2026',
        });
      } else {
        Alert.alert("Thành công", `Báo cáo đã lưu: ${fileName}`);
      }
    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Lỗi", "Không thể xuất báo cáo");
    }
  };

  if (eventsLoading) {
    return (
      <ImageBackground
        source={require("../assets/bg-tet.jpg")}
        style={{ flex: 1 }}
        blurRadius={2}
      >
        <LinearGradient
          colors={["rgba(211,47,47,0.95)", "rgba(255,215,0,0.2)", "rgba(211,47,47,0.95)"]}
          style={styles.center}
        >
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={{ marginTop: 10, color: "#FFD700", fontWeight: "700", fontSize: 16 }}>
            Đang tải dữ liệu...
          </Text>
        </LinearGradient>
      </ImageBackground>
    );
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <ImageBackground
      source={require("../assets/bg-tet.jpg")}
      style={{ flex: 1 }}
      blurRadius={2}
    >
      <LinearGradient
        colors={["rgba(211,47,47,0.95)", "rgba(255,215,0,0.2)", "rgba(211,47,47,0.95)"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safe}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack?.()}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#fff" : "#fff"} />
            <Text style={styles.backText}>{t('back', { defaultValue: 'Quay lại' })}</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            {/* 🧧 Header with Tết Theme */}
            <Animated.View
              style={[
                styles.headerContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <LinearGradient
                colors={isDarkMode 
                  ? ['#1a237e', '#283593', '#3949ab']
                  : ['#fff9c4', '#fff59d', '#fff176']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerCard}
              >
                <Animated.View style={[styles.headerGlow, { opacity: glowOpacity }]} />
                
                <View style={styles.headerIconRow}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA000']}
                    style={styles.iconGradient}
                  >
                    <MaterialCommunityIcons
                      name="chart-timeline-variant"
                      size={36}
                      color="#fff"
                    />
                  </LinearGradient>
                </View>
                
                <Text style={[styles.header, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                  Báo Cáo Thông Minh
                </Text>
                <Text style={[styles.subtitle, { color: isDarkMode ? "#e3f2fd" : "#5d4037" }]}>
                  Phân Tích Chuyên Sâu & Gợi Ý Cá Nhân Hóa
                </Text>
                
                {/* Filter Period */}
                <View style={styles.filterContainer}>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterPeriod === 'week' && styles.filterTabActive,
                    ]}
                    onPress={() => setFilterPeriod('week')}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={16} 
                      color={filterPeriod === 'week' ? '#fff' : '#FFD700'}
                    />
                    <Text style={[
                      styles.filterTabText,
                      { color: filterPeriod === 'week' ? '#fff' : '#FFD700' }
                    ]}>
                      Tuần
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterPeriod === 'month' && styles.filterTabActive,
                    ]}
                    onPress={() => setFilterPeriod('month')}
                  >
                    <Ionicons 
                      name="calendar" 
                      size={16} 
                      color={filterPeriod === 'month' ? '#fff' : '#FFD700'}
                    />
                    <Text style={[
                      styles.filterTabText,
                      { color: filterPeriod === 'month' ? '#fff' : '#FFD700' }
                    ]}>
                      Tháng
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterPeriod === 'all' && styles.filterTabActive,
                    ]}
                    onPress={() => setFilterPeriod('all')}
                  >
                    <Ionicons 
                      name="apps" 
                      size={16} 
                      color={filterPeriod === 'all' ? '#fff' : '#FFD700'}
                    />
                    <Text style={[
                      styles.filterTabText,
                      { color: filterPeriod === 'all' ? '#fff' : '#FFD700' }
                    ]}>
                      Tất cả
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* 📊 Summary Overview Card */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <LinearGradient
                colors={isDarkMode 
                  ? ['rgba(30,41,59,0.98)', 'rgba(51,65,85,0.98)']
                  : ['rgba(255,255,255,0.98)', 'rgba(255,250,240,0.98)']
                }
                style={styles.summaryCard}
              >
                <View style={styles.summaryHeader}>
                  <Ionicons name="bar-chart" size={28} color="#FFD700" />
                  <Text style={[styles.summaryTitle, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                    Tổng Quan ({summaryData.periodLabel})
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryEmoji}>🎯</Text>
                    <Text style={[styles.summaryValue, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                      {summaryData.totalEvents}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDarkMode ? "#94a3b8" : "#666" }]}>
                      Sự kiện
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryEmoji}>📈</Text>
                    <Text style={[styles.summaryValue, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                      {summaryData.avgPerDay}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDarkMode ? "#94a3b8" : "#666" }]}>
                      TB/Ngày
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryEmoji}>🏆</Text>
                    <Text style={[styles.summaryType, { color: isDarkMode ? "#e2e8f0" : "#333" }]}>
                      {summaryData.topType}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: isDarkMode ? "#94a3b8" : "#666" }]}>
                      Phổ biến
                    </Text>
                  </View>
                </View>

                {/* Type distribution */}
                {Object.keys(summaryData.typeCounts).length > 0 && (
                  <View style={styles.typeDistribution}>
                    {Object.entries(summaryData.typeCounts).slice(0, 4).map(([type, count]) => (
                      <View key={type} style={styles.typeBar}>
                        <Text style={[styles.typeLabel, { color: isDarkMode ? "#cbd5e1" : "#64748b" }]}>
                          {type}
                        </Text>
                        <View style={styles.barContainer}>
                          <View 
                            style={[
                              styles.barFill,
                              { width: `${(count / summaryData.totalEvents) * 100}%` }
                            ]} 
                          />
                          <Text style={[styles.typeCount, { color: isDarkMode ? "#e2e8f0" : "#333" }]}>
                            {count}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </Animated.View>

            {/* 💡 AI Narrative Report - Professional Layout */}
            {reportGenerated && aiNarrative && (
              <Animated.View
                style={[
                  styles.reportContainer,
                  {
                    opacity: scaleAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {/* Report Header */}
                <LinearGradient
                  colors={isDarkMode 
                    ? ['#0f172a', '#1e293b']
                    : ['#D32F2F', '#B71C1C']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.reportHeader}
                >
                  <View style={styles.reportHeaderTop}>
                    <View style={styles.reportBadge}>
                      <MaterialCommunityIcons name="robot-happy" size={24} color="#FFD700" />
                    </View>
                    <View style={styles.reportTitleContainer}>
                      <Text style={styles.reportMainTitle}>AI Analysis Report</Text>
                      <Text style={styles.reportSubtitle}>
                        {new Date().toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  {/* Key Metrics Bar */}
                  <View style={styles.metricsBar}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Dữ Liệu</Text>
                      <Text style={styles.metricValue}>{summaryData.periodLabel}</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Sự Kiện</Text>
                      <Text style={styles.metricValue}>{summaryData.totalEvents}</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>TB/Ngày</Text>
                      <Text style={styles.metricValue}>{summaryData.avgPerDay}</Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* AI Insights Section */}
                <LinearGradient
                  colors={isDarkMode 
                    ? ['rgba(30,41,59,0.98)', 'rgba(51,65,85,0.98)']
                    : ['rgba(255,255,255,0.98)', 'rgba(255,250,240,0.98)']
                  }
                  style={styles.insightCard}
                >
                  <View style={styles.insightHeader}>
                    <View style={styles.insightIcon}>
                      <Ionicons name="bulb-outline" size={20} color="#FFD700" />
                    </View>
                    <Text style={[styles.insightTitle, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                      Đánh Giá & Cân Bằng
                    </Text>
                  </View>
                  
                  <View style={styles.insightContent}>
                    <Text style={[styles.insightText, { color: isDarkMode ? "#e2e8f0" : "#333" }]}>
                      {aiNarrative}
                    </Text>
                  </View>

                  {/* Timestamp */}
                  <View style={styles.insightFooter}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={[styles.insightTime, { color: isDarkMode ? "#94a3b8" : "#999" }]}>
                      Generated by AI at {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Export & Share Actions */}
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-social" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Chia sẻ</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                    onPress={handleExport}
                  >
                    <Ionicons name="download" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Xuất PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FF9800' }]}
                    onPress={() => {
                      setAiNarrative("");
                      setActionTips([]);
                      setReportGenerated(false);
                    }}
                  >
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Tạo Mới</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Original AI Analysis Button */}
            {!reportGenerated && (
              <TouchableOpacity
                style={[styles.aiBtn, { backgroundColor: isDarkMode ? "#1e293b" : "#D32F2F" }]}
                onPress={runAIAnalysis}
                disabled={loadingAI}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loadingAI ? ["#8B0000", "#D32F2F"] : ["#D32F2F", "#FF6B6B", "#FFA000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aiGradient}
                >
                  <Animated.View style={{ opacity: glowOpacity }}>
                    <Text style={styles.aiSparkle}>✨</Text>
                  </Animated.View>
                  
                  {loadingAI ? (
                    <View style={styles.aiContent}>
                      <ActivityIndicator size="small" color="#FFD700" />
                      <Text style={styles.aiBtnText}>Đang phân tích bằng AI...</Text>
                    </View>
                  ) : (
                    <View style={styles.aiContent}>
                      <MaterialCommunityIcons name="robot-excited" size={32} color="#FFD700" />
                      <Text style={styles.aiBtnText}>
                        Tạo Báo Cáo AI
                      </Text>
                    </View>
                  )}
                  
                  <Animated.View style={{ opacity: glowOpacity }}>
                    <Text style={styles.aiSparkle}>✨</Text>
                  </Animated.View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* ✨ Action Tips */}
            {reportGenerated && actionTips.length > 0 && (
              <Animated.View
                style={[
                  styles.tipsSection,
                  {
                    opacity: scaleAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <View style={styles.tipsHeader}>
                  <View style={styles.tipsIconBg}>
                    <Ionicons name="bulb" size={22} color="#FFD700" />
                  </View>
                  <Text style={[styles.tipsTitle, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                    Gợi Ý Hành Động Cụ Thể
                  </Text>
                </View>

                {actionTips.map((tip, index) => (
                  <Animated.View
                    key={tip.id}
                    style={{
                      opacity: scaleAnim,
                      transform: [{
                        translateX: scaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [index % 2 === 0 ? -50 : 50, 0],
                        }),
                      }],
                    }}
                  >
                    <LinearGradient
                      colors={isDarkMode 
                        ? ['rgba(30,41,59,0.95)', 'rgba(51,65,85,0.95)']
                        : ['rgba(255,255,255,0.95)', 'rgba(255,250,240,0.95)']
                      }
                      style={[styles.tipCard, { borderLeftColor: tip.color, borderLeftWidth: 5 }]}
                    >
                      <View style={[styles.tipIconContainer, { backgroundColor: tip.color + '15' }]}>
                        <Text style={styles.tipIcon}>{tip.icon}</Text>
                      </View>
                      <View style={styles.tipContent}>
                        <Text style={[styles.tipLabel, { color: tip.color }]}>
                          {tip.label}
                        </Text>
                        <Text style={[styles.tipText, { color: isDarkMode ? "#cbd5e1" : "#555" }]}>
                          {tip.text}
                        </Text>
                      </View>
                      <View style={[styles.tipCheckmark, { backgroundColor: tip.color }]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    </LinearGradient>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
  },
  container: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  headerContainer: {
    width: "100%",
    marginBottom: 24,
    marginTop: 10,
  },
  headerCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  headerIconRow: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  tetIcon: {
    fontSize: 32,
  },
  header: {
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1.2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
    width: '100%',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Summary Card
  summaryCard: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  summaryType: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 2,
    height: 60,
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  typeDistribution: {
    gap: 10,
  },
  typeBar: {
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 8,
    minWidth: 30,
  },
  typeCount: {
    position: 'absolute',
    right: 10,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // AI Button
  aiBtn: {
    borderRadius: 18,
    marginTop: 10,
    marginBottom: 20,
    width: "100%",
    elevation: 12,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    overflow: "hidden",
  },
  aiGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiSparkle: {
    fontSize: 28,
  },
  aiBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.8,
  },

  // Narrative Card
  narrativeCard: {
    width: '100%',
    marginBottom: 20,
  },
  narrativeInner: {
    borderRadius: 18,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  narrativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  narrativeTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  narrativeText: {
    fontSize: 15,
    lineHeight: 26,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 20,
  },
  narrativeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  narrativeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
  },
  narrativeBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // Tips Section
  tipsSection: {
    width: '100%',
    gap: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tipCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    gap: 14,
  },
  tipIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  tipIcon: {
    fontSize: 28,
  },
  tipContent: {
    flex: 1,
    gap: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tipBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Professional Report Styles
  reportContainer: {
    width: '100%',
    marginBottom: 20,
    gap: 16,
  },
  reportHeader: {
    borderRadius: 18,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  reportHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  reportBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD700',
    marginBottom: 4,
    letterSpacing: 1,
  },
  reportSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  insightCard: {
    borderRadius: 18,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FFD700',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  insightContent: {
    marginBottom: 16,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 26,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  insightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,215,0,0.2)',
  },
  insightTime: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  tipsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
