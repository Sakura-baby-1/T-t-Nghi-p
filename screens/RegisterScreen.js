// RegisterScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const validateGmail = (email) => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
  const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

  const handleRegister = () => {
    let tempErrors = {};

    if (!fullName.trim()) tempErrors.fullName = 'Vui lòng nhập họ và tên';
    if (!email.trim()) tempErrors.email = 'Vui lòng nhập email';
    else if (!validateGmail(email)) tempErrors.email = 'Email phải là Gmail hợp lệ';

    if (!phone.trim()) tempErrors.phone = 'Vui lòng nhập số điện thoại';
    else if (!validatePhone(phone)) tempErrors.phone = 'Số điện thoại phải đúng 10 số';

    if (!password) tempErrors.password = 'Vui lòng nhập mật khẩu';
    if (!confirmPassword) tempErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    else if (password !== confirmPassword) tempErrors.confirmPassword = 'Mật khẩu không khớp';

    setErrors(tempErrors);
    if (Object.keys(tempErrors).length > 0) return;

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => navigation.navigate('Login'))
      .catch((error) => setErrors({ general: error.message }));
  };

  const getBorderColor = (field) => errors[field] ? '#f44336' : '#3F51B5';

  const renderIcon = (field, value) => {
    if (!value) return null;
    const valid = field === 'fullName'
      ? fullName.trim().length > 0
      : field === 'email'
      ? validateGmail(email)
      : field === 'phone'
      ? validatePhone(phone)
      : field === 'password'
      ? password.length > 0
      : field === 'confirmPassword'
      ? password && confirmPassword && password === confirmPassword
      : false;

    return valid
      ? <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      : <Ionicons name="alert-circle" size={20} color="#f44336" />;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📝 Tạo tài khoản</Text>
      <View style={styles.card}>

        {/* Full Name */}
        <View style={[styles.inputWrapper, { borderColor: getBorderColor('fullName') }]}>
          <TextInput
            style={styles.input}
            placeholder="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
          />
          {renderIcon('fullName', fullName)}
        </View>
        {errors.fullName && <Text style={styles.error}>{errors.fullName}</Text>}

        {/* Email */}
        <View style={[styles.inputWrapper, { borderColor: getBorderColor('email') }]}>
          <TextInput
            style={styles.input}
            placeholder="Email (phải là Gmail)"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {renderIcon('email', email)}
        </View>
        {errors.email && <Text style={styles.error}>{errors.email}</Text>}

        {/* Phone */}
        <View style={[styles.inputWrapper, { borderColor: getBorderColor('phone') }]}>
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại (10 số)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          {renderIcon('phone', phone)}
        </View>
        {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}

        {/* Password */}
        <View style={[styles.passwordContainer, { borderColor: getBorderColor('password') }]}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            placeholder="Mật khẩu"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#3F51B5" />
          </TouchableOpacity>
          {renderIcon('password', password)}
        </View>
        {errors.password && <Text style={styles.error}>{errors.password}</Text>}

        {/* Confirm Password */}
        <View style={[styles.passwordContainer, { borderColor: getBorderColor('confirmPassword') }]}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            placeholder="Xác nhận mật khẩu"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={24} color="#3F51B5" />
          </TouchableOpacity>
          {renderIcon('confirmPassword', confirmPassword)}
        </View>
        {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>}

        {errors.general && <Text style={styles.error}>{errors.general}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Đăng ký</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e3f2fd',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#3F51B5',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 5,
    justifyContent: 'space-between',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 5,
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#3F51B5',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 10,
    color: '#3F51B5',
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    width: '100%',
    color: '#f44336',
    fontSize: 12,
    marginBottom: 8,
  },
});
