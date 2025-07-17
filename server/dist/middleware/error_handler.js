"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register_error_handlers = exports.uncaught_exception_handler = exports.unhandled_rejection_handler = exports.error_handler = exports.not_found_handler = exports.ApiError = void 0;
const logger_1 = require("../utils/logger");
/**
 * Custom error class với status code
 */
class ApiError extends Error {
    status_code;
    constructor(message, status_code = 500) {
        super(message);
        this.name = this.constructor.name;
        this.status_code = status_code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
/**
 * Middleware bắt các lỗi 404 (Not Found)
 */
const not_found_handler = (req, res, next) => {
    const error = new ApiError(`Không tìm thấy đường dẫn: ${req.originalUrl}`, 404);
    next(error);
};
exports.not_found_handler = not_found_handler;
/**
 * Middleware xử lý các lỗi chung trong ứng dụng
 */
const error_handler = (err, req, res, next) => {
    // Lấy status code nếu có, mặc định là 500
    const status_code = err.status_code || 500;
    // Log lỗi với các thông tin phù hợp
    logger_1.logger.error(`${status_code} - ${err.message}`, err);
    // Format lỗi để trả về client
    const error_response = {
        message: err.message,
        status: status_code
    };
    // Trả về response
    res.status(status_code).json(error_response);
};
exports.error_handler = error_handler;
/**
 * Middleware bắt lỗi promise không được xử lý
 */
const unhandled_rejection_handler = (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at Promise', reason);
    // Thông thường ở đây nên kết thúc process với exit code 1
    // Nhưng trong môi trường production, có thể chỉ log và tiếp tục
    if (process.env.NODE_ENV !== 'production') {
        console.error('Shutting down due to unhandled promise rejection');
        process.exit(1);
    }
};
exports.unhandled_rejection_handler = unhandled_rejection_handler;
/**
 * Middleware bắt lỗi không được xử lý
 */
const uncaught_exception_handler = (err) => {
    logger_1.logger.error('Uncaught Exception', err);
    // Trong trường hợp có uncaught exception, nên kết thúc process
    process.exit(1);
};
exports.uncaught_exception_handler = uncaught_exception_handler;
/**
 * Đăng ký các handler cho unhandled rejection và uncaught exception
 */
const register_error_handlers = () => {
    process.on('unhandledRejection', exports.unhandled_rejection_handler);
    process.on('uncaughtException', exports.uncaught_exception_handler);
};
exports.register_error_handlers = register_error_handlers;
