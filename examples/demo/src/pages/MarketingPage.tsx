import { useRestring, useRegisterSection } from 'restringjs';

export function MarketingPage() {
  // Register sections
  useRegisterSection({ id: 'hero', label: 'Hero Section', order: 1 });
  useRegisterSection({ id: 'features', label: 'Features', order: 2 });
  useRegisterSection({ id: 'footer', label: 'Footer', order: 3 });

  // Hero fields
  const heroTitle = useRestring({
    path: 'hero.title',
    defaultValue: 'Build faster with restringjs',
    section: 'hero',
    description: 'Main hero heading',
  });

  const heroSubtitle = useRestring({
    path: 'hero.subtitle',
    defaultValue: 'Edit every string in your app live, then bake changes into code. No CMS required.',
    section: 'hero',
    description: 'Hero subheading',
  });

  const heroCta = useRestring({
    path: 'hero.cta',
    defaultValue: 'Get Started',
    section: 'hero',
    description: 'Call-to-action button text',
  });

  // Feature fields
  const feature1Title = useRestring({
    path: 'features.liveEditing.title',
    defaultValue: 'Live Editing',
    section: 'features',
  });
  const feature1Desc = useRestring({
    path: 'features.liveEditing.description',
    defaultValue: 'Edit strings in a sidebar and see changes instantly in your app.',
    section: 'features',
  });

  const feature2Title = useRestring({
    path: 'features.bakeAndEject.title',
    defaultValue: 'Bake & Eject',
    section: 'features',
  });
  const feature2Desc = useRestring({
    path: 'features.bakeAndEject.description',
    defaultValue: 'Apply overrides directly into source code via AST transforms.',
    section: 'features',
  });

  const feature3Title = useRestring({
    path: 'features.i18nReady.title',
    defaultValue: 'i18n Ready',
    section: 'features',
  });
  const feature3Desc = useRestring({
    path: 'features.i18nReady.description',
    defaultValue: 'Built-in ICU MessageFormat and i18next support out of the box.',
    section: 'features',
  });

  // Footer
  const footerText = useRestring({
    path: 'footer.text',
    defaultValue: '© 2026 restringjs · MIT License · Made with ❤️',
    section: 'footer',
    description: 'Footer copyright text',
  });

  return (
    <div>
      <section className="hero-section">
        <h1 className="hero-title">{heroTitle}</h1>
        <p className="hero-subtitle">{heroSubtitle}</p>
        <button type="button" className="hero-cta">{heroCta}</button>
      </section>

      <div className="features-grid">
        <div className="feature-card">
          <h3>{feature1Title}</h3>
          <p>{feature1Desc}</p>
        </div>
        <div className="feature-card">
          <h3>{feature2Title}</h3>
          <p>{feature2Desc}</p>
        </div>
        <div className="feature-card">
          <h3>{feature3Title}</h3>
          <p>{feature3Desc}</p>
        </div>
      </div>

      <p className="footer-text">{footerText}</p>
    </div>
  );
}
