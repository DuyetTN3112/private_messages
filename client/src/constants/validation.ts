/**
 * Validation Constants
 * Message and input validation limits
 */

// Message limits
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_MESSAGE_BYTE_LENGTH = MAX_MESSAGE_LENGTH * 4;

// Zalgo text / Combining characters protection
export const MAX_COMBINING_MARKS_PER_CHAR = 5;
export const MAX_TOTAL_COMBINING_MARKS = 100;
export const MAX_COMBINING_RATIO = 2.0;
