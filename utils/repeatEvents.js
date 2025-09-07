// utils/repeatHelper.js
export const generateRepeatDates = (startDate, repeatType) => {
  let dates = [];
  const base = new Date(startDate);

  if (repeatType === "Hàng ngày") {
    // hôm nay
    dates.push(new Date(base));

    // ngày mai
    let tomorrow = new Date(base);
    tomorrow.setDate(base.getDate() + 1);
    dates.push(tomorrow);

  } else if (repeatType === "Hàng tuần") {
    // 7 tuần tới
    for (let i = 0; i < 7; i++) {
      let current = new Date(base);
      current.setDate(base.getDate() + i * 7);
      dates.push(current);
    }
  } else if (repeatType === "Hàng tháng") {
    // 30 tháng tới
    for (let i = 0; i < 30; i++) {
      let current = new Date(base);
      current.setMonth(base.getMonth() + i);
      dates.push(current);
    }
  }

  return dates;
};
