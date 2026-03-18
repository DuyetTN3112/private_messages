/**
 * Application Configuration Constants
 */

// Server
export const DEFAULT_PORT = 3000;

// Conversation timeouts (milliseconds)
export const IDLE_TIMEOUT_MS = 60 * 1000; // 1 minute
export const IDLE_CHECK_INTERVAL_MS = 10 * 1000; // 10 seconds

// Stats broadcast interval
export const STATS_BROADCAST_INTERVAL_MS = 10 * 1000; // 10 seconds

// Environment
export const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';
