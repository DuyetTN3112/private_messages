import { Socket, Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { matchUsers } from '../../services/socket/match';
import { update_user_state } from './setup_socket_server';

// Hàng đợi chứa socket của những người dùng đang chờ ghép đôi
export let waiting_queue: Socket[] = [];

/**
 * Controller: Match two users
 * Thin layer - calls service then handles socket I/O
 */
export const match_users = async (socket1: Socket, socket2: Socket, io: Server) => {
  try {
    // Business logic in service
    const { conversation } = await matchUsers({
      user1SocketId: socket1.id,
      user2SocketId: socket2.id
    });
    
    // Socket I/O only - notify users
    socket1.emit('matched', {
      conversation_id: conversation.id,
      partner_id: socket2.id
    });
    
    socket2.emit('matched', {
      conversation_id: conversation.id,
      partner_id: socket1.id
    });
    
    // Join rooms
    socket1.join(conversation.id);
    socket2.join(conversation.id);
    
    // Update state
    const req = socket1.request as any;
    const socketStore = req.app?.get('socketStore') || {};
    update_user_state(socket1.id, 'matched', io, socketStore);
    update_user_state(socket2.id, 'matched', io, socketStore);
    
    return true;
  } catch (error) {
    logger.error('Lỗi khi ghép đôi người dùng:', error);
    socket1.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
    socket2.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
    return false;
  }
};

// Hàm xử lý người dùng mới tham gia
export const handle_new_user = async (socket: Socket, io: Server) => {
  logger.info(`Người dùng mới kết nối: ${socket.id}`);
  
  // Thêm người dùng vào hàng đợi
  waiting_queue.push(socket);
  socket.emit('waiting');
  
  // Lấy socketStore
  const req = socket.request as any;
  const socketStore = req.app?.get('socketStore') || {};
  
  // Cập nhật trạng thái
  update_user_state(socket.id, 'waiting', io, socketStore);
  
  logger.info(`Đã thêm người dùng ${socket.id} vào hàng đợi. Tổng số người đang chờ: ${waiting_queue.length}`);
  
  // Thử ghép đôi
  await match_all_waiting_users(io);
};

// Hàm ghép đôi tất cả người dùng đang chờ
export const match_all_waiting_users = async (io: Server) => {
  logger.debug(`Bắt đầu ghép đôi tất cả người dùng. Hàng đợi hiện có ${waiting_queue.length} người.`);
  
  let matched_count = 0;
  
  while (waiting_queue.length >= 2) {
    const socket1 = waiting_queue.shift();
    const socket2 = waiting_queue.shift();
    
    if (socket1 && socket2) {
      const success = await match_users(socket1, socket2, io);
      if (success) {
        matched_count++;
      } else {
        // If matching failed put them back
        waiting_queue.unshift(socket2, socket1);
        break;
      }
    }
  }
  
  logger.debug(`Đã ghép đôi ${matched_count} cặp. Còn lại ${waiting_queue.length} người đang chờ.`);
};