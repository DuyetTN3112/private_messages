/**
 * Logger module cho ứng dụng
 * Phân biệt môi trường development và production
 * - Development: Log chi tiết lỗi
 * - Production: Log tổng quát, không tiết lộ chi tiết nhạy cảm
 */

// Kiểm tra môi trường
const is_production = process.env['NODE_ENV'] === 'production';

/**
 * Logger cho môi trường development
 */
const dev_logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARNING] ${message}`, ...args);
  },
  error: (message: string, error: unknown, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, error, ...args);
  },
  debug: (message: string, ...args: unknown[]): void => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
  // Log client-side chỉ trong development
  client_error: (message: string, error: unknown): void => {
    console.error(`[CLIENT ERROR] ${message}`, error);
  }
};

/**
 * Logger cho môi trường production
 * Không log chi tiết lỗi, chỉ log thông tin chung
 */
const prod_logger = {
  info: (message: string): void => {
    console.log(`[INFO] ${message}`);
  },
  warn: (message: string): void => {
    console.warn(`[WARNING] ${message}`);
  },
  error: (message: string, _error: unknown): void => {
    // Log ID của lỗi để có thể tìm kiếm trong log system
    const error_id = generate_error_id();
    console.error(`[ERROR] ${message} (ID: ${error_id})`);
    
    // Ở đây có thể thêm các dịch vụ log như Sentry, LogRocket, etc.
  },
  debug: (): void => {}, // Không log debug trong production
  // Log client-side trong production không hiển thị chi tiết
  client_error: (_message: string): void => {
    // Không log chi tiết lỗi client-side trong production
  }
};

/**
 * Tạo ID duy nhất cho lỗi để dễ dàng tra cứu
 */
const generate_error_id = (): string => {
  return `err_${String(Date.now())}_${String(Math.floor(Math.random() * 1000))}`;
};

/**
 * Chọn logger phù hợp với môi trường
 */
export const logger = is_production ? prod_logger : dev_logger;

/**
 * Format lỗi để hiển thị cho client
 * - Trong development: Trả về thông tin chi tiết
 * - Trong production: Trả về thông báo chung
 */
export const format_error_for_client = (error: unknown): { message: string, details?: unknown } => {
  if (is_production) {
    return {
      message: 'Có lỗi xảy ra, vui lòng thử lại sau.'
    };
  } else {
    const error_message = error instanceof Error ? error.message : String(error);
    const error_stack = error instanceof Error ? error.stack : undefined;
    
    return {
      message: error_message || 'Lỗi không xác định',
      details: error_stack ?? error
    };
  }
};

export default logger; 