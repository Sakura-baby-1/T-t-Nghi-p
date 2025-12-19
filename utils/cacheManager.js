// utils/cacheManager.js - Quản lý cache để tối ưu queries
// Tránh gọi Firestore liên tục cho cùng 1 query

class CacheManager {
  constructor() {
    this.cache = {};
    this.timers = {};
    this.CACHE_DURATION = 30000; // 30s cache mặc định
  }

  // Lưu data vào cache với TTL
  set(key, data, duration = this.CACHE_DURATION) {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      duration,
    };

    // Clear timer cũ nếu có
    if (this.timers[key]) clearTimeout(this.timers[key]);

    // Tự động xóa sau duration
    this.timers[key] = setTimeout(() => {
      delete this.cache[key];
      delete this.timers[key];
    }, duration);
  }

  // Lấy data từ cache (return null nếu hết hạn)
  get(key) {
    if (!this.cache[key]) return null;

    const { data, timestamp, duration } = this.cache[key];
    if (Date.now() - timestamp > duration) {
      delete this.cache[key];
      clearTimeout(this.timers[key]);
      delete this.timers[key];
      return null;
    }

    return data;
  }

  // Kiểm tra cache tồn tại
  has(key) {
    return this.get(key) !== null;
  }

  // Xóa cache
  invalidate(key) {
    delete this.cache[key];
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
      delete this.timers[key];
    }
  }

  // Xóa hết cache
  clear() {
    Object.keys(this.timers).forEach(key => clearTimeout(this.timers[key]));
    this.cache = {};
    this.timers = {};
  }

  // Refresh cache - xóa timestamp để force refresh lần sau
  refresh(key) {
    if (this.cache[key]) {
      this.cache[key].timestamp = 0; // Buộc hết hạn
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Cache keys
export const CACHE_KEYS = {
  USER_EVENTS: 'user_events',
  USER_PROFILE: 'user_profile',
  CALENDAR_COLORS: 'calendar_colors',
  TITLE_SUGGESTIONS: 'title_suggestions',
  FREE_SLOTS: 'free_slots',
};

export default cacheManager;
