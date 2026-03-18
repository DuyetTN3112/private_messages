import { ApiError } from '../middleware/error_handler';

/**
 * Regex để phát hiện URL trong tin nhắn
 * Dùng để bảo vệ URL khỏi các quy tắc kiểm tra khác
 * Hỗ trợ cả URL có @, URL dài với các ký tự đặc biệt
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
 * Ngăn chặn việc gửi tin nhắn với quá nhiều dấu tổng cộng
 */
const MAX_TOTAL_COMBINING_MARKS = 100;

/**
 * Giới hạn tỷ lệ combining marks / ký tự cơ sở
 * Tin nhắn bình thường không nên có tỷ lệ cao
 */
const MAX_COMBINING_RATIO = 2.0;

/**
 * Kiểm tra và đếm combining characters trong chuỗi
 * Chống Zalgo text / Unicode Combining Characters DoS Attack
 * 
 * @returns Object chứa thông tin về combining marks
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
    // Check if character is a combining mark (Unicode category M)
    // This includes: Mn (nonspacing), Mc (spacing combining), Me (enclosing)
    const is_combining = /\p{M}/u.test(char);
    
    if (is_combining) {
      current_combining_count++;
      total_combining++;
      
      // Early exit nếu phát hiện tấn công
      if (current_combining_count > MAX_COMBINING_MARKS_PER_CHAR) {
        return {
          total_combining,
          max_per_char: current_combining_count,
          base_char_count,
          is_attack: true,
          reason: `Quá nhiều dấu kết hợp trên một ký tự (${String(current_combining_count)} > ${String(MAX_COMBINING_MARKS_PER_CHAR)})`
        };
      }
    } else {
      // Ký tự cơ sở mới
      max_per_char = Math.max(max_per_char, current_combining_count);
      current_combining_count = 0;
      base_char_count++;
    }
  }
  
  // Cập nhật max cho ký tự cuối cùng
  max_per_char = Math.max(max_per_char, current_combining_count);
  
  // Kiểm tra tổng số combining marks
  if (total_combining > MAX_TOTAL_COMBINING_MARKS) {
    return {
      total_combining,
      max_per_char,
      base_char_count,
      is_attack: true,
      reason: `Quá nhiều dấu kết hợp tổng cộng (${String(total_combining)} > ${String(MAX_TOTAL_COMBINING_MARKS)})`
    };
  }
  
  // Kiểm tra tỷ lệ combining/base
  if (base_char_count > 0) {
    const ratio = total_combining / base_char_count;
    if (ratio > MAX_COMBINING_RATIO) {
      return {
        total_combining,
        max_per_char,
        base_char_count,
        is_attack: true,
        reason: `Tỷ lệ dấu kết hợp quá cao (${ratio.toFixed(2)} > ${String(MAX_COMBINING_RATIO)})`
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
 * Giữ lại tối đa MAX_COMBINING_MARKS_PER_CHAR dấu cho mỗi ký tự
 */
const strip_excessive_combining = (text: string): string => {
  let result = '';
  let current_combining_count = 0;
  
  for (const char of text) {
    const is_combining = /\p{M}/u.test(char);
    
    if (is_combining) {
      // Chỉ giữ lại tối đa MAX_COMBINING_MARKS_PER_CHAR dấu
      if (current_combining_count < MAX_COMBINING_MARKS_PER_CHAR) {
        result += char;
        current_combining_count++;
      }
      // Bỏ qua các dấu thừa
    } else {
      result += char;
      current_combining_count = 0;
    }
  }
  
  return result;
};

/**
 * Kiểm tra ký tự lặp lại quá nhiều lần liên tiếp
 * @param text Chuỗi cần kiểm tra
 * @param max_repeats Số lần lặp lại tối đa cho phép
 */
const has_excessive_repeats = (text: string, max_repeats: number = 5): boolean => {
  // Tạo regex kiểm tra ký tự lặp lại
  const repeated_char_regex = new RegExp(`(.)\\1{${String(max_repeats)},}`, 'u');
  return repeated_char_regex.test(text);
};

/**
 * Kiểm tra từ lặp lại quá nhiều lần liên tiếp
 * @param text Chuỗi cần kiểm tra
 * @param max_repeats Số lần lặp lại tối đa cho phép
 */
