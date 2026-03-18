import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { IS_PRODUCTION } from '../constants/config';

/**
 * Custom error class với status code
 */
export class ApiError extends Error {
  status_code: number;
  
  constructor(message: string, status_code = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status_code = status_code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware bắt các lỗi 404 (Not Found)
 */
export const not_found_handler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new ApiError(`Không tìm thấy đường dẫn: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Middleware xử lý các lỗi chung trong ứng dụng
 */
export const error_handler = (err: Error | ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  const status_code = (err as ApiError).status_code || 500;
  
  logger.error(`${String(status_code)} - ${err.message}`, err);
  
  const error_response = {
    message: err.message,
    status: status_code
  };
  
  res.status(status_code).json(error_response);
};

/**
 * Middleware bắt lỗi promise không được xử lý
 */
export const unhandled_rejection_handler = (
  reason: Error,
  _promise: Promise<unknown>
): void => {
  logger.error('Unhandled Rejection at Promise', reason);
  if (!IS_PRODUCTION) {
    console.error('Shutting down due to unhandled promise rejection');
    process.exit(1);
  }
};

/**
 * Middleware bắt lỗi không được xử lý
 */
export const uncaught_exception_handler = (err: Error): void => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
};

/**
 * Đăng ký các handler cho unhandled rejection và uncaught exception
 */
export const register_error_handlers = (): void => {
  process.on('unhandledRejection', unhandled_rejection_handler);
  process.on('uncaughtException', uncaught_exception_handler);
}; 