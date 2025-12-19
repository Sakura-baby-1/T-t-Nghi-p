import React, { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Vibration, Alert, ImageBackground, SafeAreaView, Animated } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

// ===== Notification handler =====
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ===== Push token =====
async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert("Thông báo chỉ hoạt động trên thiết bị thật.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Ứng dụng cần quyền thông báo!");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("Expo Push Token:", token);
  return token;
}

// ===== Hook quản lý thông báo =====
export function useNotifications() {
  const [eventForModal, setEventForModal] = useState(null);
  const [currentSound, setCurrentSound] = useState(null);
  const [vibrationInterval, setVibrationInterval] = useState(null);
  const [alarmTimeout, setAlarmTimeout] = useState(null);

  const playAlarm = async () => {
    if (currentSound) return;
    try {
      const { sound } = await Audio.Sound.createAsync(require("./assets/nhacchuong.mp3"));
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
      setCurrentSound(sound);

      const interval = setInterval(() => Vibration.vibrate(500), 1200);
      setVibrationInterval(interval);

      const timeout = setTimeout(() => stopAlarm(), 30000);
      setAlarmTimeout(timeout);
    } catch (e) {
      console.log("⚠️ Lỗi phát nhạc:", e);
    }
  };

  const stopAlarm = async () => {
    if (vibrationInterval) clearInterval(vibrationInterval);
    setVibrationInterval(null);

    if (alarmTimeout) {
      clearTimeout(alarmTimeout);
      setAlarmTimeout(null);
    }

    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      setCurrentSound(null);
    }
  };

  const handleNotification = (notification) => {
    const eventData = notification?.request?.content?.data?.event;
    if (eventData) {
      setEventForModal(eventData);
      playAlarm();
    }
  };

  const closeModal = () => {
    setEventForModal(null);
    stopAlarm();
  };

  useEffect(() => {
    registerForPushNotificationsAsync();

    const sub1 = Notifications.addNotificationReceivedListener(handleNotification);
    const sub2 = Notifications.addNotificationResponseReceivedListener(handleNotification);

    return () => {
      sub1.remove();
      sub2.remove();
      stopAlarm();
    };
  }, []);

  return { eventForModal, closeModal };
}
// --- Helper function ---
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

const FloatingEmoji = ({ emoji }) => {
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    float.start();
    rotate.start();

    return () => {
      float.stop();
      rotate.stop();
    };
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <Animated.Text
      style={{
        fontSize: 48,
        position: 'absolute',
        right: 20,
        top: 10,
        transform: [{ translateY: floatAnim }, { rotate: rotation }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
};

const AnimatedStarIcon = ({ color }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { rotate: spin }],
      }}
    >
      <Ionicons name='star' size={32} color={color} />
    </Animated.View>
  );
};

const AnimatedCalendarIcon = ({ calendarKey, color, date }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const calendarInfo = getCalendarIcon(calendarKey);
  
  const eventDate = date ? (date.toDate ? date.toDate() : new Date(date)) : new Date();
  const day = eventDate.getDate();

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { rotate: spin }],
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
      }} />
      
      <View style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Ionicons name={calendarInfo.icon} size={28} color='rgba(255,255,255,0.6)' />
        <View style={{
          position: 'absolute',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 10,
          paddingHorizontal: 6,
          paddingVertical: 2,
          top: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '900',
            color: '#D32F2F',
          }}>
            {day}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// --- Modal Chi Tiết Sự Kiện ---
