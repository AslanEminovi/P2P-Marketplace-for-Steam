import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Create a simplified mock i18n system
const mockI18n = {
  // Simple translation function that returns the key
  t: (key) => {
    return key;
  },
  // Stub for changeLanguage
  changeLanguage: () => {},
  // Other required methods
  language: "en",
  languages: ["en", "ka"],
  options: {
    resources: {},
    lng: "en",
  },
};

// Make this mock available as i18n
i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {},
    },
    ka: {
      translation: {},
    },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
