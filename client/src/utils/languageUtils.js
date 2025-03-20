/**
 * Mock i18n implementation to replace react-i18next
 * This simplifies the application by removing the dependency on i18n
 * while maintaining compatibility with existing code
 */

// Get the current language - always return English for now
const getCurrentLanguage = () => {
  return "en";
};

// Translations for the application - just English for now
const translations = {
  en: {
    // Navbar
    "nav.marketplace": "Marketplace",
    "nav.inventory": "Inventory",
    "nav.trade": "Trade",
    "nav.deposit": "Deposit",
    "nav.withdraw": "Withdraw",
    "nav.profile": "Profile",
    "nav.login": "Login",
    "nav.logout": "Logout",
    "nav.balance": "Balance",
    "nav.admin": "Admin Panel",

    // Home page
    "home.hero.title":
      "Buy and sell CS2 items on the first Georgian marketplace",
    "home.hero.subtitle": "Fast, secure, trusted by thousands",
    "home.cta.browse": "Browse Items",
    "home.cta.sell": "Sell Items",
    "home.features.title": "Why Choose Us",
    "home.features.secure.title": "Secure Trading",
    "home.features.secure.desc":
      "All trades are protected with advanced security",
    "home.features.fast.title": "Fast Transactions",
    "home.features.fast.desc": "Get your items quickly without delays",
    "home.features.fees.title": "Low Fees",
    "home.features.fees.desc": "Only 5% commission on successful sales",

    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.save": "Save",
    "common.edit": "Edit",
    "common.delete": "Delete",

    // Notifications
    "notifications.title": "Notifications",
    "notifications.empty": "No notifications",
    "notifications.markRead": "Mark as read",
    "notifications.markAllRead": "Mark all as read",

    // Marketplace
    "marketplace.actions.buy": "Buy Now",
    "marketplace.actions.offer": "Make Offer",
    "marketplace.actions.cancelListing": "Cancel Listing",

    // Fallback for missing translations
    "common.notFound": "Translation not found",
  },
  // Empty Georgian translations object - to be filled manually later if needed
  ka: {},
};

// Mock useTranslation hook
export const useTranslation = () => {
  const currentLanguage = getCurrentLanguage();

  // t function to translate keys
  const t = (key, options = {}) => {
    const langData = translations[currentLanguage] || translations.en;

    // Check if the key exists in translations
    if (langData[key]) {
      let text = langData[key];

      // Simple interpolation if options provided
      if (options && typeof options === "object") {
        Object.keys(options).forEach((optionKey) => {
          text = text.replace(`{{${optionKey}}}`, options[optionKey]);
        });
      }

      return text;
    }

    // Fallback to show the key itself
    return key;
  };

  // Mock i18n object with minimal required functionality
  const i18n = {
    language: "en",
    changeLanguage: () => {
      // Do nothing - we're only using English for now
      console.log("Language change disabled - using English only");
    },
  };

  return { t, i18n };
};

// Default export for compatibility
export default { useTranslation };
