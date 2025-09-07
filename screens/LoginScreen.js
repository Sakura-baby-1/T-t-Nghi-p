// LoginScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import Toast from 'react-native-toast-message';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [errors, setErrors] = useState({});

  const recaptchaVerifier = useRef(null);

  const getBorderColor = (field) => (errors[field] ? 'red' : '#3F51B5');

  // Email/password login
  const handleLoginEmail = () => {
    let tempErrors = {};
    if (!email) tempErrors.email = 'Vui lòng nhập email';
    if (!password) tempErrors.password = 'Vui lòng nhập mật khẩu';
    setErrors(tempErrors);
    if (Object.keys(tempErrors).length > 0) return;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => Toast.show({ type: 'success', text1: 'Đăng nhập thành công!' }))
      .catch((error) => Toast.show({ type: 'error', text1: 'Lỗi đăng nhập', text2: error.message }));
  };

  // Forgot password
  const handleForgotPassword = () => {
    if (!email) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng nhập email' });
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => Toast.show({ type: 'success', text1: 'Email đặt lại mật khẩu đã được gửi' }))
      .catch((error) => Toast.show({ type: 'error', text1: 'Lỗi', text2: error.message }));
  };

  // Phone login OTP
  const sendVerification = async () => {
    if (!phone) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng nhập số điện thoại' });
      return;
    }
    const phoneNumber = phone.startsWith('0') ? '+84' + phone.slice(1) : phone;
    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier.current);
      setConfirmationResult(confirmation);
      Toast.show({ type: 'success', text1: 'OTP đã gửi', text2: 'Nhập mã OTP để xác thực' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Lỗi gửi OTP', text2: error.message });
    }
  };

  const confirmCode = async () => {
    if (!code) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng nhập mã OTP' });
      return;
    }
    if (!confirmationResult) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Chưa gửi OTP' });
      return;
    }
    try {
      await confirmationResult.confirm(code);
      Toast.show({ type: 'success', text1: 'Đăng nhập thành công!' });
      setCode('');
      setPhone('');
      setConfirmationResult(null);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Lỗi xác thực', text2: error.message });
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#e3f2fd' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifier}
            firebaseConfig={auth.app.options}
            attemptInvisibleVerification={true}
          />

          <Text style={styles.title}>📅 Lịch Cá Nhân TDMU</Text>

          <View style={styles.card}>
            {!showPhoneLogin && (
              <>
                {/* Email login */}
                <View style={[styles.inputWrapper, { borderColor: getBorderColor('email') }]}>
                  <Ionicons name="mail-outline" size={22} color="#3F51B5" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                {errors.email && <Text style={styles.error}>{errors.email}</Text>}

                <View style={[styles.inputWrapper, { borderColor: getBorderColor('password') }]}>
                  <Ionicons name="lock-closed-outline" size={22} color="#3F51B5" style={styles.icon} />
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    placeholder="Mật khẩu"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={22}
                      color="#3F51B5"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.error}>{errors.password}</Text>}

                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgot}>Quên mật khẩu?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleLoginEmail}>
                  <Text style={styles.buttonText}>Đăng nhập</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowPhoneLogin(true)}>
                  <Text style={styles.linkSmall}>Đăng nhập bằng SĐT</Text>
                </TouchableOpacity>
              </>
            )}

            {showPhoneLogin && (
              <>
                {/* Phone login */}
                <View style={[styles.inputWrapper, { borderColor: getBorderColor('phone') }]}>
                  <Ionicons name="call-outline" size={22} color="#3F51B5" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

                <TouchableOpacity style={styles.button} onPress={sendVerification}>
                  <Text style={styles.buttonText}>Gửi OTP</Text>
                </TouchableOpacity>

                {confirmationResult && (
                  <>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="key-outline" size={22} color="#3F51B5" style={styles.icon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Nhập mã OTP"
                        keyboardType="number-pad"
                        value={code}
                        onChangeText={setCode}
                      />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={confirmCode}>
                      <Text style={styles.buttonText}>Xác thực OTP</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={() => setShowPhoneLogin(false)}>
                  <Text style={styles.linkSmall}>Đăng nhập bằng Email/Mật khẩu</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkSmall}>Chưa có tài khoản? Đăng ký</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: 'bold', color: '#3F51B5', textAlign: 'center', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 5,
    paddingHorizontal: 12,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14, color: '#333' },
  forgot: { color: '#3F51B5', fontSize: 14, textAlign: 'right', marginBottom: 10 },
  button: {
    backgroundColor: '#3F51B5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkSmall: { color: '#3F51B5', fontSize: 14, textAlign: 'center', marginVertical: 5 },
  error: { color: 'red', fontSize: 12, marginBottom: 8 },
});