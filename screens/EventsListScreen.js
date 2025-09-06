// screens/EventsListScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Platform 
} from 'react-native';
import { collection, query, where, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

export default function EventsListScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();

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

      // Sắp xếp: sự kiện mới thêm lên đầu
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

  const renderItem = ({ item }) => {
    const bgColor = item.status === 'conflict' ? (isDarkMode ? '#5c2b2b' : '#ffebee') : (isDarkMode ? '#2b3a4d' : '#e3f2fd');
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.item,
          { 
            borderLeftColor: item.lich?.color || '#7b61ff', 
            backgroundColor: isSelected ? (isDarkMode ? '#2e7d32' : '#c8e6c9') : bgColor 
          }
        ]}
        onPress={() => selectedIds.length > 0 ? toggleSelect(item.id) : navigation.navigate('EventScreen', { eventId: item.id })}
        onLongPress={() => toggleSelect(item.id)}
      >
        <View style={styles.itemHeader}>
          <Ionicons name="calendar-outline" size={18} color={item.lich?.color || '#7b61ff'} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#333' }]}>{item.tieuDe || "Không có tiêu đề"}</Text>
          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#4caf50" style={{ marginLeft: 8 }} />}
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailText, { color: isDarkMode ? '#ccc' : '#555' }]}>
            {item.caNgay ? `📅 ${t("allDay")}` : `🕒 ${item.start.toLocaleString()} - ${item.end.toLocaleString()}`}
          </Text>
          {item.lapLai && item.lapLai !== 'None' && <MaterialIcons name="repeat" size={16} color={isDarkMode ? "#ccc" : "#555"} style={{ marginLeft: 6 }} />}
          {item.thongBao && item.thongBao !== 'None' && <Ionicons name="notifications-outline" size={16} color={isDarkMode ? "#ccc" : "#555"} style={{ marginLeft: 4 }} />}
        </View>

        {item.diaDiem ? <Text style={[styles.location, { color: isDarkMode ? '#ccc' : '#555' }]}>📍 {item.diaDiem}</Text> : null}
        {item.ghiChu ? <Text style={[styles.note, { color: isDarkMode ? '#bbb' : '#555' }]}>{item.ghiChu.length > 50 ? item.ghiChu.slice(0,50)+'…' : item.ghiChu}</Text> : null}

        <View style={styles.actionRow}>
          {selectedIds.length === 0 && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? '#121212' : '#f2f2f2' }}>
      {selectedIds.length > 0 && (
        <TouchableOpacity style={styles.deleteSelectedButton} onPress={handleDeleteSelected}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {t("deleteManyButton", { count: selectedIds.length })}
          </Text>
        </TouchableOpacity>
      )}
      {events.length === 0 ? (
        <Text style={{ textAlign: 'center', marginTop: 20, color: isDarkMode ? '#aaa' : '#555', fontSize: 16 }}>
          {t("noEvents")}
        </Text>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: Platform.OS === 'ios' ? 160 : 120,
            padding: 12,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderLeftWidth: 5,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { fontWeight: '700', fontSize: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  detailText: { fontSize: 14 },
  location: { fontSize: 14, marginBottom: 4 },
  note: { fontSize: 13, fontStyle: 'italic', marginBottom: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 },
  deleteButton: {
    backgroundColor: '#F44336',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSelectedButton: {
    backgroundColor: '#f44336',
    padding: 12,
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
