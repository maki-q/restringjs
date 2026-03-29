import { useState } from 'react';
import { useRestring, useRegisterSection } from 'restringjs';

type Locale = 'en' | 'es' | 'de';
type Gender = 'male' | 'female' | 'other';

/**
 * Simple ICU plural interpolation for demo purposes.
 * Handles: {count, plural, one {# item} other {# items}}
 */
function interpolatePlural(template: string, count: number): string {
  return template.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
    (_match, _varName, oneForm, otherForm) => {
      const form = count === 1 ? (oneForm as string) : (otherForm as string);
      return form.replace(/#/g, String(count));
    },
  );
}

/**
 * Simple ICU select interpolation for demo purposes.
 * Handles: {gender, select, male {He} female {She} other {They}}
 */
function interpolateSelect(template: string, selections: Record<string, string>): string {
  return template.replace(
    /\{(\w+),\s*select,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g,
    (_match, varName, cases) => {
      const value = selections[varName as string] ?? 'other';
      const caseRegex = new RegExp(`${value}\\s*\\{([^}]*)\\}`);
      const found = (cases as string).match(caseRegex);
      if (found?.[1]) return found[1];
      const otherMatch = (cases as string).match(/other\s*\{([^}]*)\}/);
      return otherMatch?.[1] ?? value;
    },
  );
}

/**
 * Simple i18next-style interpolation: {{variable}}
 */
function interpolateI18next(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => variables[key as string] ?? `{{${key as string}}}`);
}

const localeLabels: Record<Locale, string> = {
  en: '🇺🇸 English',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch',
};

