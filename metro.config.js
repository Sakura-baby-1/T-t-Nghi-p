// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-notifications': path.resolve(__dirname, 'src/mocks/expo-notifications.js'),
  'expo-device': path.resolve(__dirname, 'src/mocks/expo-device.js'),
};

module.exports = config;