import React, { createContext, useContext, useState } from "react";
import i18n from "../i18n";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotify, setIsNotify] = useState(true);
  const [language, setLanguageState] = useState("vi");

  const setLanguage = (lang) => {
    setLanguageState(lang);       // update state
    i18n.changeLanguage(lang);    // đổi ngôn ngữ ngay lập tức
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
