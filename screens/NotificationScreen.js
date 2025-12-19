// screens/NotificationScreen.js – Giao diện Hoàng Gia
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Modal,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";
import { suggestReminderAI } from "../utils/ai";
import { LinearGradient } from 'expo-linear-gradient';

// Chuẩn hóa dữ liệu event
const normalizeEvent = (evt) => ({
  tieuDe: evt.tieuDe || evt.title_lower || "",
  ngayBatDau: evt.ngayBatDau?.toDate?.() || new Date(evt.ngayBatDau),
  ngayKetThuc: evt.ngayKetThuc?.toDate?.() || new Date(evt.ngayKetThuc),
  caNgay: evt.caNgay || false,
  id: evt.id || evt.docId || null,
});

export default function NotificationScreen({ navigation, route }) {
  const { selected, onSelect, eventData } = route.params;
  const { isDarkMode, language } = useSettings();
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [currentSelection, setCurrentSelection] = useState(selected || "none");
  const { t } = useTranslation();
  const { palette } = useTheme();

  // Danh sách tuỳ chọn
  const options = useMemo(() => [
    { label: t('no_reminder'), value: 'none', icon: 'notifications-off-outline' },
    { label: t('remind_1min'), value: '1m', icon: 'alarm-outline' },
    { label: t('remind_5min'), value: '5m', icon: 'alarm-outline' },
    { label: t('remind_10min'), value: '10m', icon: 'alarm-outline' },
    { label: t('remind_30min'), value: '30m', icon: 'time-outline' },
    { label: t('remind_1hour'), value: '1h', icon: 'time-outline' },
    { label: t('remind_2hour'), value: '2h', icon: 'time-outline' },
    { label: t('remind_1day'), value: '1d', icon: 'calendar-outline' },
    { label: t('custom_reminder_option_v2'), value: 'custom', icon: 'create-outline' },
  ], [t]);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customValue, setCustomValue] = useState('5');

  const handleSelect = (option) => {
    if (option.value === 'custom') {
      if (typeof Alert?.prompt === 'function' && Platform.OS === 'ios') {
        Alert.prompt(
          t('custom_reminder_title_v2', { defaultValue: 'Nhắc tuỳ chỉnh' }),
          t('custom_reminder_message_v2', { defaultValue: 'Nhập số phút trước khi sự kiện diễn ra để nhận thông báo.' }),
          [
            { text: t('cancel', { defaultValue: 'Huỷ' }), style: 'cancel' },
            {
              text: t('confirm', { defaultValue: 'Đồng ý' }),
              onPress: (input) => {
                const minutes = parseInt(input);
                if (!isNaN(minutes) && minutes > 0) {
                  setCurrentSelection(`${minutes}m`);
                  onSelect(`${minutes}m`);
                  navigation.goBack();
                } else Alert.alert(t('error'), t('invalid_minutes'));
              },
            },
          ],
          'plain-text',
          '5'
        );
      } else {
        setShowCustomModal(true);
      }
      return;
    }
    setCurrentSelection(option.value);
    onSelect(option.value);
    navigation.goBack();
  };

  // Chuyên nghiệp hơn: AI chỉ gợi ý, không tự động chọn, hiển thị riêng, loading rõ ràng
  useEffect(() => {
    const autoSuggest = async () => {
      if (!eventData) {
        setAiLoading(false);
        setAiSuggestion(null);
        Toast.show({ type: 'error', text1: 'Không có dữ liệu sự kiện!' });
        return;
      }

      const normalized = normalizeEvent(eventData);

      if (!normalized.tieuDe || !normalized.ngayBatDau) {
        setAiLoading(false);
        setAiSuggestion(null);
        Toast.show({ type: 'error', text1: 'Dữ liệu sự kiện không hợp lệ!' });
        return;
      }

      try {
        const suggestion = await suggestReminderAI(normalized);
        if (!suggestion) {
          setAiSuggestion(null);
          Toast.show({ type: 'info', text1: 'AI không có gợi ý phù hợp.' });
        } else {
          setAiSuggestion(suggestion);
        }
      } catch (err) {
        setAiSuggestion(null);
        console.error("❌ Lỗi AI:", err);
        Toast.show({ type: 'error', text1: 'Có lỗi khi lấy gợi ý AI.' });
      } finally {
        setAiLoading(false);
      }
    };
    autoSuggest();
  }, [eventData]);

  const accent = eventData?.lich?.color || eventData?.calendarColor || palette?.accent || '#FFD700';

  return (
    <ImageBackground source={require("../assets/bg-tet.jpg")} style={{ flex: 1 }} blurRadius={3}>
      <LinearGradient colors={[accent + 'ee', 'rgba(255,215,0,0.15)', accent + 'f3']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <LinearGradient colors={[accent, '#FFA000']} style={stylesNS.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={stylesNS.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={36} color="#000" />
            </TouchableOpacity>
            <Text style={stylesNS.headerTitle}>{t('select_reminder_time', { defaultValue: 'Chọn thời gian nhắc nhở' })}</Text>
            <MaterialCommunityIcons name="crown" size={36} color="#000" />
          </LinearGradient>

          {eventData && (
            <View style={[stylesNS.heroCard, { borderColor: accent }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={[stylesNS.dot, { backgroundColor: accent, borderColor: accent }]} />
                <Text style={[stylesNS.heroTitle, { color: accent }]} numberOfLines={2}>{eventData.tieuDe || t('noTitle')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name='time-outline' size={18} color={accent} />
                <Text style={stylesNS.heroText}>
                  {eventData.ngayBatDau?.toLocaleString?.() || ''}{eventData.ngayKetThuc ? ` → ${eventData.ngayKetThuc.toLocaleString()}` : ''}
                </Text>
              </View>
              {eventData.location && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name='location-outline' size={18} color={accent} />
                  <Text style={stylesNS.heroText} numberOfLines={1}>{eventData.location}</Text>
                </View>
              )}
              {eventData.description && (
                <View style={{ flexDirection: 'row' }}>
                  <Ionicons name='document-text-outline' size={18} color={accent} style={{ marginTop: 2 }} />
                  <Text style={stylesNS.heroDesc} numberOfLines={3}>{eventData.description}</Text>
                </View>
              )}
            </View>
          )}

          {/* Loading AI */}
          {aiLoading && (
            <View style={stylesNS.aiBox}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[stylesNS.aiText, { color: accent }]}>{t('ai_getting_suggestion', { defaultValue: 'Đang lấy gợi ý thông minh...' })}</Text>
            </View>
          )}

          {/* AI Suggestion Box */}
          {!aiLoading && aiSuggestion && (
            <View style={[stylesNS.aiBox, { backgroundColor: accent + '22', borderRadius: 16, marginBottom: 10, padding: 16 }]}> 
              <Text style={[stylesNS.aiText, { color: accent, fontSize: 16, fontWeight: '700' }]}>{t('ai_suggestion', { defaultValue: 'Gợi ý từ AI:' })} {t('ai_suggested', { suggestion: aiSuggestion.replace('m', ` ${t('minutes')}`).replace('h', ` ${t('hours')}`).replace('d', ` ${t('days')}`) })}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 10 }}>
                <TouchableOpacity
                  style={[stylesNS.btn, { backgroundColor: accent }]}
                  onPress={async () => {
                    setCurrentSelection(aiSuggestion);
                    onSelect(aiSuggestion);
                    // Lưu vào Firestore nếu có id
                    if (eventData?.id || eventData?.docId) {
                      try {
                        await setDoc(doc(db, "events", eventData.id || eventData.docId), { thongBao: aiSuggestion }, { merge: true });
                        Toast.show({ type: 'success', text1: t('ai_suggested', { suggestion: aiSuggestion }) });
                      } catch (err) {
                        Toast.show({ type: 'error', text1: t('ai_error_suggestion') });
                      }
                    }
                    navigation.goBack();
                  }}
                >
                  <Text style={[stylesNS.btnText, { color: '#fff' }]}>{t('choose_ai_suggestion', { defaultValue: 'Chọn gợi ý này' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[stylesNS.btn, { backgroundColor: '#ddd' }]}
                  onPress={() => setAiSuggestion(null)}
                >
                  <Text style={[stylesNS.btnText, { color: '#333' }]}>{t('skip_suggestion', { defaultValue: 'Bỏ qua' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Options List */}
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = item.value === currentSelection;
              return (
                <TouchableOpacity
                  style={[
                    stylesNS.optionItem,
                    {
                      backgroundColor: selected ? accent + '22' : 'rgba(255,255,255,0.93)',
                      borderColor: selected ? accent : 'rgba(0,0,0,0.08)',
                      shadowColor: selected ? accent : '#000',
                      elevation: selected ? 5 : 2,
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={item.icon} size={22} color={selected ? accent : '#666'} style={{ marginRight: 12 }} />
                    <Text style={[stylesNS.optionLabel, { color: selected ? accent : '#333', fontWeight: selected ? '700' : '500' }]}>{item.label}</Text>
                  </View>
                  {selected && <MaterialCommunityIcons name='check-circle' size={24} color={accent} />}
                </TouchableOpacity>
              );
            }}
          />

          {showCustomModal && (
            <Modal transparent animationType='fade'>
              <View style={stylesNS.modalOverlay}>
                <View style={[stylesNS.modalCard, { borderColor: accent }]}> 
                  <Text style={[stylesNS.modalTitle, { color: accent }]}>{t('custom_reminder_title_v2', { defaultValue: 'Nhắc tuỳ chỉnh' })}</Text>
                  <Text style={stylesNS.modalDesc}>{t('custom_reminder_message_v2', { defaultValue: 'Nhập số phút trước khi sự kiện diễn ra để nhận thông báo.' })}</Text>
                  <TextInput
                    value={customValue}
                    onChangeText={setCustomValue}
                    keyboardType='number-pad'
                    placeholder={t('custom_minutes_placeholder', { defaultValue: '10' })}
                    style={[stylesNS.input, { borderColor: accent }]}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <TouchableOpacity onPress={() => { setShowCustomModal(false); }} style={[stylesNS.btn, { backgroundColor: '#ddd' }]}> 
                      <Text style={stylesNS.btnText}>{t('cancel', { defaultValue: 'Huỷ' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      const minutes = parseInt(customValue, 10);
                      if (!isNaN(minutes) && minutes > 0) {
                        setCurrentSelection(`${minutes}m`);
                        onSelect(`${minutes}m`);
                        setShowCustomModal(false);
                        navigation.goBack();
                      } else Alert.alert(t('error'), t('invalid_minutes'));
                    }} style={[stylesNS.btn, { backgroundColor: accent }]}>
                      <Text style={[stylesNS.btnText, { color: '#fff' }]}>{t('confirm', { defaultValue: 'Đồng ý' })}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          <Toast position="bottom" />
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const stylesNS = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 30,
  },
  backButton: {
    width: 36,
  },
  backArea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontWeight: '700' },
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
  heroCard: {
    margin: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  dot: { width: 18, height: 18, borderRadius: 9, marginRight: 12, borderWidth: 2 },
  heroTitle: { fontSize: 22, fontWeight: '800', flex: 1 },
  heroText: { marginLeft: 8, fontSize: 13, color: '#333', fontWeight: '500', flex: 1 },
  heroDesc: { marginLeft: 8, fontSize: 12, color: '#444', flex: 1, lineHeight: 18 },
  aiBox: { paddingHorizontal: 20, marginBottom: 10, alignItems: 'center' },
  aiText: { marginTop: 8, fontWeight: '700' },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 14,
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  optionLabel: { fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 2 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  modalDesc: { fontSize: 14, color: '#555', marginBottom: 12 },
  input: { borderWidth: 2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, fontSize: 16, backgroundColor: '#fafafa' },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 },
  btnText: { fontSize: 16, fontWeight: '700' },
});
