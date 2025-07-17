"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle_user_disconnect = void 0;
const conversation_1 = require("../conversation");
const handle_new_user_1 = require("./handle_new_user");
const logger_1 = require("../../utils/logger");
const setup_socket_server_1 = require("./setup_socket_server");
const handle_user_disconnect = async (socket, io) => {
    logger_1.logger.info(`Người dùng ngắt kết nối: ${socket.id}`);
    try {
        // Xóa người dùng khỏi hàng đợi nếu họ đang trong hàng đợi
        const updated_waiting_queue = handle_new_user_1.waiting_queue.filter(s => s.id !== socket.id);
        if (handle_new_user_1.waiting_queue.length > updated_waiting_queue.length) {
            logger_1.logger.debug(`Người dùng ${socket.id} đã được xóa khỏi hàng đợi chờ`);
        }
        handle_new_user_1.waiting_queue.length = 0;
        handle_new_user_1.waiting_queue.push(...updated_waiting_queue);
        // Tìm cuộc trò chuyện của người dùng
        const conversation = await (0, conversation_1.get_conversation_by_participant)(socket.id);
        // Truy cập socketStore từ server
        const socketStore = io.socketStore;
        if (conversation) {
            // Tìm người còn lại trong cuộc trò chuyện
            const partner_id = conversation.participants.find(p => p !== socket.id);
            if (partner_id) {
                // Thông báo cho người còn lại rằng đối phương đã ngắt kết nối
                const partner_socket = io.sockets.sockets.get(partner_id);
                if (partner_socket) {
                    partner_socket.emit('partner-disconnected');
                    // Đưa người còn lại vào lại hàng đợi
                    handle_new_user_1.waiting_queue.push(partner_socket);
                    partner_socket.emit('waiting');
                    // Cập nhật trạng thái người dùng
                    (0, setup_socket_server_1.update_user_state)(partner_id, 'waiting', io, socketStore);
                    logger_1.logger.info(`Đã thông báo cho người dùng ${partner_id} và đưa vào hàng đợi chờ`);
                    // Thử ghép đôi ngay lập tức
                    setTimeout(() => (0, handle_new_user_1.match_all_waiting_users)(io), 500);
                }
            }
            // Kết thúc cuộc trò chuyện và xóa tất cả tin nhắn
            await (0, conversation_1.end_conversation)(conversation._id.toString());
        }
        // Cập nhật trạng thái người dùng ngắt kết nối
        (0, setup_socket_server_1.update_user_state)(socket.id, null, io, socketStore);
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi xử lý ngắt kết nối:', error);
    }
};
exports.handle_user_disconnect = handle_user_disconnect;
