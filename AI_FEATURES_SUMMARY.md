# 🤖 TỔNG HỢP CÁC CHỨC NĂNG AI TRONG PROJECT

## 📊 Overview
Project sử dụng **Gemini AI, Groq AI** để cung cấp 6 chức năng AI chính, giúp người dùng quản lý lịch thông minh.

---

## 🎯 CHỈ TIÊU XẾP LỊCH AI THÔNG MINH
**File:** `EventsCalendarScreen.js` → Function: `performAiScheduling()`

### Mô Tả
- Phân tích tất cả sự kiện hiện tại
- Xếp lại theo thứ tự ưu tiên tối ưu
- Tránh trùng giờ, cân bằng công việc trong ngày

### Tiêu Chí Xếp Lịch (Priority)
| Priority | Loại Lịch | Mô Tả | Ưu Tiên |
|----------|-----------|-------|--------|
| 1 | 📚 Học tập (Study) | Học tập, buổi học, ôn thi | ⭐⭐⭐⭐⭐ |
| 2 | 💼 Công việc (Work) | Công việc, họp, email | ⭐⭐⭐⭐ |
| 3 | 💪 Sức khỏe (Health) | Thể dục, kiểm tra sức khỏe | ⭐⭐⭐ |
| 4 | 🏠 Gia đình (Family) | Gia đình, sinh nhật | ⭐⭐ |
| 5 | ❤️ Cá nhân (Personal) | Cá nhân, hoạt động riêng | ⭐⭐ |
| 6 | 💡 Dự án (Project) | Dự án, sáng tạo | ⭐ |
| 7 | 💰 Tài chính (Finance) | Ngân sách, thanh toán | ⭐ |
| 8 | 🎉 Sự kiện xã hội (Social) | Tiệc, gặp bạn | ⭐ |
| 9 | ✈️ Du lịch (Travel) | Du lịch, chuyến đi | ⭐ |
| 10 | 🎨 Sở thích (Hobby) | Sở thích, giải trí | ⭐ |

### Nguyên Tắc Xếp
1. **Ưu tiên loại lịch** - Priority thấp = quan trọng hơn
2. **Sắp xếp theo ngày** - Cùng ngày → sự kiện quan trọng lên trước
3. **Tránh trùng giờ** - Ưu tiên sự kiện quan trọng hơn
4. **Tối ưu thời gian** - Sắp xếp hợp lý trong ngày, không nhảy múi giờ

### Cách Sử Dụng
```
EventsCalendarScreen → Menu FAB → "AI xếp lịch"
→ Xác nhận modal → AI phân tích → Cập nhật lịch
```

---

## 🔔 GỢI Ý THÔNG BÁO TỰ ĐỘNG
**File:** `NotificationScreen.js` → Function: `suggestReminderAI(event)`

### Mô Tả
- AI phân tích loại sự kiện
- Gợi ý thời gian nhắc tối ưu
- Hỗ trợ người dùng chọn hoặc tự động áp dụng

### Tiêu Chí Gợi Ý

| Loại Sự Kiện | Gợi Ý | Lý Do |
|--------------|-------|-------|
| 📅 Cả ngày | **8 giờ** | Nhắc vào sáng hôm đó |
| ⏰ Gần (<30 phút) | **5 phút** | Thời gian còn lại quá ít |
| 🔴 Sự kiện quan trọng | **1h - 2h** | Họp, Deadline, Nộp bài |
| (Họp, Deadline, Nộp bài) | | Để có thời gian chuẩn bị |
| 📝 Sự kiện thường | **30 phút** | Mặc định |

### Các Tùy Chọn Thông Báo
- ❌ Không thông báo
- ⏱️ 1 phút, 5 phút, 10 phút trước
- ⏱️ 30 phút, 1 giờ, 2 giờ trước
- 📅 1 ngày trước
- ✏️ Tùy chỉnh (nhập số phút)

### Cách Sử Dụng
```
Thêm/Sửa sự kiện → Chọn "Thông báo"
→ AI gợi ý tự động
→ Chấp nhận gợi ý hoặc chọn thủ công
```

---

## 💬 AI CHAT - TRỢ LÝ TƯƠNG TÁC
**File:** `AIChatScreen.js` → Function: `askAI(prompt, system)`

### Mô Tả
- Chat trực tiếp với AI Gemini
- Hỏi đáp về lịch, sự kiện, tư vấn
- Gợi ý Tết 2026 được duy trì 100%

### Chức Năng
- 💬 Nhắn tin tự do
- 📋 Lịch sử trò chuyện lưu Firestore
- 🎄 10 gợi ý Tết 2026 luôn hiển thị
- 📱 Hiển thị tên + avatar + timestamp

