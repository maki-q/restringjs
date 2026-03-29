import { useState } from 'react';
import { RestringProvider, RestringSidebar, RestringHighlight } from 'restringjs';
import { createLocalStorageAdapter } from 'restringjs/adapters';
import { MarketingPage } from './pages/MarketingPage';
import { FaqPage } from './pages/FaqPage';
import { I18nPage } from './pages/I18nPage';
import { RichTextPage } from './pages/RichTextPage';
import { HighlightPage } from './pages/HighlightPage';

const adapter = createLocalStorageAdapter('restringjs-demo:overrides');

type PageId = 'marketing' | 'faq' | 'i18n' | 'richtext' | 'highlight';

const pages: { id: PageId; label: string }[] = [
  { id: 'marketing', label: 'Marketing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'i18n', label: 'i18n' },
  { id: 'richtext', label: 'Rich Text' },
  { id: 'highlight', label: 'Highlight' },
];

export function App() {
  const [activePage, setActivePage] = useState<PageId>('marketing');

  return (
    <RestringProvider enabled={true} adapter={adapter}>
      <div className="app-layout">
        <nav className="nav">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`nav-btn ${activePage === page.id ? 'active' : ''}`}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>

        {activePage === 'marketing' && <MarketingPage />}
        {activePage === 'faq' && <FaqPage />}
        {activePage === 'i18n' && <I18nPage />}
        {activePage === 'richtext' && <RichTextPage />}
        {activePage === 'highlight' && <HighlightPage />}
      </div>

      <RestringHighlight />
      <RestringSidebar position="right" width={360} />
    </RestringProvider>
  );
}
