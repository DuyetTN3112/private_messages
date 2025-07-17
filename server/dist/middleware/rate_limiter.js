"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strict_rate_limiter = exports.message_rate_limiter = exports.api_rate_limiter = exports.create_rate_limiter = void 0;
const error_handler_1 = require("./error_handler");
const logger_1 = require("../utils/logger");
/**
 * Store lưu trữ các request trong memory
 * Trong ứng dụng thực tế nên sử dụng Redis hoặc store phân tán khác
 */
const ip_store = {};
/**
 * Tạo rate limiter với các tùy chọn
 * @param max_requests Số request tối đa trong time_window
 * @param time_window Thời gian cửa sổ tính bằng giây
 * @param block_duration Thời gian chặn nếu vượt quá giới hạn (giây)
 */
const create_rate_limiter = (max_requests = 100, time_window = 60, block_duration = 300) => {
    return (req, res, next) => {
        // Lấy IP của client hoặc key định danh khác
        const client_ip = req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            'unknown';
        // Lấy thời gian hiện tại
        const now = Date.now();
        // Tạo hoặc lấy thông tin của client
        if (!ip_store[client_ip]) {
            ip_store[client_ip] = {
                count: 0,
                reset_time: now + (time_window * 1000)
            };
        }
        const client_data = ip_store[client_ip];
        // Kiểm tra nếu client đang bị chặn
        if (client_data.blocked_until && now < client_data.blocked_until) {
            const remaining_seconds = Math.ceil((client_data.blocked_until - now) / 1000);
            logger_1.logger.warn(`Rate limit exceeded: Client ${client_ip} is blocked. Remaining time: ${remaining_seconds}s`);
            throw new error_handler_1.ApiError(`Quá nhiều yêu cầu. Vui lòng thử lại sau ${remaining_seconds} giây.`, 429);
        }
        // Reset counter nếu đã hết thời gian
        if (now > client_data.reset_time) {
            client_data.count = 0;
            client_data.reset_time = now + (time_window * 1000);
        }
        // Tăng counter
        client_data.count++;
        // Thêm headers cho rate limit
        res.setHeader('X-RateLimit-Limit', max_requests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max_requests - client_data.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(client_data.reset_time / 1000));
        // Kiểm tra nếu vượt quá giới hạn
        if (client_data.count > max_requests) {
            // Thiết lập thời gian chặn
            client_data.blocked_until = now + (block_duration * 1000);
            logger_1.logger.warn(`Rate limit exceeded: Client ${client_ip} is now blocked for ${block_duration}s`);
            throw new error_handler_1.ApiError(`Quá nhiều yêu cầu. Vui lòng thử lại sau ${block_duration} giây.`, 429);
        }
        next();
    };
};
exports.create_rate_limiter = create_rate_limiter;
/**
 * Rate limiter cho API chung
 */
exports.api_rate_limiter = (0, exports.create_rate_limiter)(100, 60, 300); // 100 request/phút
/**
 * Rate limiter cho tin nhắn
 * Hạn chế tần suất gửi tin nhắn
 */
exports.message_rate_limiter = (0, exports.create_rate_limiter)(20, 60, 120); // 20 message/phút
/**
 * Rate limiter nghiêm ngặt cho các endpoint nhạy cảm
 */
exports.strict_rate_limiter = (0, exports.create_rate_limiter)(20, 60, 600); // 20 request/phút, chặn 10 phút
/**
 * Định kỳ làm sạch store để tránh memory leak
 * Xóa các client không hoạt động trong thời gian dài
 */
const cleanup_interval = 1000 * 60 * 30; // 30 phút
setInterval(() => {
    const now = Date.now();
    Object.keys(ip_store).forEach(ip => {
        const client_data = ip_store[ip];
        // Xóa client không còn bị chặn và đã hết thời gian reset
        if ((!client_data.blocked_until || client_data.blocked_until < now) && client_data.reset_time < now) {
            delete ip_store[ip];
        }
    });
}, cleanup_interval);
