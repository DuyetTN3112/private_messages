import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { setup_socket_server } from './controllers/socket/setup_socket_server';
import routes from './routes/index';
import { error_handler } from './middleware/error_handler';
import { logger } from './utils/logger';
import { setup_conversation_monitor } from './utils/conversation_monitor';
import { storage_service } from './services/storage/repository';
import { DEFAULT_PORT } from './constants/config';

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

// Socket store type definition
export type SocketStoreType = Record<string, 'waiting' | 'matched' | null>;

// Socket store để lưu trữ trạng thái người dùng
const socket_store: SocketStoreType = {};

// Gắn socketStore vào app để có thể truy cập từ các route
app.set('socketStore', socket_store);
// Gắn io vào app
app.set('io', io);

// Interface cho Request extended
export interface AppRequest extends http.IncomingMessage {
  app: express.Application;
}

// Cấu hình để socket request có thể truy cập Express app
io.use((socket: Socket, next) => {
  (socket.request as AppRequest).app = app;
  next();
});

// Cấu hình Socket.io
setup_socket_server(io);

// Khởi động monitor cho các cuộc trò chuyện không hoạt động
setup_conversation_monitor(io);

// Khởi động server
const SERVER_PORT = process.env['PORT'] ?? DEFAULT_PORT;

server.listen(SERVER_PORT, () => {
  logger.info(`Server đang chạy trên cổng ${String(SERVER_PORT)}`);
  logger.info('✅ In-memory storage - ZERO external dependencies');
  logger.info(`📊 Storage stats: ${JSON.stringify(storage_service.get_stats())}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, cleaning up...');
  storage_service.clear();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, server }; 