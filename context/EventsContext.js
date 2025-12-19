// context/EventsContext.js - Global Events Data Management
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

const EventsContext = createContext();

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within EventsProvider");
  }
  return context;
}

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse date helper
  const parseDate = (v) => {
    if (!v) return null;
    if (typeof v === "string") return new Date(v);
    if (v instanceof Date) return v;
    if (v.toDate) return v.toDate();
    if (v.seconds) return new Date(v.seconds * 1000);
    return null;
  };

  // Load events from Firestore when user auth state changes
  useEffect(() => {
    let fsUnsubscribe = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      // Clean previous Firestore listener when user changes
      if (fsUnsubscribe) {
        try { fsUnsubscribe(); } catch {}
        fsUnsubscribe = null;
      }

      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      // GIỚI HẠN query để tăng tốc - chỉ lấy events trong 6 tháng gần nhất
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const q = query(
        collection(db, "events"), 
        where("userId", "==", user.uid)
        // Có thể thêm orderBy và limit nếu cần
        // where("ngayBatDau", ">=", sixMonthsAgo)
      );

      fsUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            const docs = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                startDate: parseDate(data.ngayBatDau || data.startTime || data.start),
                endDate: parseDate(data.ngayKetThuc || data.endTime || data.end),
                type: data.lich?.name || data.type || "Khác",
                color: data.lich?.color || "#D32F2F",
              };
            });
            setEvents(docs);
            setError(null);
          } catch (err) {
            console.error("Error processing events:", err);
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error("Error loading events:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    });

    return () => {
      try { authUnsub(); } catch {}
      if (fsUnsubscribe) {
        try { fsUnsubscribe(); } catch {}
      }
    };
  }, []);

  // Computed statistics - chỉ tính lại khi events thay đổi
  const statistics = useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalEvents: 0,
        thisWeekEvents: 0,
        thisMonthEvents: 0,
        todayEvents: 0,
        upcomingEvents: 0,
        completedEvents: 0,
        typeDistribution: {},
        topType: "N/A",
      };
    }

    const now = new Date();
    
    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    let thisWeekCount = 0;
    let thisMonthCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    const typeCounts = {};

    events.forEach((ev) => {
      if (!ev.startDate) return;

      // Week
      if (ev.startDate >= startOfWeek) thisWeekCount++;
      
      // Month
      if (ev.startDate >= startOfMonth) thisMonthCount++;
      
      // Today
      if (ev.startDate >= startOfToday && ev.startDate <= endOfToday) {
        todayCount++;
      }
      
      // Upcoming
      if (ev.startDate > now) upcomingCount++;
      
      // Completed (events in the past)
      if (ev.startDate < now) completedCount++;

      // Type distribution
      const type = ev.type || "Khác";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const topType =
      Object.keys(typeCounts).length > 0
        ? Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0]
        : "N/A";

    return {
      totalEvents: events.length,
      thisWeekEvents: thisWeekCount,
      thisMonthEvents: thisMonthCount,
      todayEvents: todayCount,
      upcomingEvents: upcomingCount,
      completedEvents: completedCount,
      typeDistribution: typeCounts,
      topType,
    };
  }, [events]);

  const value = {
    events,
    loading,
    error,
    statistics,
    parseDate,
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
