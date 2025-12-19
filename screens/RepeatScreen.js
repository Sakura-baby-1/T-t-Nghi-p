// screens/RepeatScreen.js – Giao diện Hoàng Gia Tết
import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Platform, StatusBar, ImageBackground } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import useTheme from "../hooks/useTheme";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RepeatScreen({ navigation, route }) {
  const { selected, onSelect } = route.params;
  const { isDarkMode, language } = useSettings(); // language đã có, đảm bảo các useEffect phụ thuộc language
  const { t } = useTranslation();
  const { palette } = useTheme();

  const theme = {
    background: palette?.background || (isDarkMode ? "#121212" : "#f2f2f2"),
    header: palette?.card || (isDarkMode ? "#1f1f1f" : "#fff"),
    text: palette?.text || (isDarkMode ? "#fff" : "#333"),
    border: palette?.accent || "#FFD700",
    active: palette?.accent || "#FFD700",
  };

  const normalizeRepeat = (val) => {
    const v = (val || '').toString().trim().toLowerCase();
    const map = {
      '': 'none',
      'không': 'none', 'khong': 'none', 'không lặp lại': 'none', 'khong lap lai': 'none', 'none': 'none', 'no': 'none', 'no repeat': 'none', 'no-repeat': 'none',
      'hàng ngày': 'daily', 'hang ngay': 'daily', 'daily': 'daily',
      'hàng tuần': 'weekly', 'hang tuan': 'weekly', 'weekly': 'weekly',
      'hàng tháng': 'monthly', 'hang thang': 'monthly', 'monthly': 'monthly',
      'hàng năm': 'yearly', 'hang nam': 'yearly', 'yearly': 'yearly',
    };
    return map[v] || 'none';
  };

  const optionDefs = [
    { value: 'none', icon: 'close-circle', key: 'repeat_none' },
    { value: 'daily', icon: 'repeat', key: 'repeat_daily' },
    { value: 'weekly', icon: 'calendar-outline', key: 'repeat_weekly' },
    { value: 'monthly', icon: 'calendar-number-outline', key: 'repeat_monthly' },
    { value: 'yearly', icon: 'calendar-sharp', key: 'repeat_yearly' },
  ];

  const options = useMemo(() => {
    return optionDefs.map((op) => ({
      ...op,
      label: t(op.key, { defaultValue: op.value }),
    }));
  }, [t]);

  const [current, setCurrent] = useState(normalizeRepeat(selected));

  const handleSelect = (item) => {
    const value = normalizeRepeat(item.value);
    setCurrent(value);
    if (onSelect) onSelect(value);
    navigation.goBack();
  };

  return (
    <ImageBackground source={require("../assets/bg-tet.jpg")} style={{ flex:1 }} blurRadius={3}>
      <LinearGradient colors={[theme.active + 'ee', 'rgba(255,215,0,0.15)', theme.active + 'f3']} style={{ flex:1 }}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={{ flex:1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          {/* Hero Header */}
          <LinearGradient colors={[theme.active, '#FFA000']} style={styles.heroHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={36} color="#000" />
            </TouchableOpacity>
            <Text style={styles.titleHero}>{t('repeat', { defaultValue:'LẶP LẠI'})}</Text>
            <MaterialCommunityIcons name="crown" size={36} color="#000" />
          </LinearGradient>

          {/* Options List */}
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            contentContainerStyle={{ padding:20, paddingBottom:120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = item.value === current;
              return (
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? theme.active + '22' : 'rgba(255,255,255,0.95)',
                      borderColor: isSelected ? theme.active : 'rgba(0,0,0,0.08)',
                      shadowColor: isSelected ? theme.active : '#000',
                      elevation: isSelected ? 5 : 2,
                    }
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelect(item)}
                >
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    <Ionicons name={item.icon} size={22} color={isSelected ? theme.active : '#666'} style={{ marginRight:12 }} />
                    <Text style={{ fontSize:15, fontWeight:isSelected ? '700':'500', color:isSelected ? theme.active : theme.text }}>{item.label}</Text>
                  </View>
                  {isSelected && <MaterialCommunityIcons name='check-circle' size={24} color={theme.active} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 30,
    marginBottom:16,
  },
  backButton: {
    width: 36,
  },
  backBtn:{ padding:8, borderRadius:20 },
  titleHero: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
    flex: 1,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  optionCard:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingVertical:16,
    paddingHorizontal:18,
    borderRadius:18,
    borderWidth:2,
    marginBottom:16,
    shadowOpacity:0.25,
    shadowRadius:6,
  },
});
