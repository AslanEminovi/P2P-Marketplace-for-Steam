# CS2 Marketplace

This is a marketplace for CS2 (Counter-Strike 2) items, focused on the Georgian market.

## Language Implementation

The application uses a simplified language implementation instead of a full i18n solution. Key details:

- English is the only supported language currently
- The implementation uses a mock i18n system in `utils/languageUtils.js`
- Georgian text can be added manually to the translations object when needed
- No automatic language switching (simplified language switcher that only shows English)

### Adding New Translations

To add new translations, edit the `translations` object in `utils/languageUtils.js`:

```javascript
const translations = {
  en: {
    // Add English translations here
    "key.name": "English value",
  },
  ka: {
    // Add Georgian translations here when needed
    "key.name": "Georgian value",
  },
};
```

### Using Translations

In components, import the translation hook and use it:

```javascript
import { useTranslation } from "../utils/languageUtils";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("key.name")}</h1>
    </div>
  );
}
```

## Features

- Steam authentication
- Item listing and trading
- Secure trading system
- Inventory management
- User profiles
- Real-time notifications
