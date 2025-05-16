import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "./locales/en.json";
import kaTranslation from "./locales/ka.json";

// Initialize i18n with a try-catch to prevent it from breaking the app
try {
  // Default language based on localStorage or fallback to English
  const savedLanguage = localStorage?.getItem("language") || "en";

  i18n.use(initReactI18next).init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ka: {
        translation: kaTranslation,
      },
    },
    lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // This helps prevent issues with React 18
    },
  });

  console.log("i18n initialized successfully with language:", i18n.language);
} catch (error) {
  console.error("Error initializing i18n:", error);

  // Provide a fallback i18n instance in case of failure
  if (!i18n.isInitialized) {
    i18n.init({
      lng: "en",
      resources: { en: { translation: {} } },
      react: { useSuspense: false },
    });
  }
}

export default i18n;
