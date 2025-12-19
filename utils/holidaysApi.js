// holidaysApi.js
// Hàm lấy ngày lễ Việt Nam từ Calendarific API
// Trả về tên ngày lễ bằng tiếng Việt (nếu có trong mapping)

const holidayTranslations = {
  "New Year's Day": "Tết Dương lịch",
  "Vietnamese New Year": "Tết Nguyên Đán",
  "Vietnamese New Year's Eve": "Giao thừa",
  "International Women's Day": "Ngày Quốc tế Phụ nữ",
  "Hung Kings Commemoration Day": "Giỗ Tổ Hùng Vương",
  "Reunification Day": "Ngày Giải phóng miền Nam",
  "International Workers' Day": "Quốc tế Lao động",
  "Independence Day": "Quốc khánh",
  "Christmas Day": "Lễ Giáng Sinh"
};

export async function fetchVietnamHolidays(year, apiKey) {
  const url = `https://calendarific.com/api/v2/holidays?&api_key=${apiKey}&country=VN&year=${year}`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.response && data.response.holidays) {
      return data.response.holidays.map(h => ({
        date: h.date.iso,
        // dùng bản dịch nếu có
        name: holidayTranslations[h.name] || h.name,
        description: h.description,
        type: h.type
      }));
    }
    return [];
  } catch (e) {
    console.error("Lỗi lấy ngày lễ từ Calendarific:", e);
    return [];
  }
}