export function EventDetailModal({ event, onClose }) {
  const { t } = useTranslation();
  if (!event) return null;

  // Support both shapes: event.startDate / event.endDate OR event.ngayBatDau / event.ngayKetThuc
  const rawStart = event.startDate || event.ngayBatDau;
  const rawEnd = event.endDate || event.ngayKetThuc;
  const startDate = rawStart?.toDate?.() || new Date(rawStart || Date.now());
  const endDate = rawEnd?.toDate?.() || (rawEnd ? new Date(rawEnd) : null);
  const allDay = event.caNgay || event.allDay;
  const accentColor = event.calendarColor || event.lich?.color || '#D32F2F';
  const calendarKey = event.lich?.key || event.calendar?.key || 'personal';

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <ImageBackground source={require("./assets/bg-tet.jpg")} style={{ flex: 1 }} blurRadius={3}>
        <LinearGradient colors={['rgba(211,47,47,0.9)', 'rgba(255,215,0,0.15)', 'rgba(211,47,47,0.95)']} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header giống full */}
            <LinearGradient colors={['#FFD700', '#FFA000']} style={modalStyles.header}>
              <TouchableOpacity style={modalStyles.backBtn} onPress={onClose}>
                <Ionicons name="close" size={32} color="#000" />
              </TouchableOpacity>
              <Text style={[modalStyles.headerTitle, { color: '#000' }]}>{t('event_details_label')}</Text>
              <View style={{ width: 50 }} />
            </LinearGradient>

            <ScrollView contentContainerStyle={modalStyles.container} showsVerticalScrollIndicator={false}>
              {/* Title card with animation */}
              <LinearGradient 
                colors={[accentColor + 'dd', (accentColor + '99')]} 
                style={modalStyles.titleCard}
              >
                <FloatingEmoji emoji={getCalendarIcon(calendarKey).emoji} />
                <View style={modalStyles.titleHeader}>
                  <AnimatedStarIcon color='rgba(255,255,255,0.9)' />
                  <Text style={modalStyles.eventTitle}>
                    {event.tieuDe || t('noTitle')}
                  </Text>
                </View>
              </LinearGradient>

              {/* Calendar card with animation */}
              <LinearGradient 
                colors={[accentColor + 'dd', accentColor + '99']} 
                style={modalStyles.calendarCard}
              >
                <View style={modalStyles.calendarContent}>
                  <View style={[modalStyles.calendarDot, { backgroundColor: accentColor, borderColor: '#fff' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.calendarLabel}>📂 LỊCH</Text>
                    <Text style={modalStyles.calendarName}>
                      {event.lich?.name || event.calendar?.name || event.type || t('personal')}
                    </Text>
                  </View>
                  <AnimatedCalendarIcon 
                    calendarKey={calendarKey} 
                    color='rgba(255,255,255,0.3)' 
                    date={rawStart}
                  />
                </View>
              </LinearGradient>

              {/* Time */}
              <View style={[modalStyles.infoCard, { borderLeftColor: accentColor, borderLeftWidth: 6 }]}>
                <View style={modalStyles.infoRow}>
                  <Ionicons name="time-outline" size={24} color={accentColor} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={modalStyles.infoLabel}>{t('start')}</Text>
                    <Text style={[modalStyles.infoText, { color: '#000' }]}>{allDay ? t('allDay') : startDate.toLocaleString()}</Text>
                  </View>
                </View>
                {endDate && (
                  <View style={[modalStyles.infoRow, { marginTop: 12 }]}>
                    <Ionicons name="time" size={24} color={accentColor} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={modalStyles.infoLabel}>{t('end')}</Text>
                      <Text style={[modalStyles.infoText, { color: '#000' }]}>{allDay ? t('allDay') : endDate.toLocaleString()}</Text>
                    </View>
                  </View>
                )}
                {event.lapLai && event.lapLai !== "Không lặp lại" && (
                  <View style={[modalStyles.infoRow, { marginTop: 12 }]}>
                    <Ionicons name="repeat" size={24} color={accentColor} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={modalStyles.infoLabel}>{t('repeat')}</Text>
                      <Text style={[modalStyles.infoText, { color: '#000' }]}>{event.lapLai}</Text>
                    </View>
                  </View>
                )}
                {event.thongBao && event.thongBao !== t('noNotification') && event.thongBao !== 'Không thông báo' && (
                  <View style={[modalStyles.infoRow, { marginTop: 12 }]}>
                    <Ionicons name="notifications-outline" size={24} color={accentColor} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={modalStyles.infoLabel}>{t('notification')}</Text>
                      <Text style={[modalStyles.infoText, { color: '#000' }]}>{event.thongBao}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Location */}
              {event.location || event.diaDiem ? (
                <View style={[modalStyles.infoCard, { borderLeftColor: accentColor, borderLeftWidth: 6 }]}>
                  <View style={modalStyles.infoRow}>
                    <Ionicons name="location-outline" size={24} color={accentColor} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={modalStyles.infoLabel}>📍 {t('location') || 'Địa điểm'}</Text>
                      <Text style={[modalStyles.infoTextLocation, { color: '#000' }]}>{event.location || event.diaDiem}</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Description */}
              {event.description || event.ghiChu ? (
                <View style={[modalStyles.infoCard, { borderLeftColor: accentColor, borderLeftWidth: 6 }]}>
                  <View style={modalStyles.infoRow}>
                    <Ionicons name="document-text-outline" size={24} color={accentColor} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={modalStyles.infoLabel}>📝 {t('note') || 'Ghi chú'}</Text>
                      <Text style={modalStyles.infoTextNote}>{event.description || event.ghiChu}</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </Modal>
  );
}

// ===== Styles =====
const modalStyles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  container: { padding: 20 },
  titleCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'visible',
    position: 'relative',
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  eventTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    flex: 1,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  calendarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  calendarDot: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    borderWidth: 3, 
    borderColor: '#fff',
    elevation: 5,
  },
  calendarLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 1,
  },
  calendarName: { 
    fontSize: 20, 
    color: '#fff', 
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#FFD700",
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoLabel: { fontSize: 13, color: "#666", marginBottom: 4, fontWeight: '600' },
  infoText: { fontSize: 16, fontWeight: "700", color: '#000' },
  infoTextLocation: { fontSize: 16, fontWeight: "700", color: '#000' },
  infoTextNote: { fontSize: 15, color: "#333", lineHeight: 24, fontWeight: '500' },
});
