// screens/EventsListScreen.js – Giao diện Hoàng Gia Tết
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Platform, ImageBackground, Animated 
} from 'react-native';
import { collection, query, where, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";

function adjustColor(hex, amt = 0) {
  try {
    if (!hex) return '#FFD700';
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    const num = parseInt(hex,16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.min(255, Math.max(0, r + amt));
    g = Math.min(255, Math.max(0, g + amt));
    b = Math.min(255, Math.max(0, b + amt));
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  } catch { return hex; }
}

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


export default function EventsListScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();
  const { palette } = useTheme();

  const theme = {
    background: palette?.background || (isDarkMode ? "#121212" : "#f2f2f2"),
    card: palette?.card || (isDarkMode ? "rgba(43,58,77,0.8)" : "rgba(255,255,255,0.8)"),
    text: palette?.text || (isDarkMode ? "#fff" : "#333"),
    textSecondary: palette?.textSecondary || (isDarkMode ? "#ccc" : "#555"),
    textTertiary: palette?.textSecondary || (isDarkMode ? "#bbb" : "#555"),
    border: palette?.accent || "#FFD700",
    selected: palette?.accent || "#FFD700",
    icon: palette?.textSecondary || (isDarkMode ? "#ccc" : "#555"),
    delete: palette?.danger || "#F44336",
    deleteSelected: palette?.danger || "#f44336",
    shadow: "#000",
  };

  // Lấy màu xuất hiện nhiều nhất trong danh sách sự kiện để dùng cho header / nút xoá nhiều
  const dominantColor = useMemo(() => {
    if (!events.length) return theme.border; // fallback accent
    const counts = {};
    events.forEach(e => {
      const c = e.lich?.color || theme.border;
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  }, [events, theme.border]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'events'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        const start = data.ngayBatDau?.toDate ? data.ngayBatDau.toDate() : new Date(data.ngayBatDau);
        const end = data.ngayKetThuc?.toDate ? data.ngayKetThuc.toDate() : new Date(data.ngayKetThuc);
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return { id: doc.id, start, end, createdAt, ...data };
      });

      list.sort((a, b) => b.createdAt - a.createdAt);
      setEvents(list);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = (id) => {
    Alert.alert(t("deleteEvent"), t("confirmDeleteOne"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
          await deleteDoc(doc(db, 'events', id));
          setSelectedIds(prev => prev.filter(i => i !== id));
        }
      }
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(t("deleteEvent"), t("confirmDeleteMany", { count: selectedIds.length }), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
          await Promise.all(selectedIds.map(id => deleteDoc(doc(db, 'events', id))));
          setSelectedIds([]);
        }
      }
    ]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const AnimatedIconComponent = ({ calendarKey, color }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const calendarInfo = getCalendarIcon(calendarKey);

    useEffect(() => {
      // Animation mạnh mẽ hơn: scale lớn hơn, nhanh hơn
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.4,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );

      // Rotation cho TẤT CẢ icon, nhanh hơn
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );

      // Thêm hiệu ứng bounce
      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -6,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      rotate.start();
      bounce.start();

      return () => {
        pulse.stop();
        rotate.stop();
        bounce.stop();
      };
    }, []);

    const spin = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { rotate: spin },
            { translateY: bounceAnim },
          ],
        }}
      >
        <MaterialCommunityIcons name={calendarInfo.icon} size={20} color={color} />
      </Animated.View>
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const baseColor = item.lich?.color || '#FFD700';
    const conflict = item.status === 'conflict';
    const bgColor = conflict ? adjustColor(baseColor,-20) : (isDarkMode ? palette?.card : 'rgba(255,255,255,0.95)');
    const selectedBg = isSelected ? adjustColor(baseColor,30) : bgColor;
    const borderColor = baseColor;
    const calendarInfo = getCalendarIcon(item.lich?.key);
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            borderLeftColor: borderColor,
            backgroundColor: selectedBg,
            shadowColor: adjustColor(baseColor,-40),
          },
        ]}
        onPress={() => selectedIds.length > 0 ? toggleSelect(item.id) : navigation.navigate('EventScreen', { eventId: item.id })}
        onLongPress={() => toggleSelect(item.id)}
      >
        <View style={styles.itemHeader}>
          <View style={[styles.calendarIconWrapper, { backgroundColor: baseColor + '22', borderColor: baseColor }]}>
            <AnimatedIconComponent calendarKey={item.lich?.key} color={baseColor} />
          </View>
          <Text style={styles.emojiFloating}>{calendarInfo.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: isDarkMode ? palette?.text : '#000' }]}>{item.tieuDe || t('noTitle')}</Text>
            <View style={[styles.calendarBadge, { backgroundColor: baseColor }]}>
              <MaterialCommunityIcons name="folder" size={12} color="#fff" />
              <Text style={styles.calendarBadgeText}>{item.lich?.name || 'Cá nhân'}</Text>
            </View>
          </View>
          {isSelected && <Ionicons name="check-circle" size={24} color={baseColor} style={{ marginLeft: 8 }} />}
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailText, { color: isDarkMode ? palette?.textSecondary : '#555' }]}>
            {item.caNgay ? `📅 ${t('allDay')}` : `🕒 ${item.start.toLocaleString()} - ${item.end.toLocaleString()}`}
          </Text>
          {item.lapLai && item.lapLai !== 'None' && <MaterialIcons name="repeat" size={18} color={baseColor} style={{ marginLeft: 6 }} />}
          {item.thongBao && item.thongBao !== 'None' && <Ionicons name="notifications-outline" size={18} color={baseColor} style={{ marginLeft: 4 }} />}
        </View>
        {item.diaDiem ? <Text style={[styles.location, { color: isDarkMode ? palette?.textSecondary : '#666' }]}>📍 {item.diaDiem}</Text> : null}
        {item.ghiChu ? (
          <Text style={[styles.note, { color: isDarkMode ? palette?.textSecondary : '#777' }]}>
            {item.ghiChu.length > 50 ? item.ghiChu.slice(0, 50) + '…' : item.ghiChu}
          </Text>
        ) : null}
        <View style={styles.actionRow}>
          {selectedIds.length === 0 && (
            <TouchableOpacity style={[styles.deleteButton, { backgroundColor: adjustColor(baseColor,-50) }]} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={isDarkMode ? null : require("../assets/bg-tet.jpg")}
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }}
      blurRadius={3}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header Hoàng Gia */}
        <View style={[styles.header,{ backgroundColor: isDarkMode ? (palette?.headerStart || '#2C2C2C') : (adjustColor(dominantColor,40)+'22') }] }>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={36} color={isDarkMode ? palette?.accent : "#000"} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle,{ color: isDarkMode ? palette?.accent : "#000000ff" }]}>{t('eventList')}</Text>
          <MaterialCommunityIcons name="crown" size={36} color={isDarkMode ? palette?.accent : "#000"} />
        </View>

        {selectedIds.length > 0 && (
          <TouchableOpacity style={[styles.deleteSelectedButton, { backgroundColor: adjustColor(dominantColor,-50) }]} onPress={handleDeleteSelected}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('deleteManyButton', { count: selectedIds.length })}</Text>
          </TouchableOpacity>
        )}

        {events.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textSecondary, fontSize: 16 }}>
            {t("noEvents")}
          </Text>
        ) : (
          <FlatList
            data={events}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            extraData={selectedIds}
            contentContainerStyle={{
              paddingBottom: Platform.OS === 'ios' ? 160 : 120,
              padding: 12,
            }}
          />
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 30,
  },
  backButton: {
    width: 36,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
    flex: 1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  item: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    borderLeftWidth: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  calendarIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  emojiFloating: {
    position: 'absolute',
    fontSize: 18,
    top: -6,
    left: 36,
  },
  title: { fontWeight: '900', fontSize: 18, marginBottom: 6 },
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
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  detailText: { fontSize: 14 },
  location: { fontSize: 14, marginBottom: 4 },
  note: { fontSize: 13, fontStyle: 'italic', marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSelectedButton: {
    padding: 12,
    margin: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
});
