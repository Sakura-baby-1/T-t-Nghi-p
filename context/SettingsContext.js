import React, { createContext, useContext, useEffect, useState } from "react";
import i18n from "../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotify, setIsNotify] = useState(true);
  const [language, setLanguageState] = useState(i18n.language || "vi");

  // load persisted language on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@app:language");
        if (mounted && saved) {
          setLanguageState(saved);
          // ensure i18n uses it
          i18n.changeLanguage(saved);
        }
      } catch (e) {
        // ignore
        console.warn("Could not load saved language", e);
      }
    })();
    return () => (mounted = false);
  }, []);

  // when language state changes, persist and tell i18n
  useEffect(() => {
    (async () => {
      try {
        if (language) {
          await AsyncStorage.setItem("@app:language", language);
          i18n.changeLanguage(language);
        }
      } catch (e) {
        console.warn("Could not save language", e);
      }
    })();
  }, [language]);

  const setLanguage = (lang) => {
    setLanguageState(lang);
  };

  return (
    <SettingsContext.Provider
      value={{ isDarkMode, setIsDarkMode, isNotify, setIsNotify, language, setLanguage }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
