import { createContext, useContext } from 'react';
import type { RestringContextValue } from '../core/types';

export const RestringContext = createContext<RestringContextValue | null>(null);

export function useRestringContext(): RestringContextValue {
  const ctx = useContext(RestringContext);
  if (!ctx) {
    throw new Error('useRestringContext must be used within a <RestringProvider>');
  }
  return ctx;
}
