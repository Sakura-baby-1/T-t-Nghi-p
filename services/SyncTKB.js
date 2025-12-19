import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE = "https://dkmh.tdmu.edu.vn/api";

// Lưu CurrUser
export const saveCurrUser = async (currUser) => {
  await AsyncStorage.setItem("tdmu_currUser", JSON.stringify(currUser));
};

// Lấy CurrUser
export const getCurrUser = async () => {
  const str = await AsyncStorage.getItem("tdmu_currUser");
  if (!str) throw new Error("Chưa login TDMU");
  return JSON.parse(str);
};

// Logout
export const logoutTDMU = async () => {
  await AsyncStorage.removeItem("tdmu_currUser");
};

// Lấy TKB trực tiếp từ CurrUser
export const getTKB = async () => {
  const currUser = await getCurrUser();

  if (!currUser || !currUser.ASPNET_SessionId)
    throw new Error("CurrUser không hợp lệ, không có ASPNET_SessionId");

  try {
    const res = await axios.get(`${API_BASE}/dkmh/w-locsinhvieninfo`, {
      headers: {
        Cookie: `ASP.NET_SessionId=${currUser.ASPNET_SessionId};`,
      },
    });

    return res.data;
  } catch (err) {
    console.error("❌ Lỗi lấy TKB:", err.message);
    throw err;
  }
};
