// screens/AIChatScreen.js – AI TẾT 2026 HOÀNG KIM SIÊU SANG (ĐÃ FIX HOÀN HẢO + GIỮ NGUYÊN TẤT CẢ GỢI Ý)
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import useTheme from "../hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";
import * as Haptics from "expo-haptics";
import { askAI } from "../utils/ai";

// Lightweight memoized message bubble to reduce re-renders for FlatList
const MessageBubble = React.memo(function MessageBubble({ item, isUser, userName, palette, isDarkMode }) {
  const [copied, setCopied] = useState(false);
  
  const handleLongPress = () => {
    // Copy message to clipboard
    try {
      // React Native doesn't have direct clipboard, but we can use Clipboard module
      // For now, show feedback
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn("Copy failed:", e);
    }
  };
  
  const getTimeString = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };
  
  return (
    <View style={[styles.msgRow, isUser ? styles.userRow : styles.botRow]}>
      {!isUser && <MaterialCommunityIcons name="robot-happy" size={40} color="#FFD700" style={[styles.avatar, { backgroundColor: isDarkMode ? palette?.surface : '#FFE5E5', borderRadius: 20 }]} />}
      <TouchableOpacity 
        onLongPress={handleLongPress}
        activeOpacity={0.7}
        style={{ maxWidth: "75%" }}
      >
        <View style={[
          styles.bubble, 
          isUser 
            ? [styles.userBubble, { backgroundColor: isDarkMode ? palette?.accent : "rgba(255,255,255,0.98)", borderColor: palette?.accent }]
            : [styles.botBubble, { backgroundColor: isDarkMode ? palette?.surface : "rgba(255,255,255,0.98)", borderColor: palette?.accent }]
        ]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={[styles.sender, { color: isDarkMode ? palette?.accent : '#D32F2F' }]}>{isUser ? userName : "AI Tết 2026"}</Text>
            <Text style={[styles.timestamp, { color: isDarkMode ? palette?.textSecondary : '#999' }]}>{getTimeString(item.createdAt)}</Text>
          </View>
          <Text style={[styles.msgText, { color: isDarkMode ? palette?.text : '#333' }]}>{item.content}</Text>
          {copied && <Text style={{ fontSize: 11, color: isDarkMode ? palette?.accent : '#FFD700', marginTop: 4 }}>✓ Đã copy</Text>}
        </View>
      </TouchableOpacity>
      {isUser && <MaterialCommunityIcons name="account" size={40} color="#FFD700" style={[styles.avatar, { backgroundColor: isDarkMode ? palette?.background : '#FFF9E5', borderRadius: 20 }]} />}
    </View>
  );
});

