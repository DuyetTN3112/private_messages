"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const setup_socket_server_1 = require("./controllers/socket/setup_socket_server");
const error_handler_1 = require("./middleware/error_handler");
const rate_limiter_1 = require("./middleware/rate_limiter");
const socket_rate_limiter_1 = require("./middleware/socket_rate_limiter");
const conversation_monitor_1 = require("./utils/conversation_monitor");
const logger_1 = require("./utils/logger");
const routes_1 = __importDefault(require("./routes"));
// Tải biến môi trường từ file .env
dotenv_1.default.config();
// Khởi tạo Express app
const app = (0, express_1.default)();
exports.app = app;
const http_server = (0, http_1.createServer)(app);
// Khởi tạo Socket.io server
const io = new socket_io_1.Server(http_server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3001',
        methods: ['GET', 'POST'],
        credentials: true
    }
});
exports.io = io;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiter cho các request HTTP
const limiter = (0, rate_limiter_1.create_rate_limiter)(100, 60, 300);
app.use(limiter);
// Cấu hình CORS
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3001',
    credentials: true
}));
// Đăng ký socket store trong app để truy cập từ API routes
const socketStore = {};
app.set('socketStore', socketStore);
app.set('io', io);
// Đăng ký routes
app.use('/', routes_1.default);
// Middleware xử lý lỗi
app.use(error_handler_1.not_found_handler);
app.use(error_handler_1.error_handler);
// Áp dụng rate limiter cho Socket.io
io.use(socket_rate_limiter_1.socket_rate_limiter);
// Lưu trữ socketStore trực tiếp trong io để dễ dàng truy cập từ các hàm khác
io.socketStore = socketStore;
// Kết nối đến MongoDB
const connect_to_db = async () => {
    try {
        // Lấy URI từ biến môi trường
        const mongo_url = process.env.MONGODB_URL;
        logger_1.logger.info(`Đang kết nối đến MongoDB: ${mongo_url}`);
        // Thiết lập tùy chọn kết nối
        const options = {
            serverSelectionTimeoutMS: 5000, // Timeout sau 5 giây nếu không thể kết nối
            socketTimeoutMS: 45000, // Timeout sau 45 giây nếu socket không phản hồi
        };
        await mongoose_1.default.connect(mongo_url, options);
        logger_1.logger.info('Kết nối đến MongoDB thành công');
    }
    catch (error) {
        logger_1.logger.error('Lỗi kết nối đến MongoDB:', error);
        logger_1.logger.error('Không thể khởi động server khi không có cơ sở dữ liệu. Hãy kiểm tra lại kết nối MongoDB.');
        process.exit(1);
    }
};
// Khởi tạo monitor cho các cuộc trò chuyện không hoạt động
let conversation_monitor;
// Khởi động server
const start_server = async () => {
    try {
        // Bắt buộc kết nối đến MongoDB trước khi tiếp tục
        await connect_to_db();
        const port = process.env.SERVER_PORT || 3000;
        http_server.listen(port, () => {
            logger_1.logger.info(`Server đang chạy trên cổng ${port}`);
            // Khởi tạo Socket.io server
            (0, setup_socket_server_1.setup_socket_server)(io, socketStore);
            // Bắt đầu theo dõi các cuộc trò chuyện không hoạt động
            conversation_monitor = (0, conversation_monitor_1.setup_conversation_monitor)(io);
            conversation_monitor.start();
        });
    }
    catch (error) {
        logger_1.logger.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
};
// Đăng ký các handler xử lý lỗi
(0, error_handler_1.register_error_handlers)();
// Khởi động server
start_server();
