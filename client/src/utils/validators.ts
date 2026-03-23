/**
 * Client-side Message Validators
 * Chống các loại tấn công: XSS, Spam, Zalgo text (Combining Characters DoS)
 */

import {
  MAX_MESSAGE_LENGTH,
  MAX_COMBINING_MARKS_PER_CHAR,
  MAX_TOTAL_COMBINING_MARKS,
  MAX_COMBINING_RATIO,
} from '../constants/validation';

/**
 * Regex để phát hiện URL trong tin nhắn
 */
const URL_REGEX = /(@?https?:\/\/[^\s]+)/gi;

/**
 * Chặn các URI scheme nguy hiểm trong tin nhắn người dùng
 */
const DANGEROUS_PROTOCOL_REGEX = /(?:^|\s)(?:javascript|vbscript|data|file)\s*:/iu;

/**
 * Regex kiểm tra ký tự hợp lệ
 */
const VALID_CHARS_REGEX = /^[\p{L}\p{N}\p{P}\p{Zs}\p{So}\p{Mn}\p{Mc}]+$/u;

/**
 * Lớp lỗi tùy chỉnh cho các lỗi validator
 */
export class ValidationError extends Error {
  status_code: number;

  constructor(message: string, status_code: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.status_code = status_code;
  }
}

/**
 * Phân tích combining characters trong chuỗi
 */
const analyze_combining_marks = (text: string): {
  total_combining: number;
  max_per_char: number;
  base_char_count: number;
  is_attack: boolean;
  reason?: string;
} => {
  let total_combining = 0;
  let max_per_char = 0;
  let current_combining_count = 0;
  let base_char_count = 0;

  for (const char of text) {
    const is_combining = /\p{M}/u.test(char);

    if (is_combining) {
      current_combining_count++;
      total_combining++;

      if (current_combining_count > MAX_COMBINING_MARKS_PER_CHAR) {
        return {
          total_combining,
          max_per_char: current_combining_count,
          base_char_count,
          is_attack: true,
          reason: `Quá nhiều dấu kết hợp trên một ký tự`
        };
      }
    } else {
      max_per_char = Math.max(max_per_char, current_combining_count);
      current_combining_count = 0;
      base_char_count++;
    }
  }

  max_per_char = Math.max(max_per_char, current_combining_count);

  if (total_combining > MAX_TOTAL_COMBINING_MARKS) {
    return {
      total_combining,
      max_per_char,
      base_char_count,
      is_attack: true,
      reason: `Quá nhiều dấu kết hợp tổng cộng`
    };
  }

  if (base_char_count > 0) {
    const ratio = total_combining / base_char_count;
    if (ratio > MAX_COMBINING_RATIO) {
      return {
        total_combining,
        max_per_char,
        base_char_count,
        is_attack: true,
        reason: `Tỷ lệ dấu kết hợp quá cao`
      };
    }
  }

  return {
    total_combining,
    max_per_char,
    base_char_count,
    is_attack: false
  };
};

/**
 * Loại bỏ các combining marks thừa để làm sạch chuỗi
 */
const strip_excessive_combining = (text: string): string => {
  let result = '';
  let current_combining_count = 0;

  for (const char of text) {
    const is_combining = /\p{M}/u.test(char);

    if (is_combining) {
      if (current_combining_count < MAX_COMBINING_MARKS_PER_CHAR) {
        result += char;
        current_combining_count++;
      }
    } else {
      result += char;
      current_combining_count = 0;
    }
  }

  return result;
};

/**
 * Kiểm tra ký tự lặp lại quá nhiều lần liên tiếp
 */
const has_excessive_repeats = (text: string, max_repeats = 5): boolean => {
  const repeated_char_regex = new RegExp(`(.)\\1{${String(max_repeats)},}`, 'u');
  return repeated_char_regex.test(text);
};

/**
 * Kiểm tra từ lặp lại quá nhiều lần liên tiếp
 */
const has_repeated_words = (text: string, max_repeats = 3): boolean => {
  const words = text.toLowerCase().split(/\s+/);

  let current_word = '';
  let repeat_count = 1;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === undefined || word === '') continue;

    if (word === current_word) {
      repeat_count++;
      if (repeat_count > max_repeats) return true;
    } else {
      current_word = word;
      repeat_count = 1;
    }
  }

  return false;
};

/**
 * Thay thế tạm thời các URL trong tin nhắn
 */
const extract_urls = (message: string): { processed_message: string; urls: string[] } => {
  const urls: string[] = [];
  const processed_message = message.replace(URL_REGEX, (match) => {
    urls.push(match);
    return `[URL_${String(urls.length - 1)}]`;
  });

  return { processed_message, urls };
};

/**
 * Khôi phục các URL đã thay thế trước đó
 */
const restore_urls = (processed_message: string, urls: string[]): string => {
  let restored = processed_message;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    if (typeof url !== 'string') continue;

    restored = restored.replace(`[URL_${String(i)}]`, url);
  }

  return restored;
};

/**
 * Validator chính cho tin nhắn
 */
export const validate_message = (message: string): void => {
  if (!message || typeof message !== 'string') {
    throw new ValidationError('Nội dung tin nhắn không hợp lệ');
  }

  const byte_length = new TextEncoder().encode(message).length;
  if (byte_length > MAX_MESSAGE_LENGTH * 4) {
    throw new ValidationError('Tin nhắn quá dài');
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`Tin nhắn không được vượt quá ${String(MAX_MESSAGE_LENGTH)} ký tự`);
  }

  if (message.trim().length === 0) {
    throw new ValidationError('Tin nhắn không được để trống');
  }

  if (DANGEROUS_PROTOCOL_REGEX.test(message)) {
    throw new ValidationError('Tin nhắn chứa nội dung không an toàn');
  }

  const combining_analysis = analyze_combining_marks(message);
  if (combining_analysis.is_attack) {
    throw new ValidationError(`Tin nhắn chứa ký tự không hợp lệ`);
  }

  const { processed_message } = extract_urls(message);

  if (has_excessive_repeats(processed_message)) {
    throw new ValidationError('Tin nhắn chứa quá nhiều ký tự lặp lại');
  }

  if (has_repeated_words(processed_message)) {
    throw new ValidationError('Tin nhắn chứa quá nhiều từ lặp lại liên tiếp');
  }

  if (!VALID_CHARS_REGEX.test(processed_message)) {
    throw new ValidationError('Tin nhắn chứa ký tự không hợp lệ');
  }
};

/**
 * Kiểm tra nhanh tin nhắn, trả về kết quả thay vì throw error
 */
export const is_valid_message = (message: string): boolean => {
  try {
    validate_message(message);
    return true;
  } catch (_error) {
    return false;
  }
};

/**
 * Tạo bản tin nhắn an toàn (loại bỏ các yếu tố không an toàn)
 */
export const sanitize_message = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return '';
  }

  let sanitized = message.slice(0, MAX_MESSAGE_LENGTH);
  sanitized = strip_excessive_combining(sanitized);

  const { processed_message, urls } = extract_urls(sanitized);

  let cleaned = processed_message.replace(/[^\p{L}\p{N}\p{P}\p{Zs}\p{So}\p{Mn}\p{Mc}]/gu, '');
  cleaned = cleaned.replace(/(.)\1{5,}/gu, (_match: string, char: string) => char.repeat(5));

  sanitized = restore_urls(cleaned, urls);

  return sanitized.trim();
}; 