### 10 Gợi Ý Tết 2026
1. "Lên lịch mua sắm Tết"
2. "Gợi ý du lịch dịp Tết"
3. "Kế hoạch ăn mừng Tết"
4. "Chuẩn bị nhà cửa cho Tết"
5. "Gọi điện thăm hỏi người thân"
6. "Chuẩn bị lì xì cho con em"
7. "Đặt vé máy bay Tết sớm"
8. "Lên danh sách quà tặng Tết"
9. "Thanh lọc tài chính trước Tết"
10. "Lên kế hoạch từ thiện dịp Tết"

### Cách Sử Dụng
```
Tab "AI Chat" → Nhập câu hỏi
→ AI trả lời
→ Có thể click gợi ý để hỏi nhanh
```

---

## 📝 GỢI Ý TIÊU ĐỀ SỰ KIỆN TỰ ĐỘNG
**File:** `AddEventScreen.js` → Function: `buildCategorizedTitleSuggestions(events)`

### Mô Tả
- Phân tích sự kiện lịch sử
- Gợi ý tiêu đề phổ biến theo loại lịch
- Tự động thay đổi loại lịch khi chọn gợi ý

### Logic
1. **Phân tích sự kiện cũ** - Tổng hợp tiêu đề đã tạo
2. **Xếp hạng theo tần suất** - Tiêu đề dùng nhiều lên trước
3. **Fallback mặc định** - Luôn có gợi ý dự phòng nếu không có lịch sử

### Gợi Ý Mặc Định Theo Loại Lịch

| Loại Lịch | Gợi Ý Tiêu Đề |
|-----------|---------------|
| 📚 Học tập | Review bài tập, Ôn thi, Tham gia lớp học |
| 💼 Công việc | Họp công việc, Email quan trọng, Deadline |
| 💪 Sức khỏe | Tập thể dục, Yoga, Kiểm tra sức khỏe |
| 🏠 Gia đình | Ăn cơm chung, Sinh nhật, Đi chơi gia đình |
| ❤️ Cá nhân | Đọc sách, Ngủ ngon, Thư giãn |
| 💡 Dự án | Review tiến độ, Triển khai tính năng, Fix bug |
| 💰 Tài chính | Tổng kết chi tiêu, Lập ngân sách, Tiết kiệm |
| 🎉 Xã hội | Gặp bạn, Đi ăn tối, Workshop |
| ✈️ Du lịch | Lên kế hoạch, Đặt phòng, Mua vé |
| 🎨 Sở thích | Đọc sách, Chơi game, Vẽ tranh |

### Cách Sử Dụng
```
Thêm sự kiện → Chọn loại lịch
→ Gợi ý tiêu đề hiện tự động
→ Click chọn → Tiêu đề + Loại lịch cập nhật
```

---

## ⏰ GỢI Ý SLOT THỜI GIAN TRỐNG
**File:** `AddEventScreen.js` → Function: `goiYThoiGianTrong()` + `suggestFreeSlotAI()`

### Mô Tả
- Tìm kiếm khoảng thời gian trống trong ngày
- Gợi ý slot phù hợp với thời lượng cần
- Ưu tiên slot gần thời gian hiện tại

### Logic Gợi Ý
1. **Lấy tất cả sự kiện hôm nay** - Query Firestore
2. **Tính toán slot trống** - Tìm các khoảng không có sự kiện
3. **Sắp xếp ưu tiên**:
   - Slot gần thời gian hiện tại nhất
   - Nếu không có, chọn slot dài nhất
4. **Lọc thời lượng** - Giảm yêu cầu nếu không đủ slot

### Cache
- **Lưu cache 2 phút** - Tránh query lặp lại
- Cache Key: `FREE_SLOTS_${ngayBatDau}`

### Cách Sử Dụng
```
Thêm sự kiện → Nhập "Thời lượng"
→ Click "Gợi ý thời gian trống"
→ Xem danh sách slot
→ Chọn slot → Cập nhật giờ bắt đầu/kết thúc
```

---

## 📊 PHÂN TÍCH & GỢI Ý BÁO CÁO
**File:** `ReportScreen.js` → Function: `askAI(prompt, system)`

### Mô Tả
- Phân tích thống kê sự kiện
- Tạo nhận xét và gợi ý từ AI
- Hiển thị xu hướng, mẹo cải thiện

### Loại Báo Cáo
- 📈 **Thống kê tuần** - Số sự kiện, phân bố theo loại
- 📊 **Thống kê tháng** - Xu hướng dài hạn
- 📝 **Thống kê toàn bộ** - Tổng hợp toàn thời gian

### AI Phân Tích
- Số sự kiện theo loại lịch
- Thời gian trung bình per loại
- Lô Gợi ý cải thiện, cân bằng
- Ngành hàng bị bỏ qua

