"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle_new_user = exports.match_all_waiting_users = exports.match_users = exports.waiting_queue = void 0;
const conversation_1 = require("../conversation");
const logger_1 = require("../../utils/logger");
const setup_socket_server_1 = require("./setup_socket_server");
// Hàng đợi chứa socket của những người dùng đang chờ ghép đôi
exports.waiting_queue = [];
// Hàm ghép đôi hai người dùng
const match_users = async (socket1, socket2, io) => {
    try {
        logger_1.logger.info(`Ghép đôi người dùng ${socket1.id} với ${socket2.id}`);
        // Tạo cuộc trò chuyện mới
        const conversation = await (0, conversation_1.create_conversation)([socket1.id, socket2.id]);
        logger_1.logger.debug(`Đã tạo cuộc trò chuyện mới với ID ${conversation._id}`);
        // Thông báo cho cả hai người dùng về việc họ đã được ghép đôi
        socket1.emit('matched', {
            conversation_id: conversation._id,
            partner_id: socket2.id
        });
        socket2.emit('matched', {
            conversation_id: conversation._id,
            partner_id: socket1.id
        });
        // Thêm cả hai socket vào cùng một phòng
        socket1.join(conversation._id.toString());
        socket2.join(conversation._id.toString());
        // Truy cập socketStore từ server
        const socketStore = io.socketStore;
        // Cập nhật trạng thái người dùng
        (0, setup_socket_server_1.update_user_state)(socket1.id, 'matched', io, socketStore);
        (0, setup_socket_server_1.update_user_state)(socket2.id, 'matched', io, socketStore);
        // In thông tin về các phòng
        logger_1.logger.debug(`Socket ${socket1.id} đã tham gia vào phòng ${conversation._id.toString()}`);
        logger_1.logger.debug(`Socket ${socket2.id} đã tham gia vào phòng ${conversation._id.toString()}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi ghép đôi người dùng:', error);
        socket1.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
        socket2.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
        return false;
    }
};
exports.match_users = match_users;
// Hàm để ghép đôi tất cả người dùng đang chờ
const match_all_waiting_users = async (io) => {
    try {
        logger_1.logger.debug(`Bắt đầu ghép đôi tất cả người dùng. Hàng đợi hiện có ${exports.waiting_queue.length} người.`);
        // Lọc các socket không còn kết nối
        const valid_users = exports.waiting_queue.filter(socket => io.sockets.sockets.has(socket.id));
        exports.waiting_queue = valid_users;
        // Ghép đôi từng cặp người dùng
        const matched_users = new Set();
        for (let i = 0; i < exports.waiting_queue.length; i++) {
            // Bỏ qua nếu người dùng này đã được ghép đôi
            if (matched_users.has(exports.waiting_queue[i].id))
                continue;
            // Tìm người dùng tiếp theo chưa được ghép đôi
            for (let j = i + 1; j < exports.waiting_queue.length; j++) {
                if (matched_users.has(exports.waiting_queue[j].id))
                    continue;
                // Ghép đôi hai người dùng
                const match_success = await (0, exports.match_users)(exports.waiting_queue[i], exports.waiting_queue[j], io);
                if (match_success) {
                    matched_users.add(exports.waiting_queue[i].id);
                    matched_users.add(exports.waiting_queue[j].id);
                    break;
                }
            }
        }
        // Cập nhật lại hàng đợi, loại bỏ những người đã được ghép đôi
        exports.waiting_queue = exports.waiting_queue.filter(socket => !matched_users.has(socket.id));
        logger_1.logger.debug(`Đã ghép đôi ${matched_users.size / 2} cặp. Còn lại ${exports.waiting_queue.length} người đang chờ.`);
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi ghép đôi tất cả người dùng:', error);
    }
};
exports.match_all_waiting_users = match_all_waiting_users;
const handle_new_user = async (socket, io) => {
    try {
        logger_1.logger.debug(`Hàng đợi hiện tại có ${exports.waiting_queue.length} người dùng`);
        // Kiểm tra xem socket này đã nằm trong hàng đợi chưa
        const existingIndex = exports.waiting_queue.findIndex(s => s.id === socket.id);
        if (existingIndex >= 0) {
            logger_1.logger.debug(`Socket ${socket.id} đã tồn tại trong hàng đợi, không thêm vào nữa`);
            return;
        }
        // Xử lý ghép đôi ngay lập tức nếu có người đang chờ
        if (exports.waiting_queue.length > 0) {
            // Tìm người dùng đầu tiên trong hàng đợi còn kết nối
            for (let i = 0; i < exports.waiting_queue.length; i++) {
                const pair_socket = exports.waiting_queue[i];
                // Kiểm tra nếu socket này còn kết nối
                if (io.sockets.sockets.has(pair_socket.id)) {
                    // Xóa người dùng này khỏi hàng đợi
                    exports.waiting_queue.splice(i, 1);
                    // Ghép đôi hai người dùng
                    await (0, exports.match_users)(socket, pair_socket, io);
                    return;
                }
            }
            // Nếu không tìm thấy người dùng nào phù hợp, lọc lại danh sách và thêm người mới
            exports.waiting_queue = exports.waiting_queue.filter(s => io.sockets.sockets.has(s.id));
        }
        // Thêm người dùng mới vào hàng đợi
        exports.waiting_queue.push(socket);
        socket.emit('waiting');
        // Truy cập socketStore từ server
        const socketStore = io.socketStore;
        // Cập nhật trạng thái người dùng
        (0, setup_socket_server_1.update_user_state)(socket.id, 'waiting', io, socketStore);
        logger_1.logger.info(`Người dùng ${socket.id} được đưa vào hàng đợi (có ${exports.waiting_queue.length} người trong hàng đợi)`);
        // Ghép đôi tất cả người dùng đang chờ
        await (0, exports.match_all_waiting_users)(io);
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi ghép đôi người dùng:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
    }
};
exports.handle_new_user = handle_new_user;
