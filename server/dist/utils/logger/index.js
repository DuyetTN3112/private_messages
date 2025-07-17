"use strict";
/**
 * Logger module cho ứng dụng
 * Phân biệt môi trường development và production
 * - Development: Log chi tiết lỗi
 * - Production: Log tổng quát, không tiết lộ chi tiết nhạy cảm
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.format_error_for_client = exports.logger = void 0;
// Kiểm tra môi trường
const is_production = process.env.NODE_ENV === 'production';
/**
 * Logger cho môi trường development
 */
const dev_logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARNING] ${message}`, ...args);
    },
    error: (message, error, ...args) => {
        console.error(`[ERROR] ${message}`, error, ...args);
    },
    debug: (message, ...args) => {
        console.log(`[DEBUG] ${message}`, ...args);
    },
    // Log client-side chỉ trong development
    client_error: (message, error) => {
        console.error(`[CLIENT ERROR] ${message}`, error);
    }
};
/**
 * Logger cho môi trường production
 * Không log chi tiết lỗi, chỉ log thông tin chung
 */
const prod_logger = {
    info: (message) => {
        console.log(`[INFO] ${message}`);
    },
    warn: (message) => {
        console.warn(`[WARNING] ${message}`);
    },
    error: (message, error) => {
        // Log ID của lỗi để có thể tìm kiếm trong log system
        const error_id = generate_error_id();
        console.error(`[ERROR] ${message} (ID: ${error_id})`);
        // Ở đây có thể thêm các dịch vụ log như Sentry, LogRocket, etc.
    },
    debug: () => { }, // Không log debug trong production
    // Log client-side trong production không hiển thị chi tiết
    client_error: (message) => {
        // Không log chi tiết lỗi client-side trong production
    }
};
/**
 * Tạo ID duy nhất cho lỗi để dễ dàng tra cứu
 */
const generate_error_id = () => {
    return `err_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};
/**
 * Chọn logger phù hợp với môi trường
 */
exports.logger = is_production ? prod_logger : dev_logger;
/**
 * Format lỗi để hiển thị cho client
 * - Trong development: Trả về thông tin chi tiết
 * - Trong production: Trả về thông báo chung
 */
const format_error_for_client = (error) => {
    if (is_production) {
        return {
            message: 'Có lỗi xảy ra, vui lòng thử lại sau.'
        };
    }
    else {
        return {
            message: error.message || 'Lỗi không xác định',
            details: error.stack || error
        };
    }
};
exports.format_error_for_client = format_error_for_client;
exports.default = exports.logger;