### Cách Sử Dụng
```
Tab "Báo Cáo" → Chọn khoảng thời gian
→ Click "Phân tích bằng AI"
→ Xem gợi ý và mẹo cải thiện
```

---

## 🔌 AI BACKENDS ĐƯỢC HỖ TRỢ

### Ưu Tiên Sử Dụng
1. **Groq AI** (Thử trước)
   - Model: `llama-3.1-8b-instant`
   - Nhanh, ổn định, giá rẻ

2. **Google Gemini** (Fallback)
   - 8 API Keys quay vòng tránh quota
   - Model: `gemini-pro-latest`
   - Tự động chuyển key khi hết quota

3. **OpenAI** (Backup)
   - Model: `gpt-3.5-turbo`

4. **Monica AI** (Fallback cuối)
   - Model: `gpt-4o`

### Quản Lý Quota
```javascript
// Xoay vòng API keys
rotateGeminiKey()

// Reset keys hết quota
resetExhaustedKeys()

// Set custom key
setCustomGeminiKey("key-mới")
```

---

## 🎯 CÁC HÀNG CHUYÊN BIỆT CÓ SẴN

### File: `utils/ai.js`

| Hàm | Mục Đích | Return |
|-----|---------|--------|
| `askAI(prompt, system)` | Gọi AI chủ lực (Groq → Gemini) | String |
| `askGemini(prompt, system)` | Gọi Gemini trực tiếp | String |
| `askGroq(prompt, system)` | Gọi Groq trực tiếp | String |
| `askOpenAI(prompt, system)` | Gọi OpenAI | String |
| `askMonica(prompt, system)` | Gọi Monica AI | String |
| `smartScheduleAI(events)` | Xếp lịch thông minh | Array<Event> |
| `suggestFreeSlotAI(events, slots, duration)` | Gợi ý slot trống | {start, end} |
| `suggestReminderAI(event)` | Gợi ý thông báo | "5m\|10m\|30m\|1h\|2h\|1d" |
| `rotateGeminiKey()` | Chuyển sang Gemini key tiếp | void |
| `resetExhaustedKeys()` | Reset keys hết quota | void |
| `setCustomGeminiKey(key)` | Set Gemini key custom | void |

---

## 📊 TỔNG THỐNG KÊ

| Chức Năng | Vị Trí | Loại | Đầu Vào | Đầu Ra |
|-----------|--------|------|---------|--------|
| Xếp Lịch AI | EventsCalendarScreen | Tự động + Click | Events[] | Events[] (xếp lại) |
| Gợi Ý Thông Báo | NotificationScreen | Tự động | Event | "5m", "1h", etc |
| AI Chat | AIChatScreen | Chat tự do | Prompt | Message |
| Gợi Ý Tiêu Đề | AddEventScreen | Hiển thị tự động | SelectedCalendar | String[] |
| Slot Thời Gian | AddEventScreen | Click | Duration | Slot[] |
| Báo Cáo AI | ReportScreen | Click | Period | Narrative + Tips[] |

---

## 🚀 HIỆU NĂNG & CACHE

### Cache Được Sử Dụng
| Loại | TTL | Key Pattern |
|------|-----|------------|
| Title Suggestions | 5 phút | `TITLE_SUGGESTIONS_{userId}` |
| Free Slots | 2 phút | `FREE_SLOTS_{dateString}` |
| Chat Messages | Infinity | `CHAT_HISTORY_{userId}` |

### Optimization
- ✅ Cache aggressively để tránh query lặp
- ✅ Xoay vòng API keys tránh quota
- ✅ Fallback chain (Groq → Gemini → OpenAI → Monica)
- ✅ Lazy loading UI
- ✅ Memoized components (React.memo)

---

## 🎓 HƯỚNG PHÁT TRIỂN

### Có thể thêm:
1. **Gợi ý tối ưu hóa** - Dựa trên patterns từ lịch sử
2. **Tự động scheduling** - Tạo events từ AI suggestions
3. **Análisis thời tiết** - Tích hợp dự báo thời tiết
4. **Dự đoán deadline** - Phân tích và cảnh báo deadline sắp đến
5. **Smart notifications** - Thông báo đa chiều dựa trên context
6. **Analytics dashboard** - Dashboard phân tích chi tiết

---

## 📝 GHI CHÚ

- Tất cả chức năng AI đều có fallback xử lý lỗi
- Không có thông báo lỗi "nghe" được nếu AI fail - user sẽ nhận fallback mặc định
- Cache được tự động clear khi dữ liệu thay đổi
- Tất cả operations có optimistic update + real-time sync

---

**Cập nhật:** 15/12/2025
**Version:** 1.0
**Status:** ✅ Production Ready
