/**
 * File validator cho client
 * Sao chép từ server/src/validators/message_validator.ts và điều chỉnh để sử dụng trên client
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
 * Regex phát hiện quá nhiều dấu nguyên âm
 */
const EXCESSIVE_DIACRITICS_REGEX = /[\u0300-\u036F\u0483-\u0489\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{10,}/;

/**
 * Giới hạn độ dài tin nhắn
 */
const MAX_MESSAGE_LENGTH = 1000;

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
  
  // Kiểm tra độ dài tin nhắn
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError(`Tin nhắn không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự`);
  }
  
  // Kiểm tra tin nhắn rỗng hoặc chỉ có khoảng trắng
  if (message.trim().length === 0) {
    throw new ValidationError('Tin nhắn không được để trống');
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
  
  // Kiểm tra regex dấu nhiều
  if (EXCESSIVE_DIACRITICS_REGEX.test(processed_message)) {
    throw new ValidationError('Tin nhắn chứa quá nhiều dấu');
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