/**
 * Mock implementation of react-i18next
 * This file is used to replace the actual react-i18next library
 * with a simple implementation that doesn't cause React errors
 */

import { useTranslation } from "./utils/languageUtils";

// Export the mock implementations
export { useTranslation };

// Mock I18nextProvider component that just renders its children
export const I18nextProvider = ({ children }) => children;

// Mock withTranslation HOC that just passes through the component
export const withTranslation = () => (Component) => (props) => {
  const { t, i18n } = useTranslation();
  return <Component {...props} t={t} i18n={i18n} />;
};

// Mock Trans component that just renders its children
export const Trans = ({ children }) => children;

// Default export for usage with import default
export default {
  useTranslation,
  I18nextProvider,
  withTranslation,
  Trans,
};
