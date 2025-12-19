# Lấy SHA-1 Fingerprint cho Firebase Google Sign-In

## Cách 1: Dùng Expo (KHUYÊN DÙNG - dễ nhất)

```bash
# Lấy SHA-1 từ Expo
eas credentials
```

Chọn:
1. Android
2. View existing credentials
3. Copy SHA-1 Fingerprint

## Cách 2: Dùng keytool (nếu có Android Studio)

### Debug build:
```bash
# Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# Mac/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Release build:
```bash
# Tìm keystore của bạn
keytool -list -v -keystore path/to/your-keystore.jks -alias your-alias
```

## Cách 3: Build app và lấy từ log

```bash
cd android
./gradlew signingReport
```

## Sau khi có SHA-1:

1. Vào Firebase Console: https://console.firebase.google.com
2. Chọn project "totnghiep"
3. Project Settings > Your apps > Android app
4. Thêm SHA-1 fingerprint vào phần "SHA certificate fingerprints"
5. Tải lại file `google-services.json` (nếu có thay đổi)

## Lấy đúng Client ID:

**QUAN TRỌNG:** Cần dùng **Android Client ID**, KHÔNG phải Web Client ID!

### Trong Firebase Console:
1. Project Settings > Service accounts
2. Scroll xuống "Google Sign-In configuration"
3. Sao chép **Android client ID** (có dạng: `xxx-xxx.apps.googleusercontent.com`)

### Hoặc trong Google Cloud Console:
1. APIs & Services > Credentials
2. Tìm "OAuth 2.0 Client IDs" type **Android**
3. Copy Client ID

## Update LoginScreen.js:

```javascript
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: "ANDROID_CLIENT_ID_TU_FIREBASE", // <-- Thay đổi ở đây
});
```

## Kiểm tra:

Sau khi cập nhật SHA-1 và Client ID:
1. Chờ 5-10 phút để Firebase cập nhật
2. Rebuild app: `npx expo run:android`
3. Test Google Sign-In
