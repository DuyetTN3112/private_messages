"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle_send_message = void 0;
const conversation_1 = require("../conversation");
const message_1 = require("../message");
const logger_1 = require("../../utils/logger");
const message_validator_1 = require("../../validators/message_validator");
const socket_rate_limiter_1 = require("../../middleware/socket_rate_limiter");
const handle_send_message = async (socket, io, content) => {
    try {
        logger_1.logger.debug(`Socket ${socket.id} đang gửi tin nhắn: "${content}"`);
        // Kiểm tra rate limit
        if ((0, socket_rate_limiter_1.should_rate_limit_message)(socket.id)) {
            socket.emit('error', { message: 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.' });
            logger_1.logger.warn(`Rate limit triggered for socket ${socket.id}`);
            return;
        }
        // Kiểm tra và làm sạch nội dung tin nhắn
        try {
            // Validate tin nhắn
            (0, message_validator_1.validate_message)(content);
        }
        catch (error) {
            socket.emit('error', { message: error.message || 'Nội dung tin nhắn không hợp lệ' });
            logger_1.logger.warn(`Invalid message from socket ${socket.id}: ${error.message}`);
            return;
        }
        // Làm sạch nội dung
        const sanitized_content = (0, message_validator_1.sanitize_message)(content);
        // Tìm cuộc trò chuyện của người dùng
        const conversation = await (0, conversation_1.get_conversation_by_participant)(socket.id);
        if (!conversation) {
            logger_1.logger.error(`Không tìm thấy cuộc trò chuyện cho socket ${socket.id}`);
            socket.emit('error', { message: 'Không tìm thấy cuộc trò chuyện' });
            return;
        }
        logger_1.logger.debug(`Tìm thấy cuộc trò chuyện ${conversation._id} cho socket ${socket.id}`);
        // Lưu tin nhắn vào cơ sở dữ liệu
        const message = await (0, message_1.save_message)(conversation._id.toString(), socket.id, sanitized_content);
        logger_1.logger.debug(`Đã lưu tin nhắn vào cơ sở dữ liệu với ID ${message._id}`);
        // Hiển thị tất cả các phòng mà socket này tham gia
        const socketRooms = Array.from(io.sockets.adapter.sids.get(socket.id) || []);
        logger_1.logger.debug(`Socket ${socket.id} đang ở trong các phòng: ${socketRooms.join(', ')}`);
        // Lấy danh sách các socket trong phòng
        const room = io.sockets.adapter.rooms.get(conversation._id.toString());
        const socketsInRoom = room ? Array.from(room) : [];
        logger_1.logger.debug(`Các socket trong phòng ${conversation._id}: ${socketsInRoom.join(', ')}`);
        // Gửi tin nhắn cho tất cả người tham gia trong cuộc trò chuyện
        logger_1.logger.debug(`Gửi tin nhắn đến phòng ${conversation._id.toString()}`);
        io.to(conversation._id.toString()).emit('receive-message', {
            sender_id: socket.id,
            content: sanitized_content,
            created_at: message.created_at
        });
        // Không gửi trực tiếp cho đối tác nữa vì sẽ gây ra trùng lặp tin nhắn
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi gửi tin nhắn:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi gửi tin nhắn' });
    }
};
exports.handle_send_message = handle_send_message;
