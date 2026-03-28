import type { RestringConfig } from '../core/types';

const DEFAULT_CONFIG: RestringConfig = {
  sources: ['src/**/*.{ts,tsx}'],
  locale: 'en',
  format: 'plain',
};

/**
 * Define a Restring config (for restringjs.config.ts).
 */
export function defineConfig(config: Partial<RestringConfig>): RestringConfig {
  return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Load config from a file path.
 */
export async function loadConfig(_path?: string): Promise<RestringConfig> {
  // In a real implementation, this would resolve and load the config file
  // For now, return defaults
  return DEFAULT_CONFIG;
}
