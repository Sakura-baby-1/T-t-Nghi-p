// Generate repeat occurrences from a start date.
// repeatType accepts codes (none/daily/weekly/monthly/yearly) and Vietnamese/English labels ("Hàng tuần" / "Weekly").
export const generateRepeatDates = (startDate, repeatType, occurrences = 30) => {
  const dates = [];
  if (!startDate || !repeatType) return dates;

  const base = new Date(startDate);
  const type = (repeatType || "").trim().toLowerCase();
  const isNone = ["", "không", "khong", "none", "no", "không lặp lại", "khong lap lai", "no repeat", "no-repeat"].includes(type);
  if (isNone) return dates;

  const pushWith = (applyOffset) => {
    for (let i = 0; i < occurrences; i++) {
      const current = new Date(base);
      applyOffset(current, i);
      dates.push(current);
    }
  };

  if (type === "daily" || type.includes("ngày") || type.includes("ngay")) {
    pushWith((d, i) => d.setDate(base.getDate() + i));
  } else if (type === "weekly" || type.includes("tuần") || type.includes("tuan")) {
    pushWith((d, i) => d.setDate(base.getDate() + i * 7));
  } else if (type === "monthly" || type.includes("tháng") || type.includes("thang")) {
    pushWith((d, i) => d.setMonth(base.getMonth() + i));
  } else if (type === "yearly" || type.includes("năm") || type.includes("nam")) {
    pushWith((d, i) => d.setFullYear(base.getFullYear() + i));
  } else {
    dates.push(base);
  }

  return dates;
};
