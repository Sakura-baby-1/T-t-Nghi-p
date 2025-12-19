// utils/performanceConfig.js - Cấu hình tối ưu hiệu suất cho production

// Tắt console logs trong production để tăng tốc độ
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Debounce helper cho search và input
export const debounce = (func, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle helper cho scroll events
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Pagination config
export const PAGINATION = {
  EVENTS_PER_PAGE: 50,
  INITIAL_LOAD: 30,
  SCROLL_THRESHOLD: 0.8,
};

// Cache config
export const CACHE_DURATION = {
  EVENTS: 5 * 60 * 1000, // 5 phút
  USER_DATA: 10 * 60 * 1000, // 10 phút
  SUGGESTIONS: 15 * 60 * 1000, // 15 phút
};

export default {
  debounce,
  throttle,
  PAGINATION,
  CACHE_DURATION,
};