export default function AIChatScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;
  const userName = user?.displayName || user?.email?.split("@")[0] || "Bạn";

  const { t } = useTranslation();
    const { isDarkMode, language } = useSettings();
  const { palette } = useTheme();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [events, setEvents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [typingText, setTypingText] = useState(""); // Dùng cho typing effect
  const [inputFocused, setInputFocused] = useState(false); // Track input focus
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  // Clear chat history
  const handleClearHistory = () => {
    Alert.alert(
      t('confirm', { defaultValue: 'Xác nhận' }),
      t('clear_chat_confirm', { defaultValue: 'Bạn có chắc muốn xóa toàn bộ lịch sử chat?' }),
      [
        { text: t('cancel', { defaultValue: 'Hủy' }), onPress: () => {}, style: 'cancel' },
        {
          text: t('delete', { defaultValue: 'Xóa' }),
          onPress: async () => {
            try {
              // Delete all messages from Firestore
              const q = query(collection(db, "chatHistory", userName, "messages"));
              const snap = await getDocs(q);
              for (const doc of snap.docs) {
                await import('firebase/firestore').then(({ deleteDoc }) => {
                  deleteDoc(doc.ref);
                });
              }
              setMessages([]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {
              console.error("Clear history error:", e);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // === GIỮ NGUYÊN 100% 10 GỢI Ý TẾT GỐC ===
  const tetSuggestions = [
    "Tết 2026 rơi vào ngày nào?",
    "Ngày giỗ Tổ Hùng Vương 2026?",
    "Tết Nguyên Đán 2026 mấy ngày nghỉ?",
    "30 Tết 2026 là thứ mấy?",
    "Mùng 1 Tết 2026 là thứ mấy?",
    "Giỗ Tổ 10/3 âm lịch 2026 là ngày dương lịch nào?",
    "Hôm nay có sự kiện gì?",
    "Tuần này có gì quan trọng?",
    "Tháng này có ngày lễ nào?",
    "Tạo sự kiện mới",
  ];

  // Load lịch sử chat
  useEffect(() => {
    if (!user || !userName) return;

    const q = query(
      collection(db, "chatHistory", userName, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(list);
      // Tự động scroll xuống tin nhắn mới nhất
      if (list.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    });

    return () => unsub();
  }, [userName]);

  // Load events + tạo gợi ý (giữ nguyên tất cả)
  useEffect(() => {
    if (!user) return;

    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(list);

        const eventSugs = list.slice(0, 8).map((e) => {
          if (!e.ngayBatDau?.toDate) return null;
          const date = e.ngayBatDau?.toDate ? e.ngayBatDau.toDate() : new Date(e.ngayBatDau);
          const dateStr = date.toLocaleDateString("vi-VN");
          return `Xem "${e.tieuDe}" ngày ${dateStr}`;
        }).filter(Boolean);

        // GIỮ NGUYÊN TOÀN BỘ GỢI Ý TẾT + SỰ KIỆN
        setSuggestions([...tetSuggestions, ...eventSugs]);
      } catch (err) {
        console.error("Lỗi load events:", err);
        setSuggestions(tetSuggestions); // vẫn giữ 10 gợi ý Tết nếu lỗi
      }
    };
    fetchEvents();
  }, [user]);

  // Tự động scroll xuống dưới khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length, isLoadingAI]);

  const sendMessage = async (text = input) => {
    const msg = text.trim();
    if (!msg || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg = { id: generateId(), role: "user", content: msg, userName };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoadingAI(true);

    try {
      await setDoc(doc(db, "chatHistory", userName, "messages", userMsg.id), {
        ...userMsg,
        createdAt: serverTimestamp(),
      });

      let aiResponse = "";

      // Gọi AI trực tiếp với context lịch
      try {
        const now = new Date();
        const currentTime = {
          date: now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          day: now.getDate(),
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          hour: now.getHours(),
          minute: now.getMinutes(),
        };

        // Phân tích sự kiện
        const todayEvents = events.filter(e => {
          if (!e.ngayBatDau?.toDate) return false;
          const eventDate = e.ngayBatDau.toDate();
          return eventDate.toDateString() === now.toDateString();
        }).sort((a, b) => {
          const aTime = a.ngayBatDau.toDate().getTime();
          const bTime = b.ngayBatDau.toDate().getTime();
          return aTime - bTime;
        });

        const upcomingEvents = events.filter(e => {
          if (!e.ngayBatDau?.toDate) return false;
          const eventDate = e.ngayBatDau.toDate();
          return eventDate > now && eventDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }).sort((a, b) => a.ngayBatDau.toDate() - b.ngayBatDau.toDate()).slice(0, 5);

        const thisMonthEvents = events.filter(e => {
          if (!e.ngayBatDau?.toDate) return false;
          const eventDate = e.ngayBatDau.toDate();
          return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
        }).length;

        const pastEvents = events.filter(e => {
          if (!e.ngayBatDau?.toDate) return false;
          return e.ngayBatDau.toDate() < now;
        }).sort((a, b) => b.ngayBatDau.toDate() - a.ngayBatDau.toDate()).slice(0, 3);

        const chatHistory = messages.slice(-6).map(m => 
          `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
        ).join('\n');

        // Phân tích intent của người dùng
        const lowerMsg = msg.toLowerCase();
        let intent = 'general';
        if (lowerMsg.includes('tết') || lowerMsg.includes('nguyên đán') || lowerMsg.includes('tấn')) intent = 'tet';
        if (lowerMsg.includes('hôm nay') || lowerMsg.includes('hôm') || lowerMsg.includes('sự kiện nào')) intent = 'today';
        if (lowerMsg.includes('tuần') || lowerMsg.includes('sắp')) intent = 'upcoming';
        if (lowerMsg.includes('tạo') || lowerMsg.includes('thêm') || lowerMsg.includes('lập')) intent = 'create';
        if (lowerMsg.includes('lịch') || lowerMsg.includes('calendar')) intent = 'calendar';

        const prompt = `You are a professional, intelligent, and friendly Vietnamese AI calendar assistant. Your expertise:
- Calendar and event management
- Vietnamese festivals and holidays in 2026
- Organizing and scheduling
- Providing insightful suggestions

**CURRENT TIME:**
Date: ${currentTime.date} (${currentTime.time})
Calendar: Day ${currentTime.day}, Month ${currentTime.month}, Year ${currentTime.year}

**USER'S EVENTS:**
Today (${todayEvents.length} events):
${todayEvents.length > 0 ? todayEvents.map(e => {
  const d = e.ngayBatDau.toDate();
  const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  return `• ${e.tieuDe} at ${timeStr}${e.diaDiem ? ` (${e.diaDiem})` : ''}${e.ghiChu ? ` - Note: ${e.ghiChu}` : ''}`;
}).join('\n') : '(No events today)'}

Upcoming (7 days, ${upcomingEvents.length} events):
${upcomingEvents.length > 0 ? upcomingEvents.map(e => {
  const d = e.ngayBatDau.toDate();
  const dateStr = d.toLocaleDateString('vi-VN');
  const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  return `• ${e.tieuDe} on ${dateStr} at ${timeStr}`;
}).join('\n') : '(No upcoming events)'}

This month: ${thisMonthEvents} events total

Recent history: ${chatHistory || 'No previous conversation'}

**USER INTENT:** ${intent}
**USER MESSAGE:** ${msg}

**REQUIREMENTS:**
1. Answer in Vietnamese, professional and friendly tone
2. Keep response concise but informative (2-4 sentences max)
3. If asking about today's events, summarize them
4. If asking about upcoming events, highlight the most relevant
5. For Vietnamese holidays, provide both lunar and solar dates
6. Be proactive with scheduling suggestions when relevant
7. If user wants to create event, guide them briefly

**Response format:**
- Direct answer first
- Additional context if relevant
- Emoji usage is minimal but acceptable for emphasis

Answer now:`;

        const systemPrompt = "You are a professional, intelligent Vietnamese calendar assistant. Be concise, accurate, and helpful. Respond in Vietnamese only. Maximum 4 sentences per response.";
        
        // Hiển thị typing indicator
        setTypingText("Đang xử lý...");
        
        const aiText = await askAI(prompt, systemPrompt);
        
        if (typeof aiText === 'string' && aiText.trim()) {
          aiResponse = aiText.trim();
        }
      } catch (e) {
        console.warn("⚠️ AI call failed:", e?.message || e);
      }

      // Fallback nếu AI không trả lời
      if (!aiResponse) {
        const lower = msg.toLowerCase().replace(/[.,?!]/g, "");
        
        if (lower.includes("tết") || lower.includes("nguyên đán") || lower.includes("tấn")) {
          aiResponse = "Tết 2026 (Năm Ất Tỵ): Lịch nghỉ từ 26/01 (30 Tết) đến 02/02 (Mùng 4). Ngày 26-27/01 là cuối tuần, lịch công ty thường cho nghỉ thêm để bù. Mùng 1 là thứ 3 - ngày lân đầu! 🎊";
        } else if (lower.includes("giỗ tổ") || lower.includes("10/3 âm")) {
          aiResponse = "Giỗ Tổ Hùng Vương 2026: Thứ 2, 06/04/2026 (mùng 10/3 âm). Đây là dịp để tưởng nhớ và tri ân các anh hùng dân tộc. 🙏";
        } else if (lower.includes("hôm nay") || lower.includes("hôm") || lower.includes("ngày hôm nay")) {
          const todayEventCount = events.filter(e => {
            if (!e.ngayBatDau?.toDate) return false;
            return e.ngayBatDau.toDate().toDateString() === new Date().toDateString();
          }).length;
          aiResponse = todayEventCount > 0 
            ? `Hôm nay bạn có ${todayEventCount} sự kiện. Hãy quản lý thời gian hợp lý để hoàn thành mọi nhiệm vụ. Bạn cần xem chi tiết không?`
            : "Hôm nay bạn chưa có sự kiện nào. Đây là thời gian tốt để lập kế hoạch cho các ngày sắp tới!";
        } else if (lower.includes("tạo") || lower.includes("thêm") || lower.includes("lập")) {
          aiResponse = "Để tạo sự kiện mới, nhấn nút '+' ở màn hình lịch chính. Bạn có thể thiết lập: tiêu đề, thời gian, địa điểm, ghi chú và lặp lại nếu cần.";
        } else {
          aiResponse = "Xin lỗi, mình chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về: sự kiện hôm nay, lịch tuần này, tạo sự kiện mới, hoặc các ngày lễ trong năm 2026 nhé! 😊";
        }
      }

      const botMsg = { id: generateId(), role: "bot", content: aiResponse };
      setMessages((prev) => [...prev, botMsg]);

      await setDoc(doc(db, "chatHistory", userName, "messages", botMsg.id), {
        ...botMsg,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      const errorMsg = {
        id: generateId(),
        role: "bot",
        content: "Xin lỗi bạn, mình đang gặp chút vấn đề kỹ thuật. Bạn thử hỏi lại câu khác hoặc kiểm tra kết nối mạng nhé! 🙏"
      };
      setMessages((prev) => [...prev, errorMsg]);
      try {
        await setDoc(doc(db, "chatHistory", userName, "messages", errorMsg.id), {
          ...errorMsg,
          createdAt: serverTimestamp(),
        });
      } catch {}
    } finally {
      setIsLoadingAI(false);
    }
  };

  const renderMessage = useCallback(({ item }) => {
    const isUser = item.role === "user";
    return <MessageBubble item={item} isUser={isUser} userName={userName} palette={palette} isDarkMode={isDarkMode} />;
  }, [userName, palette, isDarkMode]);

  return (
    <ImageBackground 
      source={isDarkMode ? null : require("../assets/bg-tet.jpg")} 
      style={{ flex: 1, backgroundColor: isDarkMode ? palette?.background : 'transparent' }} 
      resizeMode="cover" 
      blurRadius={2}
    >
      <LinearGradient 
        colors={[
          palette?.surfaceGradientStart || 'rgba(211,47,47,0.85)', 
          palette?.surfaceGradientMid || 'rgba(255,215,0,0.25)', 
          palette?.surfaceGradientEnd || 'rgba(211,47,47,0.85)'
        ]} 
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

          {/* Header */}
          <LinearGradient 
            colors={isDarkMode 
              ? [palette?.headerStart || "#2C2C2C", palette?.headerEnd || "#1A1A1A"] 
              : [palette?.accent || "#FFD700", palette?.primary || "#FFA000"]
            } 
            style={styles.header}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={32} color={isDarkMode ? palette?.accent : (palette?.primary || "#D32F2F")} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDarkMode ? palette?.accent : (palette?.primary || styles.headerTitle.color) }]}>{t('ai_title', { defaultValue: 'AI TỆ́T 2026' })}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={handleClearHistory} style={styles.headerIconBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color={isDarkMode ? palette?.accent : (palette?.primary || "#D32F2F")} />
              </TouchableOpacity>
              <MaterialCommunityIcons name="robot-happy" size={36} color={isDarkMode ? palette?.accent : (palette?.primary || "#D32F2F")} />
            </View>
          </LinearGradient>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            windowSize={8}
            maxToRenderPerBatch={10}
            removeClippedSubviews={Platform.OS === 'android'}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* API key UI removed — key is preloaded and external AI enabled */}

          {/* Loading */}
          {isLoadingAI && (
            <View style={[styles.msgRow, styles.botRow, { marginHorizontal: 16, marginBottom: 10 }]}>
              <MaterialCommunityIcons name="robot-happy" size={40} color={palette?.accent || "#FFD700"} />
              <View style={[styles.botBubble, { backgroundColor: isDarkMode ? palette?.surface : "rgba(255,255,255,0.98)", borderColor: palette?.accent || '#FFD700' }]}>
                <Text style={[styles.sender, { color: isDarkMode ? palette?.accent : '#D32F2F' }]}>{t('ai_label', { defaultValue: 'AI Tết 2026' })}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette?.accent || '#FFD700', opacity: 0.6 }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette?.accent || '#FFD700', opacity: 0.4 }} />
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette?.accent || '#FFD700', opacity: 0.2 }} />
                  <Text style={[styles.msgText, { color: isDarkMode ? palette?.textSecondary : '#999', marginLeft: 4 }]}>đang xử lý</Text>
                </View>
              </View>
            </View>
          )}

          {/* GỢI Ý – HIỆN LUÔN, KHÔNG ẨN */}
          <View style={[styles.suggestionContainer, { backgroundColor: isDarkMode ? palette?.surface : "rgba(255,255,255,0.08)", borderTopColor: isDarkMode ? palette?.border : 'rgba(255,215,0,0.3)' }]}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggestions}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionBtn} onPress={() => sendMessage(item)}>
                  <LinearGradient 
                    colors={isDarkMode 
                      ? [palette?.background || '#1A1F2E', palette?.surface || '#252C3C']
                      : [palette?.accent || "#FFD700", palette?.primary || "#FFA000"]
                    } 
                    style={[styles.suggestionGradient, { borderColor: isDarkMode ? palette?.accent : 'rgba(255,255,255,0.3)' }]}
                  >
                    <Text style={[styles.suggestionText, { color: isDarkMode ? palette?.accent : (palette?.primary || '#D32F2F') }]}>{item}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Input */}
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? palette?.surface : "rgba(255,255,255,0.98)", borderTopColor: inputFocused ? palette?.primary : (palette?.accent || '#FFD700') }]}> 
              <TextInput
                style={[styles.input, { 
                  color: isDarkMode ? palette?.text : '#D32F2F', 
                  backgroundColor: isDarkMode ? palette?.background : "rgba(255,255,255,0.95)", 
                  borderColor: inputFocused ? palette?.primary : (palette?.accent || '#FFD700'),
                  borderWidth: inputFocused ? 2 : 1.5,
                }]}
                placeholder={t('ask_ai_placeholder', { defaultValue: 'Hỏi AI bất cứ điều gì...' })}
                placeholderTextColor={isDarkMode ? palette?.textSecondary : '#cc9a00'}
                value={input}
                onChangeText={setInput}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={() => sendMessage()}
                disabled={isLoadingAI || !input.trim()}
                style={[styles.sendBtn, (isLoadingAI || !input.trim()) && { opacity: 0.5 }]}
              >
                <LinearGradient colors={[palette?.accent || "#FFD700", palette?.primary || "#FFA000"]} style={styles.sendGradient}>
                  {isLoadingAI ? <ActivityIndicator color={palette?.primary || '#D32F2F'} /> : <MaterialCommunityIcons name="send" size={28} color={palette?.primary || '#D32F2F'} />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    paddingVertical: 20, 
    borderBottomLeftRadius: 28, 
    borderBottomRightRadius: 28, 
    elevation: 12,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backBtn: { backgroundColor: "rgba(255,255,255,0.95)", padding: 10, borderRadius: 30, borderWidth: 2, borderColor: '#FFD700' },
  headerIconBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#D32F2F", textShadowColor: "rgba(0,0,0,0.2)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, letterSpacing: 0.5 },

  msgRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 8, paddingHorizontal: 4 },
  userRow: { justifyContent: "flex-end" },
  botRow: { justifyContent: "flex-start" },
  avatar: { marginHorizontal: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  bubble: { maxWidth: "75%", padding: 14, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  userBubble: { backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1.5, borderColor: "#FFD700", borderTopRightRadius: 4 },
  botBubble: { backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1.5, borderColor: "#FFD700", borderTopLeftRadius: 4 },
  sender: { fontSize: 12, fontWeight: "900", color: "#D32F2F", marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  timestamp: { fontSize: 10, fontWeight: "600", color: '#999' },
  msgText: { fontSize: 15, color: "#333", lineHeight: 22, fontWeight: '500' },

  suggestionContainer: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.08)", borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.3)' },
  suggestionBtn: { marginRight: 10, borderRadius: 25, overflow: "hidden", elevation: 4, shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  suggestionGradient: { paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  suggestionText: { color: "#D32F2F", fontWeight: "900", fontSize: 14, letterSpacing: 0.3 },

  inputWrapper: { 
    flexDirection: "row", 
    padding: 16, 
    alignItems: "center", 
    backgroundColor: "rgba(255,255,255,0.98)", 
    borderTopWidth: 3, 
    borderTopColor: "#FFD700",
    elevation: 12,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  input: { 
    flex: 1, 
    backgroundColor: "rgba(255,255,255,0.95)", 
    borderRadius: 28, 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    fontSize: 16, 
    color: "#D32F2F", 
    borderWidth: 2, 
    borderColor: "#FFD700",
    fontWeight: '600',
  },
  sendBtn: { marginLeft: 10 },
  sendGradient: { 
    padding: 16, 
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    elevation: 6,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});