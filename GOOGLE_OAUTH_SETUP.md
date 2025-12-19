# Hướng dẫn cấu hình Google OAuth cho Expo

## Tạo Web Client ID mới

1. Vào Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=totnghiep-4e113

2. Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**

3. Chọn **Application type: Web application**

4. Điền thông tin:
   - **Name**: Expo Web Client - TotNghiep
   - **Authorized JavaScript origins**: (để trống)
   - **Authorized redirect URIs**: 
     ```
     https://auth.expo.io/@anonymous/totnghiep
     ```

5. Click **"CREATE"**

6. Copy **Client ID** mới (dạng: xxxxx-xxxxxxx.apps.googleusercontent.com)

## Cập nhật code

Sau khi có Client ID mới, cập nhật file `LoginScreen.js`:

```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
  expoClientId: "YOUR_NEW_WEB_CLIENT_ID_HERE", // Thay bằng Client ID mới
  iosClientId: "513257594496-nv57qd2p89c3jqja5j898tka7pknhbj9.apps.googleusercontent.com",
  androidClientId: "513257594496-5vtqic1ulk590hqlv7chd9ij2puc81on.apps.googleusercontent.com",
  webClientId: "YOUR_NEW_WEB_CLIENT_ID_HERE", // Thay bằng Client ID mới
});
```

## Kiểm tra cấu hình

Đảm bảo:
- ✅ Web Client ID đã được tạo
- ✅ Redirect URI đã được thêm: `https://auth.expo.io/@anonymous/totnghiep`
- ✅ Google+ API hoặc Google Identity Services đã được bật
- ✅ OAuth consent screen đã được cấu hình

## Test

Sau khi cấu hình xong, chạy:
```bash
npx expo start --clear
```

Đợi 5-10 phút để Google áp dụng thay đổi, sau đó test lại đăng nhập Google.
