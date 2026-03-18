import { IS_PRODUCTION } from '../constants/config';

/**
 * Simple logger - console only
 * Production: info level, Development: debug level
 */
const logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]): void => {
    if (!IS_PRODUCTION) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
};

export { logger }; 