import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error_handler';
import { logger } from '../utils/logger';

/**
 * Store lưu trữ các request trong memory
 * Trong ứng dụng thực tế nên sử dụng Redis hoặc store phân tán khác
 */
const ip_store: Map<string, {
  count: number;
  reset_time: number;
  blocked_until?: number;
}> = new Map();

/**
 * Tạo rate limiter với các tùy chọn
 * @param max_requests Số request tối đa trong time_window
 * @param time_window Thời gian cửa sổ tính bằng giây
 * @param block_duration Thời gian chặn nếu vượt quá giới hạn (giây)
 */
export const create_rate_limiter = (
  max_requests: number = 100,
  time_window: number = 60,
  block_duration: number = 300
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Lấy IP của client hoặc key định danh khác
    const forwarded = req.headers['x-forwarded-for'];
    const client_ip = (typeof forwarded === 'string' ? forwarded : undefined) ?? 
                      req.socket.remoteAddress ?? 
                      'unknown';
    
    // Lấy thời gian hiện tại
    const now = Date.now();
    
    // Tạo hoặc lấy thông tin của client
    if (!ip_store.has(client_ip)) {
      ip_store.set(client_ip, {
        count: 0,
        reset_time: now + (time_window * 1000)
      });
    }
    
    const client_data = ip_store.get(client_ip);

    if (!client_data) {
        next();
        return;
    }
    
    // Kiểm tra nếu client đang bị chặn
    if (client_data.blocked_until !== undefined && now < client_data.blocked_until) {
      const remaining_seconds = Math.ceil((client_data.blocked_until - now) / 1000);
      
      logger.warn(`Rate limit exceeded: Client ${client_ip} is blocked. Remaining time: ${String(remaining_seconds)}s`);
      
      throw new ApiError(`Quá nhiều yêu cầu. Vui lòng thử lại sau ${String(remaining_seconds)} giây.`, 429);
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
      
      logger.warn(`Rate limit exceeded: Client ${client_ip} is now blocked for ${String(block_duration)}s`);
      
      throw new ApiError(`Quá nhiều yêu cầu. Vui lòng thử lại sau ${String(block_duration)} giây.`, 429);
    }
    
    next();
  };
};

/**
 * Rate limiter cho API chung
 */
export const api_rate_limiter = create_rate_limiter(100, 60, 300); // 100 request/phút

/**
 * Rate limiter cho tin nhắn
 * Hạn chế tần suất gửi tin nhắn
 */
export const message_rate_limiter = create_rate_limiter(20, 60, 120); // 20 message/phút

/**
 * Rate limiter nghiêm ngặt cho các endpoint nhạy cảm
 */
export const strict_rate_limiter = create_rate_limiter(20, 60, 600); // 20 request/phút, chặn 10 phút

/**
 * Định kỳ làm sạch store để tránh memory leak
 * Xóa các client không hoạt động trong thời gian dài
 */
const cleanup_interval = 1000 * 60 * 30; // 30 phút
setInterval(() => {
  const now = Date.now();
  for (const [ip, client_data] of ip_store.entries()) {
    // Xóa client không còn bị chặn và đã hết thời gian reset
    const is_blocked = client_data.blocked_until !== undefined && client_data.blocked_until > now;
    if (!is_blocked && client_data.reset_time < now) {
      ip_store.delete(ip);
    }
  }
}, cleanup_interval); 