export function I18nPage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [count, setCount] = useState(3);
  const [gender, setGender] = useState<Gender>('female');

  useRegisterSection({ id: 'i18n-icu', label: 'ICU MessageFormat', order: 1 });
  useRegisterSection({ id: 'i18n-i18next', label: 'i18next Format', order: 2 });
  useRegisterSection({ id: 'i18n-plain', label: 'Plain Strings', order: 3 });

  // ICU plural strings per locale
  const pluralEn = useRestring({
    path: 'i18n.items.en',
    defaultValue: 'You have {count, plural, one {# item} other {# items}} in your cart',
    section: 'i18n-icu',
    format: 'icu',
    locale: 'en',
    description: 'Plural form (English)',
  });

  const pluralEs = useRestring({
    path: 'i18n.items.es',
    defaultValue: 'Tienes {count, plural, one {# artículo} other {# artículos}} en tu carrito',
    section: 'i18n-icu',
    format: 'icu',
    locale: 'es',
    description: 'Plural form (Spanish)',
  });

  const pluralDe = useRestring({
    path: 'i18n.items.de',
    defaultValue: 'Du hast {count, plural, one {# Artikel} other {# Artikel}} im Warenkorb',
    section: 'i18n-icu',
    format: 'icu',
    locale: 'de',
    description: 'Plural form (German)',
  });

  const pluralByLocale: Record<Locale, string> = { en: pluralEn, es: pluralEs, de: pluralDe };

  // ICU select strings
  const selectEn = useRestring({
    path: 'i18n.genderPost.en',
    defaultValue: '{gender, select, male {He} female {She} other {They}} liked your post',
    section: 'i18n-icu',
    format: 'icu',
    locale: 'en',
    description: 'Gender select (English)',
  });

  const selectEs = useRestring({
    path: 'i18n.genderPost.es',
    defaultValue: '{gender, select, male {A él} female {A ella} other {A ellos}} les gustó tu publicación',
    section: 'i18n-icu',
    format: 'icu',
    locale: 'es',
    description: 'Gender select (Spanish)',
  });

  const selectDe = useRestring({
    path: 'i18n.genderPost.de',
    defaultValue: '{gender, select, male {Er} female {Sie} other {Sie}} mochte deinen Beitrag',
    section: 'i18n-icu',
    format: 'icu',
    locale: 'de',
    description: 'Gender select (German)',
  });

  const selectByLocale: Record<Locale, string> = { en: selectEn, es: selectEs, de: selectDe };

  // i18next strings
  const welcomeEn = useRestring({
    path: 'i18n.welcome.en',
    defaultValue: 'Welcome back, {{userName}}! You have {{notificationCount}} new notifications.',
    section: 'i18n-i18next',
    format: 'i18next',
    locale: 'en',
    description: 'Welcome message (English)',
  });

  const welcomeEs = useRestring({
    path: 'i18n.welcome.es',
    defaultValue: '¡Bienvenido de nuevo, {{userName}}! Tienes {{notificationCount}} nuevas notificaciones.',
    section: 'i18n-i18next',
    format: 'i18next',
    locale: 'es',
    description: 'Welcome message (Spanish)',
  });

  const welcomeDe = useRestring({
    path: 'i18n.welcome.de',
    defaultValue: 'Willkommen zurück, {{userName}}! Du hast {{notificationCount}} neue Benachrichtigungen.',
    section: 'i18n-i18next',
    format: 'i18next',
    locale: 'de',
    description: 'Welcome message (German)',
  });

  const welcomeByLocale: Record<Locale, string> = { en: welcomeEn, es: welcomeEs, de: welcomeDe };

  // Plain string
  const plain = useRestring({
    path: 'i18n.appName',
    defaultValue: 'My Awesome App',
    section: 'i18n-plain',
    format: 'plain',
    description: 'App name (plain string, no interpolation)',
  });

  // Interpolate current values
  const currentPlural = pluralByLocale[locale] ?? pluralEn;
  const currentSelect = selectByLocale[locale] ?? selectEn;
  const currentWelcome = welcomeByLocale[locale] ?? welcomeEn;

  const renderedPlural = interpolatePlural(currentPlural, count);
  const renderedSelect = interpolateSelect(currentSelect, { gender });
  const renderedWelcome = interpolateI18next(currentWelcome, {
    userName: 'Alice',
    notificationCount: '5',
  });

  return (
    <div>
      <h2 className="page-title">i18n Playground</h2>
      <p className="page-subtitle">
        ICU MessageFormat, i18next interpolation, and multi-locale support.
      </p>

      {/* Locale switcher */}
      <div className="locale-switcher">
        {(Object.entries(localeLabels) as [Locale, string][]).map(([loc, label]) => (
          <button
            key={loc}
            type="button"
            className={`locale-btn ${locale === loc ? 'active' : ''}`}
            onClick={() => setLocale(loc)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ICU Plural */}
      <div className="i18n-section">
        <h3>ICU Plural</h3>
        <div className="controls-row">
          <span className="control-label">Count:</span>
          <button type="button" className="counter-btn" onClick={() => setCount(Math.max(0, count - 1))}>
            −
          </button>
          <strong>{count}</strong>
          <button type="button" className="counter-btn" onClick={() => setCount(count + 1)}>
            +
          </button>
        </div>
        <div className="i18n-output">{renderedPlural}</div>
        <code style={{ fontSize: 12, color: '#999' }}>Template: {currentPlural}</code>
      </div>

      {/* ICU Select */}
      <div className="i18n-section">
        <h3>ICU Select</h3>
        <div className="controls-row">
          <span className="control-label">Gender:</span>
          {(['male', 'female', 'other'] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              className={`locale-btn ${gender === g ? 'active' : ''}`}
              onClick={() => setGender(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="i18n-output">{renderedSelect}</div>
        <code style={{ fontSize: 12, color: '#999' }}>Template: {currentSelect}</code>
      </div>

      {/* i18next */}
      <div className="i18n-section">
        <h3>i18next Interpolation</h3>
        <div className="i18n-output">{renderedWelcome}</div>
        <code style={{ fontSize: 12, color: '#999' }}>Template: {currentWelcome}</code>
      </div>

      {/* Plain */}
      <div className="i18n-section">
        <h3>Plain String</h3>
        <div className="i18n-output">{plain}</div>
      </div>
    </div>
  );
}
