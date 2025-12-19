// screens/RegisterScreen.js – ĐĂNG KÝ TẾT 2026 SIÊU SANG TRỌNG
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import useTheme from '../hooks/useTheme';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const { t } = useTranslation();
  const { palette } = useTheme();
  const accent = palette?.accent || '#FFD700';
  const primary = palette?.primary || '#D32F2F';

  // Animations Tết 2026 - Rực rỡ chuyển động
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const flowerScale = useRef(new Animated.Value(1)).current;
  const flowerRotate = useRef(new Animated.Value(0)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;
  const headerShimmer = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo subtle rotate
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: -1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Flower pulse & rotate
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flowerScale, {
            toValue: 1.2,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(flowerScale, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(flowerRotate, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Card floating
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -10,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Header shimmer
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerShimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(headerShimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const flowerRotation = flowerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerOpacity = headerShimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.7, 1],
  });

  const validateGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
  const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let tempErrors = {};
    if (!fullName.trim()) tempErrors.fullName = t('register_fullname_required',{ defaultValue:'Vui lòng nhập họ và tên'});
    if (!email.trim()) tempErrors.email = t('register_email_required',{ defaultValue:'Vui lòng nhập email'});
    else if (!validateGmail(email)) tempErrors.email = t('register_email_invalid',{ defaultValue:'Email phải là Gmail hợp lệ'});
    if (!phone.trim()) tempErrors.phone = t('register_phone_required',{ defaultValue:'Vui lòng nhập số điện thoại'});
    else if (!validatePhone(phone)) tempErrors.phone = t('register_phone_invalid',{ defaultValue:'Số điện thoại phải đúng 10 số'});
    if (!password) tempErrors.password = t('register_password_required',{ defaultValue:'Vui lòng nhập mật khẩu'});
    else if (password.length < 6) tempErrors.password = t('register_password_short',{ defaultValue:'Mật khẩu ít nhất 6 ký tự'});
    if (password !== confirmPassword) tempErrors.confirmPassword = t('register_password_mismatch',{ defaultValue:'Mật khẩu không khớp'});

    setErrors(tempErrors);
    if (Object.keys(tempErrors).length > 0) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Lưu thông tin vào Firestore
      await setDoc(doc(db, "users", user.uid), {
        ten: fullName,
        email: email,
        phone: phone,
        createdAt: new Date(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: t('register_success_title',{ defaultValue:'Đăng ký thành công!' }),
        text2: t('register_success_message',{ defaultValue:'Chào mừng bạn đến với Lịch Tết 2026' }),
      });

      navigation.replace('Login');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Hiển thị thông báo thân thiện, dễ hiểu
      let title = t('register_failed',{ defaultValue:'Đăng ký thất bại'});
      let message = t('register_check_info',{ defaultValue:'Vui lòng kiểm tra lại thông tin'});

      switch (error?.code) {
        case 'auth/email-already-in-use':
          message = t('register_email_in_use',{ defaultValue:'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.'});
          break;
        case 'auth/weak-password':
          message = t('register_password_weak',{ defaultValue:'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn (ít nhất 6 ký tự).'});
          break;
        case 'auth/invalid-email':
          message = t('register_email_invalid',{ defaultValue:'Email không hợp lệ. Vui lòng kiểm tra lại.'});
          break;
        case 'auth/operation-not-allowed':
          message = t('register_disabled',{ defaultValue:'Đăng ký tạm thời bị vô hiệu hóa. Vui lòng thử lại sau.'});
          break;
        case 'auth/network-request-failed':
          message = t('register_network_error',{ defaultValue:'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.'});
          break;
        default:
          message = error?.message || message;
          break;
      }

      Toast.show({
        type: 'error',
        text1: title,
        text2: message,
      });
      setErrors({ general: message });
    }
  };

  const renderIcon = (field, value) => {
    if (!value) return null;
    const valid = 
      field === 'fullName' ? fullName.trim().length > 0 :
      field === 'email' ? validateGmail(email) :
      field === 'phone' ? validatePhone(phone) :
      field === 'password' ? password.length >= 6 :
      field === 'confirmPassword' ? password && confirmPassword && password === confirmPassword : false;

    return valid
      ? <MaterialCommunityIcons name="check-circle" size={28} color={accent} />
      : <MaterialCommunityIcons name="alert-circle" size={28} color="#FF5252" />;
  };

  return (
    <ImageBackground source={require('../assets/bg-tet.jpg')} style={{ flex: 1 }} blurRadius={3}>
      <LinearGradient colors={[primary + 'f0', 'rgba(255,215,0,0.18)', primary + 'f2']} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }} showsVerticalScrollIndicator={false}>

            <View style={styles.header}>
              <Animated.View
                style={{
                  transform: [
                    { scale: logoScale },
                    { 
                      rotate: logoRotate.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-3deg', '3deg'],
                      })
                    },
                  ],
                }}
              >
                <Image 
                  source={require("../assets/tdmu.png")} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={[styles.title, { color: accent }]}>{t('register_create_account',{ defaultValue:'Lịch Cá Nhân TDMU'})}</Text>
              <Text style={[styles.subtitle, { color: '#fff' }]}>{t('register_subtitle',{ defaultValue:'Đăng ký tài khoản mới 2026 🎉'})}</Text>
              <Animated.View 
                style={[
                  styles.decorLine,
                  { 
                    transform: [
                      { scale: flowerScale },
                      { rotate: flowerRotation },
                    ]
                  }
                ]}
              >
                <MaterialCommunityIcons name="flower-outline" size={28} color={accent} />
                <Text style={{ color: accent, fontSize: 20, marginHorizontal: 10 }}>✨</Text>
                <MaterialCommunityIcons name="flower-outline" size={28} color={accent} />
              </Animated.View>
            </View>

            {/* Card đăng ký hoàng kim */}
            <Animated.View 
              style={[
                styles.card,
                { borderColor: accent },
                { transform: [{ translateY: cardFloat }] }
              ]}
            >
              <LinearGradient colors={[accent, '#FFA000']} style={styles.cardHeader}>
                <MaterialCommunityIcons name="account-plus" size={36} color={primary} />
                <Text style={[styles.cardTitle,{ color: primary }]}>{t('register_card_title',{ defaultValue:'TẠO TÀI KHOẢN'})}</Text>
              </LinearGradient>

              {/* Họ và tên */}
              <View style={[styles.inputContainer, { borderColor: accent }, errors.fullName && styles.inputError]}>
                <MaterialCommunityIcons name="account" size={26} color={accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('register_fullname_placeholder',{ defaultValue:'Họ và tên'})}
                  placeholderTextColor={accent + 'aa'}
                  value={fullName}
                  onChangeText={setFullName}
                />
                {renderIcon('fullName', fullName)}
              </View>
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

              {/* Email Gmail */}
              <View style={[styles.inputContainer, { borderColor: accent }, errors.email && styles.inputError]}>
                <MaterialCommunityIcons name="gmail" size={26} color={accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('register_email_placeholder',{ defaultValue:'Email Gmail'})}
                  placeholderTextColor={accent + 'aa'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                {renderIcon('email', email)}
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              {/* Số điện thoại */}
              <View style={[styles.inputContainer, { borderColor: accent }, errors.phone && styles.inputError]}>
                <MaterialCommunityIcons name="phone" size={26} color={accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('register_phone_placeholder',{ defaultValue:'Số điện thoại (10 số)'})}
                  placeholderTextColor={accent + 'aa'}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                {renderIcon('phone', phone)}
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

              {/* Mật khẩu */}
              <View style={[styles.inputContainer, { borderColor: accent }, errors.password && styles.inputError]}>
                <MaterialCommunityIcons name="lock" size={26} color={accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('register_password_placeholder',{ defaultValue:'Mật khẩu (tối thiểu 6 ký tự)'})}
                  placeholderTextColor={accent + 'aa'}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={26} color={accent} />
                </TouchableOpacity>
                {renderIcon('password', password)}
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              {/* Xác nhận mật khẩu */}
              <View style={[styles.inputContainer, { borderColor: accent }, errors.confirmPassword && styles.inputError]}>
                <MaterialCommunityIcons name="lock-check" size={26} color={accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('register_confirm_placeholder',{ defaultValue:'Xác nhận mật khẩu'})}
                  placeholderTextColor={accent + 'aa'}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <MaterialCommunityIcons name={showConfirm ? "eye-off" : "eye"} size={26} color={accent} />
                </TouchableOpacity>
                {renderIcon('confirmPassword', confirmPassword)}
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

              {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

              {/* Nút Đăng ký */}
              <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
                <TouchableOpacity onPress={handleRegister} style={styles.registerButton}>
                  <LinearGradient colors={[accent, '#FFA000']} style={styles.registerGradient}>
                    <MaterialCommunityIcons name="creation" size={30} color={primary} />
                    <Text style={[styles.registerText,{ color: primary }]}>{t('register_button',{ defaultValue:'TẠO TÀI KHOẢN NGAY'})}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Đăng nhập */}
              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                <Text style={styles.loginText}>{t('register_have_account',{ defaultValue:'Đã có tài khoản?' })} </Text>
                <Text style={[styles.loginHighlight,{ color: accent }]}>{t('register_login_now',{ defaultValue:'Đăng nhập ngay'})}</Text>
              </TouchableOpacity>

              {/* Chúc Tết */}
              <View style={styles.footer}>
                <Text style={[styles.wishText,{ color: accent }]}>{t('register_wish_line1',{ defaultValue:'Chúc bạn một năm mới'})}</Text>
                <Text style={[styles.wishBig,{ color: accent }]}>{t('register_wish_line2',{ defaultValue:'AN KHANG - THỊNH VƯỢNG'})}</Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

/* STYLE TẾT 2026 - HOÀNG KIM SANG TRỌNG NHẤT VIỆT NAM */
const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: 20 },
  logo: { 
    width: 240, 
    height: 120, 
    borderRadius: 16, 
    borderWidth: 3, 
    borderColor: "#FFD700", 
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  title: { fontSize: 28, fontWeight: "900", color: "#FFD700", textShadowColor: "rgba(211,47,47,0.8)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  subtitle: { fontSize: 16, color: "#fff", marginTop: 6, fontWeight: "600" },
  decorLine: { flexDirection: "row", alignItems: "center", marginTop: 8 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    elevation: 25,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 20, marginBottom: 16 },
  cardTitle: { fontSize: 22, fontWeight: "900", marginLeft: 10 },

  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, marginBottom: 12, elevation: 8, borderWidth: 2.5, paddingVertical: 2 },
  inputError: { borderColor: "#FF5252", shadowColor: "#FF5252" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: "600" },

  errorText: {
    color: "#FF5252",
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 8,
    fontWeight: "bold",
  },

  registerButton: { marginTop: 16, borderRadius: 26, overflow: "hidden", elevation: 20 },
  registerGradient: { flexDirection: "row", padding: 16, justifyContent: "center", alignItems: "center" },
  registerText: { fontSize: 19, fontWeight: "bold", marginLeft: 10 },

  loginLink: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  loginText: { color: "#fff", fontSize: 15 },
  loginHighlight: { fontSize: 15, fontWeight: "bold" },

  footer: { alignItems: "center", marginTop: 24 },
  wishText: { fontSize: 16, fontWeight: "600" },
  wishBig: { fontSize: 24, fontWeight: "900", marginVertical: 6, textShadowColor: "#D32F2F", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 6 },
});