// screens/AdvancedCalendarChat.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  where
} from "firebase/firestore";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

// Chuẩn hóa input
const normalize = (str) =>
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Emoji priority
const prioritySymbol = (prio) => {
  switch(prio){
    case 1: return "⚡";
    case 2: return "⭐";
    case 3: return "🎉";
    default: return "";
  }
};

// Text color theo background
const getTextColor = (bgColor) => {
  if (!bgColor) return "#333";
  const c = bgColor.substring(1);
  const rgb = parseInt(c,16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;
  const luminance = (0.299*r + 0.587*g + 0.114*b)/255;
  return luminance > 0.5 ? "#000" : "#fff";
};

export default function AdvancedCalendarChat() {
  const navigation = useNavigation();
  const { isDarkMode, language } = useSettings();
  const { t, i18n } = useTranslation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [lastShownList, setLastShownList] = useState([]);
  const scrollRef = useRef();

  useEffect(()=>{
    i18n.changeLanguage(language);
  },[language]);

  const calendars = [
    { name: "Công việc", color: "#7b61ff", description: t("work") },
    { name: "Cá nhân", color: "#ff7043", description: t("personal") },
    { name: "Học tập", color: "#42a5f5", description: t("study") },
    { name: "Gia đình", color: "#66bb6a", description: t("family") },
    { name: "Sức khỏe", color: "#ef5350", description: t("health") },
    { name: "Du lịch", color: "#ffa726", description: t("travel") },
    { name: "Dự án", color: "#ab47bc", description: t("project") },
    { name: "Sự kiện xã hội", color: "#29b6f6", description: t("socialEvent") },
    { name: "Tài chính", color: "#26a69a", description: t("finance") },
    { name: "Hobby", color: "#ffca28", description: t("hobby") },
  ];

  const holidaysSample = [
    { name: t("tet"), date: "2025-01-29", priority: 1 },
    { name: t("gioToHungVuong"), date: "2025-04-21", priority: 2 },
    { name: t("quocTeLaoDong"), date: "2025-05-01", priority: 2 },
    { name: t("quocKhanhVN"), date: "2025-09-02", priority: 1 },
    { name: t("giangSinh"), date: "2025-12-25", priority: 3 },
  ];

  // Load chat history
  useEffect(() => {
    const q = query(collection(db, "chatHistory"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, snapshot => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Tra cứu event/holiday
  const getEventsOrHolidays = async (keyword) => {
    const lowerKeyword = normalize(keyword);
    const matchedCalendar = calendars.find(c => normalize(c.name).includes(lowerKeyword));

    // Tra cứu theo calendar
    if(matchedCalendar){
      const q = query(collection(db,"events"), where("calendar.name","==",matchedCalendar.name), orderBy("startDate","asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc=>doc.data());
    }

    // Tra cứu ngày lễ
    const dateMatch = lowerKeyword.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if(dateMatch){
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2])-1;
      const year = dateMatch[3]?parseInt(dateMatch[3]):new Date().getFullYear();

      const holidayMatch = holidaysSample.find(h=>{
        const d = new Date(h.date);
        return d.getDate()===day && d.getMonth()===month && d.getFullYear()===year;
      });
      if(holidayMatch) return [{
        title: holidayMatch.name,
        priority: holidayMatch.priority,
        startDate: holidayMatch.date,
        calendar:{name:t("holiday"), color:"#ff9800"},
        description:""
      }];
    }

    // Tra cứu tên event từ danh sách vừa show
    const matchedEvent = lastShownList.find(e=>normalize(e.title)===lowerKeyword);
    if(matchedEvent) return [matchedEvent];

    return [];
  };

  const handleSend = async () => {
    if(!input.trim()) return;
    const userMsg = {role:"user", content:input, timestamp:new Date()};
    setMessages(prev=>[...prev,userMsg]);
    await addDoc(collection(db,"chatHistory"),{role:"user",content:input,timestamp:serverTimestamp()});
    setInput("");

    let events = [];
    try{ events = await getEventsOrHolidays(input); } catch(e){console.error(e);}

    if(events.length===0){
      const botMsg = {role:"bot", content:t("noEventFound"), timestamp:new Date()};
      setMessages(prev=>[...prev,botMsg]);
      await addDoc(collection(db,"chatHistory"),botMsg);
      return;
    }

    const botMsg = {role:"bot", content:t("foundEvents"), events, timestamp:new Date()};
    setMessages(prev=>[...prev,botMsg]);
    await addDoc(collection(db,"chatHistory"),botMsg);

    setLastShownList(events);
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:isDarkMode?"#121212":"#f5f7fb"}}>
      <TouchableOpacity
        onPress={()=>navigation.goBack()}
        style={{padding:10, borderRadius:8, margin:10, backgroundColor:isDarkMode?"#8e44ad":"#7b61ff"}}
      >
        <Text style={{color:"#fff", fontWeight:"700"}}>← {t("back")}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1}}>
        <ScrollView ref={scrollRef} contentContainerStyle={{padding:16}} showsVerticalScrollIndicator={false}>
          {messages.map((msg,idx)=>(
            <View key={msg.id||idx} style={[styles.message, msg.role==="user"?styles.userMsg:styles.botMsg, {backgroundColor:msg.role==="user"? (isDarkMode?"#8e44ad":"#7b61ff") : (isDarkMode?"#1f1f1f":"#fff")}]}>
              {msg.events ? msg.events.map((e,i)=>(
                <View key={i} style={{backgroundColor:e.calendar.color,padding:8,borderRadius:10,marginVertical:2}}>
                  <Text style={{color:getTextColor(e.calendar.color), fontWeight:"600"}}>
                    {i+1}. {prioritySymbol(e.priority)} {e.title} ({new Date(e.startDate).toLocaleDateString(language)})
                  </Text>
                  {e.description ? <Text style={{color:getTextColor(e.calendar.color), marginTop:2}}>{e.description}</Text> : null}
                </View>
              )) : <Text style={{color:msg.role==="user"?"#fff":(isDarkMode?"#fff":"#333")}}>{msg.content}</Text>}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputContainer, {backgroundColor:isDarkMode?"#1f1f1f":"#fff"}]}>
          <TextInput 
            style={[styles.input,{backgroundColor:isDarkMode?"#333":"#f5f5f5", color:isDarkMode?"#fff":"#333"}]} 
            placeholder={t("typeMessage")} 
            placeholderTextColor={isDarkMode?"#aaa":"#888"}
            value={input} 
            onChangeText={setInput}
          />
          <LinearGradient colors={["#8e44ad","#7b61ff"]} start={[0,0]} end={[1,0]} style={styles.sendBtn}>
            <TouchableOpacity onPress={handleSend}>
              <Text style={{color:"#fff", fontWeight:"700"}}>{t("send")}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  message:{padding:12,borderRadius:12,marginBottom:10,maxWidth:"80%"},
  userMsg:{alignSelf:"flex-end"},
  botMsg:{alignSelf:"flex-start", borderWidth:1, borderColor:"#ccc"},
  inputContainer:{flexDirection:"row",padding:10,alignItems:"center",borderTopWidth:1,borderColor:"#ccc"},
  input:{flex:1,paddingHorizontal:12,paddingVertical:8,borderRadius:20,borderWidth:1,borderColor:"#ccc",marginRight:10},
  sendBtn:{paddingHorizontal:16,paddingVertical:10,borderRadius:20},
});
