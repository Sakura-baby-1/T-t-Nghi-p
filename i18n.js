// i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  vi: {
    translation: {
      // Global
      home: "Trang chủ",
      events: "Sự kiện",
      calendar: "Lịch",
      settings: "Cài đặt",
      profile: "Thông tin cá nhân",
      notify: "Thông báo",
      darkMode: "Chế độ tối",
      language: "Ngôn ngữ",
      logout: "Đăng xuất",
      confirmLogout: "Bạn có chắc muốn đăng xuất không?",
      cancel: "Hủy",
      save: "Lưu",
      success: "Thành công",
      error: "Lỗi",
      close: "Đóng",

      // Profile
      changeAvatar: "Đổi ảnh đại diện",
      name: "Tên",
      email: "Email",
      newPassword: "Mật khẩu mới",
      newPasswordPlaceholder: "Mật khẩu mới (nếu muốn đổi)",
      saveChanges: "Lưu thay đổi",
      deleteAccount: "Xóa tài khoản",
      profileUpdated: "Thông tin đã được cập nhật",
      deleteAccountConfirm: "Bạn có chắc muốn xóa tài khoản? Hành động này không thể hoàn tác.",

      // Events
      addEvent: "Thêm sự kiện",
      editEvent: "Chỉnh sửa sự kiện",
      eventTitle: "Tiêu đề sự kiện",
      allDay: "Cả ngày",
      start: "Bắt đầu",
      end: "Kết thúc",
      repeat: "Lặp lại",
      notification: "Thông báo",
      multiDays: "Chọn nhiều ngày",
      location: "Địa điểm",
      url: "URL",
      note: "Ghi chú",
      none: "Không",
      type: "Loại sự kiện",
      eventSaved: "Sự kiện đã được lưu!",
      titleRequired: "Tiêu đề không được để trống!",
      endAfterStart: "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!",
      cannotSaveEvent: "Không thể lưu sự kiện!",

      // Event types
      work: "Công việc",
      personal: "Cá nhân",

      // Repeat options
      never: "Không bao giờ",
      daily: "Hàng ngày",
      weekly: "Hàng tuần",
      monthly: "Hàng tháng",
      yearly: "Hàng năm",

      // Greeting
      goodMorning: "Chào buổi sáng",
      goodAfternoon: "Chào buổi trưa",
      goodEvening: "Chúc buổi tối vui vẻ",

      // Search & lists
      searchPlaceholder: "Tìm sự kiện theo chữ cái đầu...",
      notifications: "Thông báo hôm nay",
      noNotifications: "Không có sự kiện nào 🎉",
      quickActions: "Tác vụ nhanh",
      weeklyStats: "Thống kê tuần",
      weekEvents: "Sự kiện tuần này",
      pending: "Chưa hoàn thành",
      completed: "Hoàn thành",
      quote: "Trích dẫn hôm nay",
      eventList: "Danh sách sự kiện",

      // Delete events
      deleteEvent: "Xóa sự kiện",
      confirmDeleteOne: "Bạn có chắc muốn xóa sự kiện này?",
      confirmDeleteMany: "Bạn có chắc muốn xóa {{count}} sự kiện đã chọn?",
      deleteManyButton: "Xóa {{count}} sự kiện đã chọn",
      noEvents: "Chưa có sự kiện nào",

      // Notifications screen
      selectNotification: "Chọn thông báo",
      notificationPermission: "Ứng dụng cần quyền gửi thông báo",
      minBefore: "1 phút trước",
    minBefore: "5 phút trước",
      minBefore: "10 phút trước",
      minBefore: "30 phút trước",
      hourBefore: "1 giờ trước",
      hourBefore: "3 giờ trước",
      hourBefore: "7 giờ trước",
      dayBefore: "1 ngày trước",
      ongoing: "Đang diễn ra",
      remaining: "Còn lại",
      viewDetail: "Xem chi tiết",
      stopRingtone: "Dừng nhạc chuông",

      // MultiDays screen
      selectMultipleDays: "Chọn ngày bạn muốn",

      // Repeat screen
      repeatOptions: "Lặp lại",

      // Misc
      today: "Hôm nay",
      tomorrow: "Ngày mai",
    },
  },

  en: {
    translation: {
      home: "Home",
      events: "Events",
      calendar: "Calendar",
      settings: "Settings",
      profile: "Profile",
      notify: "Notifications",
      darkMode: "Dark Mode",
      language: "Language",
      logout: "Logout",
      confirmLogout: "Are you sure you want to log out?",
      cancel: "Cancel",
      save: "Save",
      success: "Success",
      error: "Error",
      close: "Close",

      // Profile
      changeAvatar: "Change Avatar",
      name: "Name",
      email: "Email",
      newPassword: "New Password",
      newPasswordPlaceholder: "New password (optional)",
      saveChanges: "Save Changes",
      deleteAccount: "Delete Account",
      profileUpdated: "Profile updated successfully",
      deleteAccountConfirm: "Are you sure you want to delete your account? This action cannot be undone.",

      // Events
      addEvent: "Add Event",
      editEvent: "Edit Event",
      eventTitle: "Event title",
      allDay: "All day",
      start: "Start",
      end: "End",
      repeat: "Repeat",
      notification: "Notification",
      multiDays: "Select multiple days",
      location: "Location",
      url: "URL",
      note: "Note",
      none: "None",
      type: "Event type",
      eventSaved: "Event saved!",
      titleRequired: "Title is required!",
      endAfterStart: "End date must be after start date!",
      cannotSaveEvent: "Cannot save event!",

      // Event types
      work: "Work",
      personal: "Personal",

      // Repeat options
      never: "Never",
      daily: "Daily",
      weekly: "Weekly",
      monthly: "Monthly",
      yearly: "Yearly",

      // Greeting
      goodMorning: "Good morning",
      goodAfternoon: "Good afternoon",
      goodEvening: "Good evening",

      // Search & lists
      searchPlaceholder: "Search event by first letter...",
      notifications: "Today's notifications",
      noNotifications: "No events 🎉",
      quickActions: "Quick actions",
      weeklyStats: "Weekly stats",
      weekEvents: "Week's events",
      pending: "Pending",
      completed: "Completed",
      quote: "Today's quote",
      eventList: "Event list",

      // Delete events
      deleteEvent: "Delete Event",
      confirmDeleteOne: "Are you sure you want to delete this event?",
      confirmDeleteMany: "Are you sure you want to delete {{count}} selected events?",
      deleteManyButton: "Delete {{count}} selected events",
      noEvents: "No events yet",

      // Notifications screen
      selectNotification: "Select notification",
      notificationPermission: "App needs notification permission",
      minBefore: "1 minute before",
      minBefore: "5 minutes before",
      minBefore: "10 minutes before",
      minBefore: "30 minutes before",
      hourBefore: "1 hour before",
      hourBefore: "3 hours before",
      hourBefore: "7 hours before",
      dayBefore: "1 day before",
      ongoing: "Ongoing",
      remaining: "Remaining",
      viewDetail: "View detail",
      stopRingtone: "Stop ringtone",

      // MultiDays screen
      selectMultipleDays: "Select the days",

      // Repeat screen
      repeatOptions: "Repeat options",

      // Misc
      today: "Today",
      tomorrow: "Tomorrow",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "vi",
  fallbackLng: "vi",
  interpolation: { escapeValue: false },
});

export default i18n;