const has_repeated_words = (text: string, max_repeats: number = 3): boolean => {
  // Tách chuỗi thành mảng các từ
  const words = text.toLowerCase().split(/\s+/);
  
  // Đếm số lần lặp lại liên tiếp
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
 * Thay thế tạm thời các URL trong tin nhắn để chúng không bị ảnh hưởng bởi validator
 * @param message Tin nhắn cần xử lý
 * @returns Object chứa tin nhắn đã xử lý và mảng URL gốc
 */
const extract_urls = (message: string): { processed_message: string, urls: string[] } => {
  const urls: string[] = [];
  const processed_message = message.replace(URL_REGEX, (match) => {
    urls.push(match);
    return `[URL_${String(urls.length - 1)}]`;
  });
  
  return { processed_message, urls };
};

/**
 * Khôi phục các URL đã thay thế trước đó
 * @param processed_message Tin nhắn đã xử lý
 * @param urls Mảng URL gốc
 * @returns Tin nhắn hoàn chỉnh với các URL gốc
 */
const restore_urls = (processed_message: string, urls: string[]): string => {
  let restored = processed_message;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    // Ensure url is defined before using it
    if (typeof url !== 'string') continue;
    
    restored = restored.replace(`[URL_${String(i)}]`, url);
  }
  
  return restored;
};

/**
 * Validator chính cho tin nhắn
 * @param message Tin nhắn cần kiểm tra
 * @throws ApiError nếu tin nhắn không hợp lệ
 */
export const validate_message = (message: string): void => {
  // Kiểm tra message không bị null hoặc undefined
  if (!message || typeof message !== 'string') {
    throw new ApiError('Nội dung tin nhắn không hợp lệ', 400);
  }
  
  // Kiểm tra độ dài tin nhắn (byte length để tránh DoS bằng unicode)
  const byte_length = new TextEncoder().encode(message).length;
  if (byte_length > MAX_MESSAGE_LENGTH * 4) { // UTF-8 tối đa 4 bytes/char
    throw new ApiError('Tin nhắn quá dài', 400);
  }
  
  // Kiểm tra độ dài tin nhắn (character length)
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(`Tin nhắn không được vượt quá ${String(MAX_MESSAGE_LENGTH)} ký tự`, 400);
  }
  
  // Kiểm tra tin nhắn rỗng hoặc chỉ có khoảng trắng
  if (message.trim().length === 0) {
    throw new ApiError('Tin nhắn không được để trống', 400);
  }
  
  // 🚨 KIỂM TRA COMBINING CHARACTERS ATTACK (Zalgo text)
  // Phải check TRƯỚC khi extract URLs vì attack có thể trong bất kỳ phần nào
  const combining_analysis = analyze_combining_marks(message);
  if (combining_analysis.is_attack) {
    throw new ApiError(`Tin nhắn chứa ký tự không hợp lệ: ${combining_analysis.reason ?? 'Phát hiện tấn công'}`, 400);
  }
  
  // Trích xuất URL trước khi kiểm tra các rule khác
  const { processed_message } = extract_urls(message);
  
  // Kiểm tra ký tự lặp lại quá nhiều
  if (has_excessive_repeats(processed_message)) {
    throw new ApiError('Tin nhắn chứa quá nhiều ký tự lặp lại', 400);
  }
  
  // Kiểm tra từ lặp lại quá nhiều
  if (has_repeated_words(processed_message)) {
    throw new ApiError('Tin nhắn chứa quá nhiều từ lặp lại liên tiếp', 400);
  }
  
  // Kiểm tra ký tự hợp lệ - chỉ áp dụng cho phần không phải URL
  if (!VALID_CHARS_REGEX.test(processed_message)) {
    throw new ApiError('Tin nhắn chứa ký tự không hợp lệ', 400);
  }
};

/**
 * Kiểm tra nhanh tin nhắn, trả về kết quả thay vì throw error
 * Hữu ích trong trường hợp muốn kiểm tra nhanh mà không cần xử lý exception
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
 * @param message Tin nhắn gốc
 * @returns Tin nhắn đã được làm sạch
 */
export const sanitize_message = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return '';
  }
  
  // Cắt bớt nếu quá dài
  let sanitized = message.slice(0, MAX_MESSAGE_LENGTH);
  
  // 🚨 LOẠI BỎ COMBINING MARKS THỪA TRƯỚC
  // Đây là bước quan trọng để chống DoS attack
  sanitized = strip_excessive_combining(sanitized);
  
  // Trích xuất URL trước khi làm sạch
  const { processed_message, urls } = extract_urls(sanitized);
  
  // Xóa các ký tự không hợp lệ
  let cleaned = processed_message.replace(/[^\p{L}\p{N}\p{P}\p{Zs}\p{So}\p{Mn}\p{Mc}]/gu, '');
  
  // Xử lý ký tự lặp lại
  cleaned = cleaned.replace(/(.)\1{5,}/gu, (_match: string, char: string) => char.repeat(5));
  
  // Khôi phục URL
  sanitized = restore_urls(cleaned, urls);
  
  return sanitized.trim();
};