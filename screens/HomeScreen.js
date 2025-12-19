  // screens/HomeScreen.js - PHIÊN BẢN TẾT 2026 SIÊU ĐẸP (17/11/2025)
  import React, { useEffect, useState, useRef } from "react";
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
    ImageBackground,
    Animated,
    PanResponder,
  } from "react-native";
  import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
  import { LinearGradient } from "expo-linear-gradient";
  import { PieChart, BarChart, LineChart } from "react-native-chart-kit";
  import { auth, db } from "../firebase";
  import { EventDetailModal } from "../notifications";
  import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
  import useTheme from "../hooks/useTheme";
  import { useTranslation } from "react-i18next";
  import { useSettings } from "../context/SettingsContext";

  // --- Lấy icon theo loại lịch ---
  const getCalendarIcon = (key) => {
    const icons = {
      work:        { icon: 'briefcase',        emoji: '💼' },
      personal:    { icon: 'heart',            emoji: '❤️' },
      study:       { icon: 'book-open-variant',emoji: '📚' },
      family:      { icon: 'home-heart',       emoji: '🏠' },
      health:      { icon: 'heart-pulse',      emoji: '💪' },
      travel:      { icon: 'airplane',         emoji: '✈️' },
      project:     { icon: 'lightbulb-on',     emoji: '💡' },
      social:      { icon: 'account-group',    emoji: '🎉' },
      finance:     { icon: 'wallet',           emoji: '💰' },
      hobby:       { icon: 'star',             emoji: '🎨' },
    };
    return icons[key] || { icon: 'rocket', emoji: '🚀' };
  };

  export default function HomeScreen({ navigation }) {
    const { palette } = useTheme();
    const { t } = useTranslation();

    const [greeting, setGreeting] = useState("");
    const [notifications, setNotifications] = useState([]);
    const [quote, setQuote] = useState("");
    const [searchText, setSearchText] = useState("");
  // Lọc sự kiện theo từ khóa + thời gian (nhất quán với EventsCalendarScreen)
  // useMemo để tránh tính toán lại mỗi render → TĂNG TỐC ĐỘ
  const filteredEvents = React.useMemo(() => {
    return notifications.filter((ev) => {
      const text = searchText.trim().toLowerCase();

      // ------------------------------------------------
      // 1) Nếu có TỪ KHÓA → phải khớp ít nhất 1 trường
      // ------------------------------------------------
      if (text) {
        const match =
          ev.tieuDe?.toLowerCase().includes(text) ||
          ev.type?.toLowerCase().includes(text) ||
          ev.location?.toLowerCase().includes(text) ||
          ev.description?.toLowerCase().includes(text);

        if (!match) return false;
      }

      // ------------------------------------------------
      // 2) Lọc theo thời gian
      //    - Sự kiện thường: bỏ qua nếu giờ bắt đầu đã qua
      //    - Sự kiện cả ngày: hiển thị cả ngày (chỉ bỏ qua khi hết ngày)
      // ------------------------------------------------
      const now = new Date();
      
      if (ev.caNgay) {
        // Sự kiện cả ngày: chỉ ẩn khi đã hết ngày (so sánh với endDate)
        if (ev.endDate && ev.endDate < now) return false;
      } else {
        // Sự kiện thường: ẩn khi đã qua giờ bắt đầu
        if (ev.startDate < now) return false;
      }

      return true;
    });
  }, [notifications, searchText]);


    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [upcomingReminders, setUpcomingReminders] = useState([]);

    // FAB draggable position
    const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const [fabPosition, setFabPosition] = useState({ right: 20, bottom: 30 });

    // FAB Animated Icon Component
    const FABAnimatedIcon = () => {
      const scaleAnim = useRef(new Animated.Value(1)).current;
      const translateYAnim = useRef(new Animated.Value(0)).current;
      const opacityAnim = useRef(new Animated.Value(1)).current;

      useEffect(() => {
        // Bounce effect MẠNH MẼ
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.4,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.9,
              duration: 700,
              useNativeDriver: true,
            }),
          ])
        );

        // Float effect SỐNG ĐỘNG
        const float = Animated.loop(
          Animated.sequence([
            Animated.timing(translateYAnim, {
              toValue: -10,
              duration: 900,
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: 2,
              duration: 900,
              useNativeDriver: true,
            }),
          ])
        );

        // Glow effect NỔI BẬT
        const glow = Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );

        pulse.start();
        float.start();
        glow.start();

        return () => {
          pulse.stop();
          float.stop();
          glow.stop();
        };
      }, []);

      return (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
            opacity: opacityAnim,
          }}
        >
          <LinearGradient colors={[palette?.fabStart || "#FFD700", palette?.fabEnd || "#FFA000"]} style={styles.fabGradient}>
            <Ionicons name="chatbubbles" size={28} color={palette?.primary || "#D32F2F"} />
          </LinearGradient>
        </Animated.View>
      );
    };

    const user = auth.currentUser;
    const username = user?.displayName || "Bạn";
    const defaultAvatar = "https://i.ibb.co/9ZKwf4L/default-avatar-tet.png";
    const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || defaultAvatar);

    // Load avatar from Firestore (ImgBB URL)
    useEffect(() => {
      const loadAvatar = async () => {
        try {
          const u = auth.currentUser;
          if (!u) return;
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const url = data.photoURL || u.photoURL || defaultAvatar;
            // Use timestamp param to bust cache so ảnh cập nhật hiển thị ngay
            setAvatarUrl(`${url}?v=${Date.now()}`);
          } else {
            setAvatarUrl((u.photoURL || defaultAvatar) + `?v=${Date.now()}`);
          }
        } catch (e) {
          setAvatarUrl((user?.photoURL || defaultAvatar) + `?v=${Date.now()}`);
        }
      };
      loadAvatar();
    }, []);

    // Refresh avatar mỗi khi quay lại Home để hiển thị ngay lập tức sau cập nhật
    useEffect(() => {
      const unsubscribe = navigation.addListener('focus', async () => {
        try {
          const u = auth.currentUser;
          if (!u) return;
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          const data = userDoc.exists() ? userDoc.data() : {};
          const url = data.photoURL || u.photoURL || defaultAvatar;
          setAvatarUrl(`${url}?v=${Date.now()}`);
        } catch (_) {}
      });
      return unsubscribe;
    }, [navigation]);

    // Toggle notification (reminder) for an event: if off -> set default 10m, if on -> turn off
    const handleToggleNotification = async (ev) => {
      if (!ev?.id) return;
      try {
        const current = ev.thongBao || 'Không thông báo';
        // Determine off state (contains 'Không' or equals translation for none)
        const isOff = /Không/i.test(current) || current === t('noNotification') || current === t('noneNotification');
        const newValue = isOff ? '10m' : t('noNotification');
        await updateDoc(doc(db, 'events', ev.id), { thongBao: newValue });
        // Optimistic local update
        setNotifications((prev) => prev.map((e) => e.id === ev.id ? { ...e, thongBao: newValue } : e));
        setUpcomingReminders((prev) => prev.map((e) => e.id === ev.id ? { ...e, thongBao: newValue } : e));
      } catch (err) {
        console.warn('Toggle notification failed', err);
      }
    };

    // Custom notification minutes via prompt (long press bell)
    const handleCustomNotification = async (ev) => {
      if (!ev?.id) return;
      // Alert.prompt only on iOS; for Android you might implement a modal later
      if (typeof Alert?.prompt === 'function') {
        Alert.prompt(
          t('custom_reminder_title'),
          t('custom_reminder_message'),
          [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('ok'),
              onPress: async (input) => {
                const minutes = parseInt(input, 10);
                if (isNaN(minutes) || minutes <= 0) {
                  Alert.alert(t('error'), t('invalid_minutes'));
                  return;
                }
                try {
                  const newValue = `${minutes}m`;
                  await updateDoc(doc(db, 'events', ev.id), { thongBao: newValue });
                  setNotifications((prev) => prev.map((e) => e.id === ev.id ? { ...e, thongBao: newValue } : e));
                  setUpcomingReminders((prev) => prev.map((e) => e.id === ev.id ? { ...e, thongBao: newValue } : e));
                } catch (e) {
                  console.warn('Custom notification update failed', e);
                }
              }
            }
          ],
          'plain-text',
          '15'
        );
      } else {
        // Fallback simple toggle cycle for platforms without Alert.prompt
        const cycle = ['5m','10m','15m','30m','60m'];
        const currentRaw = ev.thongBao || '';
        const idx = cycle.findIndex(c => c === currentRaw);
        const next = cycle[(idx + 1) % cycle.length];
        try {
          await updateDoc(doc(db, 'events', ev.id), { thongBao: next });
          setNotifications((prev) => prev.map((e) => e.id === ev.id ? { ...e, thongBao: next } : e));
          setUpcomingReminders((prev) => prev.map((e) => e.id === ev.id ? { ...e, thongBao: next } : e));
        } catch (e) { console.warn('Cycle notification failed', e); }
      }
    };

    // Lời chào theo giờ (i18n)
    useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting(t('greeting_morning', { name: username }));
      else if (hour < 18) setGreeting(t('greeting_afternoon', { name: username }));
      else setGreeting(t('greeting_evening', { name: username }));
    }, [username, t]);

    // Lấy sự kiện hôm nay (giữ nguyên logic cũ)
    useEffect(() => {
      if (!auth.currentUser) return;

      const unsubscribe = onSnapshot(
        query(collection(db, "events"), where("userId", "==", auth.currentUser.uid)),
        (snapshot) => {
          const now = new Date();
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);

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

          const todayEvents = events
            .filter((ev) => {
              // Sự kiện phải trong ngày hôm nay
              if (ev.startDate < startOfToday || ev.startDate > endOfToday) return false;
              
              // Sự kiện cả ngày: hiển thị suốt cả ngày
              if (ev.caNgay) return true;
              
              // Sự kiện thường: chỉ hiển thị nếu chưa qua giờ bắt đầu
              return ev.startDate >= now;
            })
            .sort((a, b) => a.startDate - b.startDate)
            .slice(0, 5);

          setNotifications(todayEvents);
          setUpcomingReminders(todayEvents);
        }
      );

      return () => unsubscribe && unsubscribe();
    }, []);

    // Trích dẫn động viên kiểu Tết (i18n)
    useEffect(() => {
      const keys = ['quote_inspire1','quote_inspire2','quote_inspire3','quote_inspire4'];
      const picked = keys[Math.floor(Math.random() * keys.length)];
      setQuote(t(picked));
    }, [t]);

    const { isDarkMode, language } = useSettings();

    return (
      <ImageBackground 
        source={isDarkMode ? null : require("../assets/bg-tet.jpg")} 
        style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
        blurRadius={2}
      >
        <LinearGradient colors={[palette?.surfaceGradientStart || "rgba(211,47,47,0.9)", palette?.surfaceGradientMid || "rgba(255,215,0,0.15)", palette?.surfaceGradientEnd || "rgba(211,47,47,0.95)"]} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

              {/* Header Tết sang trọng */}
              <LinearGradient colors={[palette?.headerStart || "#FFD700", palette?.headerEnd || "#FFA000"]} style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'Profile' })}>
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatar}
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.greeting, { color: palette?.primary || styles.greeting.color }]}>{greeting}</Text>
                    <Text style={[styles.quote, { color: palette?.onPrimary || styles.quote.color }]}>"{quote}"</Text>
                  </View>
                  <MaterialCommunityIcons name="shimmer" size={36} color="#D32F2F" />
                </View>
              </LinearGradient>

              {/* 🔥 Banner ngày tháng hiện đại */}
              <LinearGradient
                colors={['#D32F2F', '#B71C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  marginHorizontal: 20,
                  marginTop: -20,
                  marginBottom: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: '#FFD700',
                  elevation: 10,
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Icon và ngày chính */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: 'rgba(255, 215, 0, 0.2)',
                      borderWidth: 2,
                      borderColor: '#FFD700',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFD700' }}>
                        {new Date().getDate()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '900',
                        color: '#FFD700',
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}>
                        {new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long' })}
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: '#FFF',
                        marginTop: 2,
                        opacity: 0.9,
                      }}>
                        {language === 'vi'
                          ? `Tháng ${new Date().getMonth() + 1}, ${new Date().getFullYear()}`
                          : `${new Date().toLocaleDateString('en-US', { month: 'long' })} ${new Date().getFullYear()}`}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Badge HÔM NAY */}
                  <View style={{
                    backgroundColor: '#FFD700',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: '#FFF',
                  }}>
                    <Text style={{
                      color: '#D32F2F',
                      fontSize: 12,
                      fontWeight: '900',
                      letterSpacing: 1,
                    }}>
                      {t('today', { defaultValue: 'Hôm nay' }).toUpperCase()}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Thanh tìm kiếm Tết */}
              <View style={[styles.searchContainer, { backgroundColor: palette?.surface || "rgba(255,255,255,0.95)", borderColor: palette?.accent || "#FFD700" }]}>
                <Ionicons name="search-outline" size={24} color={palette?.accent || "#FFD700"} />
                <TextInput
                  placeholder={t('searchPlaceholder')}
                  placeholderTextColor={palette?.placeholder || "#cc9a00"}
                  style={[styles.searchInput, { color: palette?.text || styles.searchInput.color }]}
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>

              {/* Sự kiện sắp tới */}
              <Text style={[styles.sectionTitle, { color: palette?.accent || styles.sectionTitle.color }]}>🧧 {t('notifications')}</Text>
              {notifications.length > 0 ? (
                <FlatList
    data={filteredEvents}

                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  snapToInterval={280}
                  decelerationRate="fast"
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isOff = /Không/i.test(item.thongBao || '') || (item.thongBao === t('noNotification'));
                    const displayReminder = isOff ? t('noNotification') : item.thongBao;
                    
                    // Xác định calendar key từ type
                    const calendarKey = (() => {
                      const typeMap = {
                        'Công việc': 'work',
                        'Cá nhân': 'personal',
                        'Học tập': 'study',
                        'Gia đình': 'family',
                        'Sức khỏe': 'health',
                        'Du lịch': 'travel',
                        'Dự án': 'project',
                        'Sự kiện xã hội': 'social',
                        'Tài chính': 'finance',
                        'Sở thích': 'hobby',
                      };
                      return typeMap[item.type] || 'personal';
                    })();
                    
                    // Animated Icon Component - Wave effect đẹp mắt
                    const AnimatedIconComponent = ({ calendarKey, color }) => {
                      const scaleAnim = useRef(new Animated.Value(1)).current;
                      const translateYAnim = useRef(new Animated.Value(0)).current;
                      const opacityAnim = useRef(new Animated.Value(1)).current;
                      const calendarInfo = getCalendarIcon(calendarKey);

                      useEffect(() => {
                        // Hiệu ứng scale MẠNH MẼ
                        const pulse = Animated.loop(
                          Animated.sequence([
                            Animated.timing(scaleAnim, {
                              toValue: 1.35,
                              duration: 800,
                              useNativeDriver: true,
                            }),
                            Animated.timing(scaleAnim, {
                              toValue: 0.95,
                              duration: 800,
                              useNativeDriver: true,
                            }),
                          ])
                        );

                        // Hiệu ứng wave SỐNG ĐỘNG (floating lên xuống mạnh)
                        const wave = Animated.loop(
                          Animated.sequence([
                            Animated.timing(translateYAnim, {
                              toValue: -12,
                              duration: 1000,
                              useNativeDriver: true,
                            }),
                            Animated.timing(translateYAnim, {
                              toValue: 3,
                              duration: 1000,
                              useNativeDriver: true,
                            }),
                          ])
                        );

                        // Hiệu ứng opacity NỔI BẬT (glow mạnh)
                        const glow = Animated.loop(
                          Animated.sequence([
                            Animated.timing(opacityAnim, {
                              toValue: 0.5,
                              duration: 1200,
                              useNativeDriver: true,
                            }),
                            Animated.timing(opacityAnim, {
                              toValue: 1,
                              duration: 1200,
                              useNativeDriver: true,
                            }),
                          ])
                        );

                        pulse.start();
                        wave.start();
                        glow.start();

                        return () => {
                          pulse.stop();
                          wave.stop();
                          glow.stop();
                        };
                      }, []);

                      return (
                        <Animated.View
                          style={{
                            transform: [
                              { scale: scaleAnim },
                              { translateY: translateYAnim },
                            ],
                            opacity: opacityAnim,
                          }}
                        >
                          <MaterialCommunityIcons name={calendarInfo.icon} size={18} color={color} />
                        </Animated.View>
                      );
                    };
                    
                    return (
                      <TouchableOpacity
                        style={[styles.eventCard, { 
                          borderColor: item.calendarColor || '#FFD700',
                          backgroundColor: 'rgba(255,255,255,0.98)',
                          borderLeftWidth: 8,
                          borderLeftColor: item.calendarColor || '#FFD700',
                        }]}
                        onPress={() => {
                          setSelectedEvent(item);
                          setDetailModalVisible(true);
                        }}
                      >
                        {/* Bell & reminder badge */}
                        <View style={{ position: 'absolute', top: 10, right: 10, alignItems: 'flex-end' }}>
                          <TouchableOpacity
                            onPress={() => {
                              navigation.navigate('NotificationScreen', {
                                selected: isOff ? 'none' : item.thongBao,
                                eventData: {
                                  id: item.id,
                                  tieuDe: item.tieuDe,
                                  ngayBatDau: item.startDate,
                                  ngayKetThuc: item.endDate,
                                  caNgay: item.caNgay,
                                },
                                onSelect: async (val) => {
                                  const newValue = (val === 'none' || !val) ? t('noNotification') : val;
                                  try {
                                    await updateDoc(doc(db, 'events', item.id), { thongBao: newValue });
                                  } catch (e) {
                                    console.warn('Update thongBao failed', e);
                                  }
                                  setNotifications(prev => prev.map(ev => ev.id === item.id ? { ...ev, thongBao: newValue } : ev));
                                  setUpcomingReminders(prev => prev.map(ev => ev.id === item.id ? { ...ev, thongBao: newValue } : ev));
                                }
                              });
                            }}
                            onLongPress={() => handleCustomNotification(item)}
                          >
                            <Ionicons
                              name={isOff ? 'notifications-off-outline' : 'notifications-outline'}
                              size={22}
                              color={'#D32F2F'}
                            />
                          </TouchableOpacity>
                          <Text style={{ marginTop: 4, fontSize: 11, fontWeight: '700', color: '#D32F2F' }}>{displayReminder}</Text>
                        </View>
                        {/* Calendar animated icon & title */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 60 }}>
                          <View style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 20, 
                            backgroundColor: (item.calendarColor || '#7b61ff') + '22', 
                            borderWidth: 2, 
                            borderColor: item.calendarColor || '#7b61ff',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 10,
                            flexShrink: 0
                          }}>
                            <AnimatedIconComponent calendarKey={calendarKey} color={item.calendarColor || '#7b61ff'} />
                          </View>
                          <Text style={{ position: 'absolute', fontSize: 16, top: -4, left: 30 }}>
                            {getCalendarIcon(calendarKey).emoji}
                          </Text>
                          <Text style={[styles.eventTitle, { color: '#000', marginLeft: 30, fontWeight: '900', fontSize: 18, flex: 1 }]} numberOfLines={2}>{item.tieuDe}</Text>
                        </View>
                        {/* Calendar badge */}
                        {item.type ? (
                          <View style={[styles.calendarBadge, { backgroundColor: item.calendarColor || '#7b61ff', marginBottom: 8 }]}>
                            <MaterialCommunityIcons name="folder" size={12} color="#fff" />
                            <Text style={styles.calendarBadgeText}>{item.type}</Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Ionicons name='time-outline' size={18} color={item.calendarColor || '#7b61ff'} />
                          <Text style={{ fontSize: 14, color: '#333', marginLeft: 8, fontWeight: '500' }}>
                            {item.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{item.endDate ? ` → ${item.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </Text>
                        </View>
                        {item.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Ionicons name='location-outline' size={18} color={item.calendarColor || '#7b61ff'} />
                            <Text style={{ fontSize: 13, color: '#333', marginLeft: 6, fontWeight: '500' }} numberOfLines={1}>{item.location}</Text>
                          </View>
                        ) : null}
                        {item.description ? (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Ionicons name='document-text-outline' size={18} color={item.calendarColor || '#7b61ff'} style={{ marginTop: 2 }} />
                            <Text style={{ fontSize: 13, color: '#555', marginLeft: 6, fontWeight: '500' }} numberOfLines={3}>{item.description}</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : (
                <Text style={[styles.noEvent, { color: palette?.text || styles.noEvent.color }]}>{t('noNotifications')}</Text>
              )}

              {/* Hành động nhanh - Tết hóa */}
              <Text style={[styles.sectionTitle, { color: palette?.accent || styles.sectionTitle.color }]}>⚡ {t('quickActions')}</Text>
              <View style={styles.quickActions}>
                {[
                  { icon: 'person-circle-outline', key: 'profile', color: '#ff6b6b', default: t('profile') },
                  { icon: 'add-circle-outline', key: 'addEvent', color: '#4ecdc4', default: t('addEvent') },
                  { icon: 'calendar-outline', key: 'calendar', color: '#95e1d3', default: t('calendar') },
                  { icon: 'bar-chart-outline', key: 'dashboard', color: '#f38181', default: t('dashboard_title', { defaultValue: 'Thống Kê & Báo Cáo' }) },
                  { icon: 'settings-outline', key: 'settings', color: '#feca57', default: t('settings') },
                ].map((item, idx) => {
                  const QuickActionAnimatedIcon = () => {
                    const scaleAnim = useRef(new Animated.Value(1)).current;
                    const translateYAnim = useRef(new Animated.Value(0)).current;
                    const opacityAnim = useRef(new Animated.Value(1)).current;

                    useEffect(() => {
                      // Bounce effect MẠNH MẼ
                      const pulse = Animated.loop(
                        Animated.sequence([
                          Animated.timing(scaleAnim, {
                            toValue: 1.4,
                            duration: 700,
                            useNativeDriver: true,
                          }),
                          Animated.timing(scaleAnim, {
                            toValue: 0.9,
                            duration: 700,
                            useNativeDriver: true,
                          }),
                        ])
                      );

                      // Float effect SỐNG ĐỘNG (lên xuống mạnh)
                      const float = Animated.loop(
                        Animated.sequence([
                          Animated.timing(translateYAnim, {
                            toValue: -10,
                            duration: 900,
                            useNativeDriver: true,
                          }),
                          Animated.timing(translateYAnim, {
                            toValue: 2,
                            duration: 900,
                            useNativeDriver: true,
                          }),
                        ])
                      );

                      // Glow effect NỔI BẬT (sáng lóa)
                      const glow = Animated.loop(
                        Animated.sequence([
                          Animated.timing(opacityAnim, {
                            toValue: 0.5,
                            duration: 1000,
                            useNativeDriver: true,
                          }),
                          Animated.timing(opacityAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                          }),
                        ])
                      );

                      pulse.start();
                      float.start();
                      glow.start();

                      return () => {
                        pulse.stop();
                        float.stop();
                        glow.stop();
                      };
                    }, []);

                    return (
                      <Animated.View
                        style={{
                          transform: [
                            { scale: scaleAnim },
                            { translateY: translateYAnim },
                          ],
                          opacity: opacityAnim,
                        }}
                      >
                        <Ionicons name={item.icon} size={32} color="#fff" />
                      </Animated.View>
                    );
                  };
                  
                  return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.actionBtn}
                    onPress={() => {
                      if (item.key === "profile") navigation.navigate('Settings', { screen: 'Profile' });
                      if (item.key === "settings") navigation.navigate('Settings', { screen: 'SettingsHome' });
                      if (item.key === "addEvent") navigation.navigate("AddEvent");
                      if (item.key === "calendar") navigation.navigate("EventsCalendar");
                      if (item.key === "dashboard") navigation.navigate("Dashboard");
                    }}
                  >
                    <LinearGradient colors={[item.color + "dd", item.color + "99"]} style={styles.actionIcon}>
                      <QuickActionAnimatedIcon />
                    </LinearGradient>
                    <Text style={[styles.actionText, { color: palette?.accent || styles.actionText.color }]}>{item.default}</Text>
                  </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>

            {/* Nút AI nổi - Draggable như Messenger */}
            <Animated.View
              style={[
                styles.fab,
                {
                  transform: fabPan.getTranslateTransform(),
                },
              ]}
              {...PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                  fabPan.setOffset({
                    x: fabPan.x._value,
                    y: fabPan.y._value,
                  });
                  fabPan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: Animated.event(
                  [null, { dx: fabPan.x, dy: fabPan.y }],
                  { useNativeDriver: false }
                ),
                onPanResponderRelease: (e, gesture) => {
                  fabPan.flattenOffset();
                  // Thả hoàn toàn tự do - KHÔNG giới hạn, thả ở đâu cũng được
                  // Có thể che các nút khác, hoàn toàn tự do như nút home
                },
              }).panHandlers}
            >
              <TouchableOpacity onPress={() => navigation.navigate("AIChat")}>
                <FABAnimatedIcon />
              </TouchableOpacity>
            </Animated.View>

            {/* Modal Chi tiết sự kiện */}
            {detailModalVisible && selectedEvent && (
              <EventDetailModal event={selectedEvent} onClose={() => setDetailModalVisible(false)} />
            )}
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // STYLE TẾT 2026 - ĐỎ VÀNG HOÀN HẢO
  const styles = StyleSheet.create({
    header: { padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 10 },
    avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: "#D32F2F" },
    greeting: { fontSize: 26, fontWeight: "900", color: "#D32F2F", textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    quote: { fontSize: 16, color: "#fff", marginTop: 6, fontStyle: "italic" },

    searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.95)", margin: 20, marginTop: -20, borderRadius: 20, paddingHorizontal: 20, height: 56, elevation: 10, borderWidth: 2, borderColor: "#FFD700" },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: "#333", fontWeight: "600" },

    sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#FFD700", textAlign: "center", marginVertical: 20, textShadowColor: "#D32F2F", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

    eventCard: { width: 270, marginRight: 18, borderRadius: 24, padding: 18, elevation: 18, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, backgroundColor: "rgba(255,255,255,1)", borderWidth: 3, borderColor: "#FFD700" },
    eventType: { color: "#333", fontWeight: "bold", fontSize: 13, marginBottom: 4 },
    eventTitle: { color: "#000", fontSize: 18, fontWeight: "900", marginBottom: 6 },
    eventTime: { color: "#333", fontSize: 14, fontWeight: "500" },
    calendarBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 2 },
    },
    calendarBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },

    noEvent: { textAlign: "center", color: "#fff", fontSize: 16, fontStyle: "italic", marginTop: 10 },

    quickActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10 },
    actionBtn: { alignItems: "center", margin: 12 },
    actionIcon: { width: 82, height: 82, borderRadius: 41, justifyContent: "center", alignItems: "center", elevation: 15, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    actionText: { marginTop: 10, fontWeight: "bold", color: "#FFD700", fontSize: 14 },

    fab: { position: "absolute", bottom: 30, right: 20 },
    fabGradient: { width: 65, height: 65, borderRadius: 32.5, justifyContent: "center", alignItems: "center", elevation: 25, shadowColor: "#000", shadowOpacity: 0.7, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
    modalContent: { width: "90%", backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", elevation: 20 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
    modalTitle: { fontSize: 24, fontWeight: "bold", color: "#FFD700" },
    eventDetailTitle: { fontSize: 22, fontWeight: "bold", color: "#D32F2F", marginBottom: 10 },
    eventDetailText: { fontSize: 16, color: "#333", marginBottom: 8 },
    closeBtn: { backgroundColor: "#FFD700", padding: 16, borderRadius: 16, alignItems: "center", margin: 20 },
  });
