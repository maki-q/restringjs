import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Prevent localStorage state from leaking between tests.
// The store persists highlightMode/sidebarOpen to localStorage by default.
afterEach(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  } catch { /* ignore */ }
});
