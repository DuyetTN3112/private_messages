/**
 * File validator cho client
 * Chống các loại tấn công: XSS, Spam, Zalgo text (Combining Characters DoS)
 */

/**
 * Regex để phát hiện URL trong tin nhắn
 * Dùng để bảo vệ URL khỏi các quy tắc kiểm tra khác
 */
const URL_REGEX = /(@?https?:\/\/[^\s]+)/gi;

/**
 * Regex kiểm tra ký tự hợp lệ
 * Chỉ cho phép chữ cái, số, dấu câu, khoảng trắng và một số ký tự đặc biệt
 */
const VALID_CHARS_REGEX = /^[\p{L}\p{N}\p{P}\p{Zs}\p{So}\p{Mn}\p{Mc}]+$/u;

/**
 * Giới hạn độ dài tin nhắn
 */
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Giới hạn số combining marks tối đa trên MỖI ký tự cơ sở
 * Chống Zalgo text / Combining Characters DoS Attack
 * Tiếng Việt thường chỉ cần tối đa 2-3 dấu (ế = e + ́ + ̂)
 */
const MAX_COMBINING_MARKS_PER_CHAR = 5;

/**
 * Giới hạn tổng số combining marks trong toàn bộ tin nhắn
 */
const MAX_TOTAL_COMBINING_MARKS = 100;

/**
 * Giới hạn tỷ lệ combining marks / ký tự cơ sở
 */
const MAX_COMBINING_RATIO = 2.0;

/**
 * Phân tích combining characters trong chuỗi
 * Chống Zalgo text / Unicode Combining Characters DoS Attack
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
const has_excessive_repeats = (text: string, max_repeats: number = 5): boolean => {
  const repeated_char_regex = new RegExp(`(.)\\1{${max_repeats},}`, 'u');
  return repeated_char_regex.test(text);
};

/**
 * Kiểm tra từ lặp lại quá nhiều lần liên tiếp
 */
const has_repeated_words = (text: string, max_repeats: number = 3): boolean => {
  const words = text.toLowerCase().split(/\s+/);
  
  let current_word = '';
  let repeat_count = 1;
  
  for (let i = 0; i < words.length; i++) {
    if (words[i] === current_word) {
      repeat_count++;
      if (repeat_count > max_repeats) return true;
    } else {
      current_word = words[i];
      repeat_count = 1;
    }
  }
  
  return false;
};

/**
 * Thay thế tạm thời các URL trong tin nhắn 
 */
const extract_urls = (message: string): { processed_message: string, urls: string[] } => {
  const urls: string[] = [];
  const processed_message = message.replace(URL_REGEX, (match) => {
    urls.push(match);
    return `[URL_${urls.length - 1}]`;
  });
  
  return { processed_message, urls };
};

/**
 * Khôi phục các URL đã thay thế trước đó
 */
const restore_urls = (processed_message: string, urls: string[]): string => {
  let restored = processed_message;
  for (let i = 0; i < urls.length; i++) {
    restored = restored.replace(`[URL_${i}]`, urls[i]);
  }
  
  return restored;
};

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
 * Validator chính cho tin nhắn
 * @throws ValidationError nếu tin nhắn không hợp lệ
 */
export const validate_message = (message: string): void => {
  // Kiểm tra message không bị null hoặc undefined
  if (!message || typeof message !== 'string') {
    throw new ValidationError('Nội dung tin nhắn không hợp lệ');
  }
  
  // Kiểm tra độ dài tin nhắn (byte length để tránh DoS bằng unicode)
  const byte_length = new TextEncoder().encode(message).length;
  if (byte_length > MAX_MESSAGE_LENGTH * 4) {
    throw new ValidationError('Tin nhắn quá dài');
  }
  
  // Kiểm tra độ dài tin nhắn
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`);
  }
  
  // Kiểm tra tin nhắn rỗng hoặc chỉ có khoảng trắng
  if (message.trim().length === 0) {
    throw new ValidationError('Tin nhắn không được để trống');
  }
  
  // 🚨 KIỂM TRA COMBINING CHARACTERS ATTACK (Zalgo text)
  const combining_analysis = analyze_combining_marks(message);
  if (combining_analysis.is_attack) {
    throw new ValidationError(`Tin nhắn chứa ký tự không hợp lệ`);
  }
  
  // Trích xuất URL trước khi kiểm tra
  const { processed_message, } = extract_urls(message);
  
  // Kiểm tra ký tự lặp lại quá nhiều
  if (has_excessive_repeats(processed_message)) {
    throw new ValidationError('Tin nhắn chứa quá nhiều ký tự lặp lại');
  }
  
  // Kiểm tra từ lặp lại quá nhiều
  if (has_repeated_words(processed_message)) {
    throw new ValidationError('Tin nhắn chứa quá nhiều từ lặp lại liên tiếp');
  }
  
  // Kiểm tra ký tự hợp lệ - chỉ áp dụng cho phần không phải URL
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
  
  // Cắt bớt nếu quá dài
  let sanitized = message.slice(0, MAX_MESSAGE_LENGTH);
  
  // 🚨 LOẠI BỎ COMBINING MARKS THỪA TRƯỚC
  sanitized = strip_excessive_combining(sanitized);
  
  // Trích xuất URL trước khi làm sạch
  const { processed_message, urls } = extract_urls(sanitized);
  
  // Xóa các ký tự không hợp lệ
  let cleaned = processed_message.replace(/[^\p{L}\p{N}\p{P}\p{Zs}\p{So}\p{Mn}\p{Mc}]/gu, '');
  
  // Xử lý ký tự lặp lại
  cleaned = cleaned.replace(/(.)\1{5,}/gu, (_, char) => char.repeat(5));
  
  // Khôi phục URL
  sanitized = restore_urls(cleaned, urls);
  
  return sanitized.trim();
}; 