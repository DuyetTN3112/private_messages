"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup_conversation_monitor = exports.ConversationMonitor = void 0;
const conversation_1 = __importDefault(require("../models/conversation"));
const conversation_2 = require("../controllers/conversation");
const logger_1 = require("./logger");
/**
 * Thời gian không hoạt động tối đa cho một cuộc trò chuyện (ms)
 */
const IDLE_TIMEOUT = 60 * 1000; // 1 phút
/**
 * Khoảng thời gian kiểm tra các cuộc trò chuyện không hoạt động (ms)
 */
const CHECK_INTERVAL = 30 * 1000; // 30 giây
/**
 * Tiện ích giám sát và kết thúc các cuộc trò chuyện không hoạt động
 */
class ConversationMonitor {
    io;
    interval_id = null;
    constructor(io) {
        this.io = io;
    }
    /**
     * Bắt đầu giám sát các cuộc trò chuyện
     */
    start() {
        logger_1.logger.info('Bắt đầu giám sát các cuộc trò chuyện không hoạt động');
        // Đảm bảo không có nhiều interval chạy cùng lúc
        if (this.interval_id) {
            clearInterval(this.interval_id);
        }
        // Thiết lập interval để kiểm tra định kỳ
        this.interval_id = setInterval(() => {
            this.check_idle_conversations();
        }, CHECK_INTERVAL);
    }
    /**
     * Dừng giám sát các cuộc trò chuyện
     */
    stop() {
        if (this.interval_id) {
            clearInterval(this.interval_id);
            this.interval_id = null;
            logger_1.logger.info('Đã dừng giám sát các cuộc trò chuyện');
        }
    }
    /**
     * Kiểm tra và kết thúc các cuộc trò chuyện không hoạt động
     */
    async check_idle_conversations() {
        try {
            const now = new Date();
            const idle_threshold = new Date(now.getTime() - IDLE_TIMEOUT);
            // Tìm các cuộc trò chuyện không hoạt động
            const idle_conversations = await conversation_1.default.find({
                is_active: true,
                last_activity: { $lt: idle_threshold }
            });
            logger_1.logger.debug(`Tìm thấy ${idle_conversations.length} cuộc trò chuyện không hoạt động`);
            // Kết thúc từng cuộc trò chuyện
            for (const conversation of idle_conversations) {
                try {
                    // Thông báo cho các thành viên về việc cuộc trò chuyện kết thúc
                    for (const participant_id of conversation.participants) {
                        const socket = this.io.sockets.sockets.get(participant_id);
                        if (socket) {
                            logger_1.logger.info(`Thông báo timeout cho người dùng ${participant_id}`);
                            socket.emit('conversation-timeout', {
                                conversation_id: conversation._id.toString(),
                                message: 'Cuộc trò chuyện đã kết thúc do không hoạt động trong 1 phút'
                            });
                            // Không cần gửi sự kiện 'waiting' vì client sẽ tự động kết nối lại
                        }
                    }
                    // Kết thúc cuộc trò chuyện
                    await (0, conversation_2.end_conversation)(conversation._id.toString());
                    logger_1.logger.info(`Đã kết thúc cuộc trò chuyện ${conversation._id} do không hoạt động`);
                }
                catch (error) {
                    logger_1.logger.error(`Lỗi khi kết thúc cuộc trò chuyện ${conversation._id}:`, error);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Lỗi khi kiểm tra các cuộc trò chuyện không hoạt động:', error);
        }
    }
}
exports.ConversationMonitor = ConversationMonitor;
/**
 * Tạo và khởi động bộ giám sát cuộc trò chuyện
 */
const setup_conversation_monitor = (io) => {
    const monitor = new ConversationMonitor(io);
    monitor.start();
    return monitor;
};
exports.setup_conversation_monitor = setup_conversation_monitor;
