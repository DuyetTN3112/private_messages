/**
 * Validation Constants
 * Message and input validation limits
 */

// Message limits
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_MESSAGE_BYTE_LENGTH = MAX_MESSAGE_LENGTH * 4; // UTF-8 can be up to 4 bytes per char

// Zalgo text / Combining characters protection
export const MAX_COMBINING_MARKS_PER_CHAR = 5;
export const MAX_TOTAL_COMBINING_MARKS = 100;
export const MAX_COMBINING_RATIO = 2.0;

// Rate limiting
export const MAX_MESSAGES_PER_MINUTE = 30;
export const MAX_CONNECTIONS_PER_IP = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
