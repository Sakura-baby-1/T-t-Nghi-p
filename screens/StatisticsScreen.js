// screens/StatisticsScreen.js - Thống Kê & Phân Tích Chi Tiết Tết 2026
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Animated,
  Modal,
  FlatList,
} from "react-native";
import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useEvents } from "../context/EventsContext";
import useTheme from "../hooks/useTheme";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const screenWidth = Dimensions.get("window").width;

export default function StatisticsScreen({ navigation }) {
  const { events, loading: loadingData } = useEvents();
  const [filterPeriod, setFilterPeriod] = useState("week"); // week, month, year
  const [selectedEventType, setSelectedEventType] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  
  const { isDarkMode, language } = useSettings();
  const { palette } = useTheme();
  const { t } = useTranslation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconGlow = useRef(new Animated.Value(1)).current;
  const chartPulse = useRef(new Animated.Value(1)).current;

  // Fade in animation
  useEffect(() => {
    if (!loadingData) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loadingData]);

  // Icon animations
  useEffect(() => {
    // Icon bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Icon glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconGlow, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(iconGlow, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Chart pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(chartPulse, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(chartPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Filter events by period and type
  const filteredEvents = useMemo(() => {
    const now = new Date();
    let filtered = events.map(e => ({
      ...e,
      start: e.startDate || (e.start?.toDate ? e.start.toDate() : new Date(e.start)),
      type: e.type || 'Khác',
    }));

    // Period filter
    if (filterPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => e.start >= weekAgo);
    } else if (filterPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => e.start >= monthAgo);
    } else if (filterPeriod === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => e.start >= yearAgo);
    }

    // Type filter
    if (selectedEventType !== 'all') {
      filtered = filtered.filter(e => e.type === selectedEventType);
    }

    return filtered;
  }, [events, filterPeriod, selectedEventType]);

  // Extract unique event types
  const eventTypes = useMemo(() => {
    const types = new Set(events.map(e => e.type || 'Khác'));
    return ['all', ...Array.from(types)];
  }, [events]);

  // Calculate statistics
  const statsData = useMemo(() => {
    if (filteredEvents.length === 0) {
      return {
        dayLabels: [],
        dayCounts: [],
        typeData: [],
        trendLabels: [],
        trendData: [],
        tableData: [],
        totalEvents: 0,
        avgPerDay: 0,
      };
    }

    // 1. Events by day of week
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    filteredEvents.forEach(e => {
      const day = e.start.getDay();
      dayCounts[day]++;
    });

    // 2. Type distribution (for pie chart)
    const typeCounts = {};
    filteredEvents.forEach(e => {
      const type = e.type || 'Khác';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const typeColors = {
      'Học tập': '#4CAF50',
      'Giải trí': '#FF9800',
      'Thể thao': '#2196F3',
      'Công việc': '#9C27B0',
      'Khác': '#607D8B',
    };

    const typeData = Object.entries(typeCounts).map(([name, count]) => ({
      name,
      population: count,
      color: typeColors[name] || '#999',
      legendFontColor: isDarkMode ? '#cbd5e1' : '#333',
      legendFontSize: 12,
    }));

    // 3. Trend over time (last 7 or 30 days)
    const daysCount = filterPeriod === 'week' ? 7 : filterPeriod === 'month' ? 30 : 90;
    const trendData = new Array(daysCount).fill(0);
    const trendLabels = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayLabel = `${date.getDate()}/${date.getMonth() + 1}`;
      trendLabels.push(dayLabel);
      
      const count = filteredEvents.filter(e => {
        const eDate = new Date(e.start);
        return eDate.getDate() === date.getDate() && 
               eDate.getMonth() === date.getMonth() &&
               eDate.getFullYear() === date.getFullYear();
      }).length;
      
      trendData[daysCount - 1 - i] = count;
    }

    // 4. Detailed table data (50 most recent events)
    const tableData = filteredEvents
      .sort((a, b) => b.start - a.start)
      .slice(0, 50)
      .map(e => {
        // Lấy tên từ tieuDe hoặc ghiChu (trường dùng trong app)
        const eventTitle = e.tieuDe || e.title || e.ghiChu || 'Không có tiêu đề';
        // Nếu sự kiện đã qua thì tự động coi là hoàn thành
        const isCompleted = e.completed || e.start < now;
        
        return {
          id: e.id,
          title: eventTitle,
          type: e.type || 'Khác',
          color: typeColors[e.type] || '#999',
          date: e.start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: e.start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          location: e.location || e.diaDiem || '-',
          status: isCompleted ? '✅ Hoàn thành' : '⏱️ Chưa xong',
        };
      });

    const avgPerDay = (filteredEvents.length / daysCount).toFixed(1);

    return {
      dayLabels: dayNames,
      dayCounts,
      typeData,
      trendLabels: trendLabels.filter((_, i) => i % Math.ceil(daysCount / 7) === 0), // Show ~7 labels
      trendData,
      tableData,
      totalEvents: filteredEvents.length,
      avgPerDay,
    };
  }, [filteredEvents, filterPeriod, isDarkMode]);

  // Export function
  const handleExport = async () => {
    try {
      const content = `
🎊═══════════════════════════════════🎊
   THỐNG KÊ CHI TIẾT - TẾT 2026
🎊═══════════════════════════════════🎊

📅 Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}
📊 Khoảng thời gian: ${filterPeriod === 'week' ? '7 ngày' : filterPeriod === 'month' ? '30 ngày' : '1 năm'}
🎯 Lọc theo loại: ${selectedEventType === 'all' ? 'Tất cả' : selectedEventType}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TỔNG QUAN SỐ LIỆU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📈 Tổng số sự kiện: ${statsData.totalEvents}
  📊 Trung bình/ngày: ${statsData.avgPerDay}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHÂN BỐ THEO LOẠI SỰ KIỆN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${statsData.typeData.map(t => `  ${t.name}: ${t.population} (${((t.population/statsData.totalEvents)*100).toFixed(1)}%)`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHI TIẾT SỰ KIỆN (${statsData.tableData.length} gần nhất)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${statsData.tableData.map((row, i) => `
${i + 1}. ${row.title}
   📅 Ngày: ${row.date} ${row.time}
   🏷️ Loại: ${row.type}
   📍 Địa điểm: ${row.location}
   ✅ Trạng thái: ${row.status}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎊 Xuất từ Lịch Tết 2026 🎊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      const fileName = `ThongKe_${new Date().toISOString().slice(0, 10)}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Xuất thống kê',
        });
      } else {
        Alert.alert("Thành công", `Đã lưu: ${fileName}`);
      }
    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Lỗi", "Không thể xuất file");
    }
  };

  // Chart config
  const chartConfig = {
    backgroundGradientFrom: isDarkMode ? "#1e293b" : "#fff",
    backgroundGradientTo: isDarkMode ? "#334155" : "#f8fafc",
    color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    labelColor: () => (isDarkMode ? "#cbd5e1" : "#64748b"),
    propsForLabels: {
      fontSize: 11,
      fontWeight: "600",
    },
  };

  if (loadingData) {
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
            {/* Header */}
            <Animated.View
              style={[
                styles.headerCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <LinearGradient
                colors={isDarkMode 
                  ? ['#1e3a8a', '#2563eb', '#3b82f6']
                  : ['#60a5fa', '#3b82f6', '#2563eb']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerInner}
              >
                <View style={styles.headerIconRow}>
                  <Animated.View style={{ transform: [{ scale: iconScale }], opacity: iconGlow }}>
                    <MaterialCommunityIcons name="chart-box-outline" size={42} color="#FFD700" />
                  </Animated.View>
                  <Text style={styles.headerTitle}>Thống Kê</Text>
                  <TouchableOpacity
                    style={styles.exportBtnHeader}
                    onPress={handleExport}
                  >
                    <MaterialCommunityIcons name="download-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>

                {/* Filters in one row */}
                <View style={styles.filtersContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                    {['week', 'month', 'year'].map(period => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.filterChip,
                          filterPeriod === period && styles.filterChipActive,
                        ]}
                        onPress={() => setFilterPeriod(period)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: filterPeriod === period ? '#000' : '#fff' }
                        ]}>
                          {period === 'week' ? '7 ngày' : period === 'month' ? '30 ngày' : '1 năm'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    
                    {eventTypes.length > 2 && (
                      <View style={styles.divider} />
                    )}
                    
                    {eventTypes.length > 2 && eventTypes.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.filterChip,
                          selectedEventType === type && styles.filterChipActive,
                        ]}
                        onPress={() => setSelectedEventType(type)}
                      >
                        <Text style={[
                          styles.filterChipText,
                          { color: selectedEventType === type ? '#000' : '#fff' }
                        ]}>
                          {type === 'all' ? 'Tất cả' : type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* KPI Cards with Animated Numbers */}
            <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
              <View style={styles.kpiGrid}>
                <KPICard
                  icon="calendar"
                  label="Tổng sự kiện"
                  value={statsData.totalEvents}
                  color="#FFD700"
                  gradient={['#FFD700', '#FFA000']}
                  isDarkMode={isDarkMode}
                  delay={0}
                  onPress={() => setModalVisible(true)}
                />
                <KPICard
                  icon="time-outline"
                  label="Tuần này"
                  value={statsData.totalEvents}
                  color="#4CAF50"
                  gradient={['#4CAF50', '#2E7D32']}
                  isDarkMode={isDarkMode}
                  delay={100}
                />
                <KPICard
                  icon="trending-up"
                  label="TB/Ngày"
                  value={statsData.avgPerDay}
                  color="#2196F3"
                  gradient={['#2196F3', '#1565C0']}
                  isDarkMode={isDarkMode}
                  isDecimal
                  delay={200}
                />
                <KPICard
                  icon="trophy"
                  label="Loại phổ biến"
                  value={statsData.typeData.length > 0 ? statsData.typeData[0].name : 'N/A'}
                  color="#FF9800"
                  gradient={['#FF9800', '#F57C00']}
                  isDarkMode={isDarkMode}
                  isText
                  delay={300}
                />
              </View>
            </Animated.View>

            {statsData.totalEvents > 0 ? (
              <>
                {/* Bar Chart - Events by Day of Week */}
                <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                  <LinearGradient
                    colors={isDarkMode ? ['rgba(30,41,59,0.95)', 'rgba(51,65,85,0.95)'] : ['rgba(255,255,255,0.95)', 'rgba(255,250,240,0.95)']}
                    style={styles.chartCard}
                  >
                    <View style={styles.chartHeader}>
                      <Animated.View style={{ transform: [{ scale: chartPulse }] }}>
                        <MaterialCommunityIcons name="chart-bar" size={28} color="#FFD700" />
                      </Animated.View>
                      <Text style={[styles.chartTitle, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                        Sự kiện theo ngày trong tuần
                      </Text>
                    </View>
                    <BarChart
                      data={{
                        labels: statsData.dayLabels,
                        datasets: [{ data: statsData.dayCounts }],
                      }}
                      width={screenWidth - 60}
                      height={180}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      showValuesOnTopOfBars
                      fromZero
                    />
                  </LinearGradient>
                </Animated.View>

                {/* Pie Chart - Type Distribution */}
                {statsData.typeData.length > 0 && (
                  <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
                    <LinearGradient
                      colors={isDarkMode ? ['rgba(30,41,59,0.95)', 'rgba(51,65,85,0.95)'] : ['rgba(255,255,255,0.95)', 'rgba(255,250,240,0.95)']}
                      style={styles.chartCard}
                    >
                      <View style={styles.chartHeader}>
                        <Animated.View style={{ transform: [{ scale: chartPulse }] }}>
                          <MaterialCommunityIcons name="chart-donut" size={28} color="#FFD700" />
                        </Animated.View>
                        <Text style={[styles.chartTitle, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                          Phân bổ theo loại sự kiện
                        </Text>
                      </View>
                      <PieChart
                        data={statsData.typeData}
                        width={screenWidth - 60}
                        height={180}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                      />
                    </LinearGradient>
                  </Animated.View>
                )}


              </>
            ) : (
              <LinearGradient
                colors={isDarkMode ? ['rgba(30,41,59,0.95)', 'rgba(51,65,85,0.95)'] : ['rgba(255,255,255,0.95)', 'rgba(255,250,240,0.95)']}
                style={styles.emptyCard}
              >
                <Animated.View style={{ transform: [{ scale: iconScale }], opacity: iconGlow }}>
                  <MaterialCommunityIcons name="chart-box-outline" size={72} color={isDarkMode ? "#64748b" : "#94a3b8"} />
                </Animated.View>
                <Text style={[styles.emptyText, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                  Chưa có dữ liệu trong khoảng thời gian này
                </Text>
              </LinearGradient>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>

        {/* Modal Chi Tiết Sự Kiện */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={isDarkMode 
                  ? ['rgba(30,41,59,0.98)', 'rgba(51,65,85,0.98)']
                  : ['rgba(255,255,255,0.98)', 'rgba(255,250,240,0.98)']
                }
                style={styles.modalInner}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="list-circle" size={28} color="#FFD700" />
                    <Text style={[styles.modalTitle, { color: isDarkMode ? "#FFD700" : "#D32F2F" }]}>
                      Chi Tiết Sự Kiện
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close-circle" size={32} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalSubtitle, { color: isDarkMode ? "#cbd5e1" : "#64748b" }]}>
                  {statsData.tableData.length} sự kiện được tìm thấy
                </Text>

                <FlatList
                  data={statsData.tableData}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalList}
                  renderItem={({ item, index }) => (
                    <View style={[
                      styles.modalEventCard,
                      { borderLeftColor: item.color }
                    ]}>
                      <View style={styles.modalEventHeader}>
                        <View style={[styles.modalEventIcon, { backgroundColor: item.color + '20' }]}>
                          <Ionicons name="calendar" size={20} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalEventTitle, { color: isDarkMode ? "#e2e8f0" : "#1e293b" }]}>
                            {item.title}
                          </Text>
                          <View style={styles.modalEventMeta}>
                            <Ionicons name="time-outline" size={14} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                            <Text style={[styles.modalEventDate, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                              {item.date} · {item.time}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.modalTypeBadge, { backgroundColor: item.color + '30' }]}>
                          <Text style={[styles.modalTypeBadgeText, { color: item.color }]}>
                            {item.type}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalEventDetails}>
                        <View style={styles.modalDetailRow}>
                          <Ionicons name="location" size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                          <Text style={[styles.modalDetailText, { color: isDarkMode ? "#cbd5e1" : "#64748b" }]}>
                            {item.location}
                          </Text>
                        </View>
                        <View style={styles.modalDetailRow}>
                          <Ionicons 
                            name={item.status === 'Hoàn thành' ? "checkmark-circle" : "time"} 
                            size={16} 
                            color={item.status === 'Hoàn thành' ? "#4CAF50" : "#FF9800"} 
                          />
                          <Text style={[styles.modalDetailText, { color: isDarkMode ? "#cbd5e1" : "#64748b" }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                />
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>
      </LinearGradient>
    </ImageBackground>
  );
}

// ============ COMPONENT: Animated Number Counter ============
function AnimatedNumber({ value, isDecimal = false, style, duration = 1000 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const numValue = parseFloat(value) || 0;
    animatedValue.setValue(0);
    
    Animated.timing(animatedValue, {
      toValue: numValue,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: v }) => {
      if (isDecimal) {
        setDisplayValue(v.toFixed(1));
      } else {
        setDisplayValue(Math.floor(v).toString());
      }
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, isDecimal]);

  return <Text style={style}>{displayValue}</Text>;
}

// ============ COMPONENT: KPI Card with Animation ============
function KPICard({ icon, label, value, color, gradient, isDarkMode, delay = 0, isDecimal = false, isText = false, onPress }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale up animation
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse animation
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

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <Animated.View style={[styles.kpiCard, { transform: [{ scale: scaleAnim }] }]}>
      <CardWrapper onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
        <LinearGradient
          colors={isDarkMode 
            ? ['rgba(30,41,59,0.95)', 'rgba(51,65,85,0.95)']
            : ['rgba(255,255,255,0.98)', 'rgba(255,250,240,0.98)']
          }
          style={styles.kpiCardInner}
        >
        <Animated.View 
          style={[
            styles.kpiGlow,
            { 
              backgroundColor: color,
              opacity: glowOpacity,
            }
          ]}
        />
        
        <View style={[styles.kpiIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        
        {isText ? (
          <Text style={[styles.kpiValue, { color: isDarkMode ? color : color }]} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <AnimatedNumber
            value={value}
            isDecimal={isDecimal}
            style={[styles.kpiValue, { color: isDarkMode ? color : color }]}
            duration={1500}
          />
        )}
        
        <Text style={[styles.kpiLabel, { color: isDarkMode ? '#94a3b8' : '#666' }]}>
          {label}
        </Text>
      </LinearGradient>
      </CardWrapper>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  headerCard: {
    width: '100%',
    marginBottom: 20,
  },
  headerInner: {
    borderRadius: 16,
    padding: 16,
    elevation: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#fff',
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  exportBtnHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filters - All in one row
  filtersContainer: {
    marginTop: 4,
  },
  filtersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterChipActive: {
    backgroundColor: '#FFD700',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // KPI Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48.5%',
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  kpiCardInner: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Charts
  chartCard: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  chart: {
    borderRadius: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalInner: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 38,
  },
  modalList: {
    paddingBottom: 20,
  },
  modalEventCard: {
    backgroundColor: 'rgba(255,215,0,0.05)',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  modalEventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  modalEventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEventTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  modalEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalEventDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modalTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalEventDetails: {
    gap: 8,
    marginLeft: 52,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalDetailText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty State
  emptyCard: {
    width: '100%',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
    elevation: 6,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
});
