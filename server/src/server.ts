import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { setup_socket_server } from './controllers/socket';
import routes from './routes';
import { error_handler } from './middleware/error_handler';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { setup_conversation_monitor } from './utils/conversation_monitor';
import { storageService } from './services/storage/repository';
import { setupCqrs } from './config/cqrs_setup';

// Cấu hình dotenv
dotenv.config();

// Initialize CQRS
setupCqrs();

// Tạo Express app
const app = express();

// Middleware và cấu hình
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Định tuyến API
app.use('/api', routes);

// Xử lý lỗi chung
app.use(error_handler);

// Tạo HTTP server
const server = http.createServer(app);

// Khởi tạo Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket store để lưu trữ trạng thái người dùng
const socket_store: { [socket_id: string]: 'waiting' | 'matched' | null } = {};

// Gắn socketStore vào app để có thể truy cập từ các route
app.set('socketStore', socket_store);
// Gắn io vào app
app.set('io', io);

// Cấu hình để socket request có thể truy cập Express app
// eslint-disable-next-line @typescript-eslint/no-explicit-any
io.use((socket: any, next) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (socket.request).app = app;
  next();
});

// Cấu hình Socket.io
setup_socket_server(io, socket_store);

// Khởi động monitor cho các cuộc trò chuyện không hoạt động
setup_conversation_monitor(io);

// Khởi động server - KHÔNG CẦN database connection!
const SERVER_PORT = process.env['PORT'] || process.env['SERVER_PORT'] || 3000;

server.listen(SERVER_PORT, () => {
  logger.info(`Server đang chạy trên cổng ${SERVER_PORT}`);
  logger.info('✅ Sử dụng in-memory storage - ZERO external dependencies');
  logger.info(`📊 Storage stats: ${JSON.stringify(storageService.getStats())}`);
});

// Graceful shutdown - cleanup in-memory data
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, cleaning up...');
  storageService.clear();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Export cho testing
export { app, server }; 