# 🔧 Hướng dẫn sửa lỗi Google Sign-In

## ❌ Lỗi hiện tại:
```
Đã chặn quyền truy cập: Lỗi uỷ quyền
Error 400: invalid_request
```

## ✅ GIẢI PHÁP:

### Bước 1: Vào OAuth Consent Screen
Link: https://console.cloud.google.com/apis/credentials/consent?project=totnghiep-4e113

### Bước 2: Chọn 1 trong 2 cách:

#### CÁCH 1: PUBLISH APP (Khuyến nghị)
1. Tìm phần "Publishing status"
2. Click nút **"PUBLISH APP"** (hoặc "PUBLIER L'APPLICATION")
3. Xác nhận publish
4. Đợi 5-10 phút

**Lợi ích:** Ai cũng có thể đăng nhập Google

#### CÁCH 2: THÊM TEST USERS
1. Cuộn xuống phần **"Test users"**
2. Click **"+ ADD USERS"** (hoặc "+ AJOUTER DES UTILISATEURS")
3. Nhập email: `tuannguyen.120503@gmail.com`
4. Click **"SAVE"** (hoặc "ENREGISTRER")
5. Test ngay lập tức

**Lưu ý:** Chỉ những email trong Test users mới đăng nhập được

### Bước 3: Kiểm tra Redirect URIs
Link: https://console.cloud.google.com/apis/credentials/oauthclient/513257594496-fofr66rmhr3nt8egiqg9tmqvt2pqgqug.apps.googleusercontent.com?project=totnghiep-4e113

Đảm bảo có các URI sau:
```
✅ https://auth.expo.io/@tuannguyen1205/totnghiep-4e113
✅ https://auth.expo.io/@anonymous/totnghiep
✅ https://auth.expo.io/@anonymous/totnghiep-4e113
```

### Bước 4: Restart app
```bash
# Stop server cũ
Ctrl+C

# Start với tunnel
npx expo start --clear --tunnel

# Nhấn 's' để switch sang Expo Go (nếu cần)
```

### Bước 5: Test
1. Scan QR code với Expo Go
2. Click "Đăng nhập với Google"
3. Chọn tài khoản
4. Thành công! 🎉

---

## 🔍 Debug thêm:

### Kiểm tra log console:
Mở Expo DevTools và xem console, tìm:
```
LOG  Google Response: { hasIdToken: true, hasAccessToken: true }
```

### Nếu vẫn lỗi:
1. Xóa cache app: Settings > Apps > Expo Go > Clear Data
2. Xóa cache browser: Logout khỏi Google trên điện thoại
3. Restart điện thoại
4. Thử lại

---

## 📞 Support:

Nếu vẫn không được, gửi cho tôi:
1. Screenshot OAuth Consent Screen (Publishing status)
2. Screenshot Test users section
3. Console log khi click Google Sign-In
