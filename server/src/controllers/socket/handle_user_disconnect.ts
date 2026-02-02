import { Socket, Server } from 'socket.io';
import { waiting_queue, match_all_waiting_users } from './handle_new_user';
import { logger } from '../../utils/logger';
import { handleDisconnect } from '../../services/socket/disconnect';
import { update_user_state } from './setup_socket_server';

/**
 * Controller: Handle user disconnect
 * Thin layer - calls service then handles socket I/O
 */
export const handle_user_disconnect = async (socket: Socket, io: Server) => {
  logger.info(`Người dùng ngắt kết nối: ${socket.id}`);
  
  try {
    // Remove from waiting queue
    const updated_waiting_queue = waiting_queue.filter(s => s.id !== socket.id);
    
    if (waiting_queue.length > updated_waiting_queue.length) {
      logger.debug(`Người dùng ${socket.id} đã được xóa khỏi hàng đợi chờ`);
    }
    
    waiting_queue.length = 0;
    waiting_queue.push(...updated_waiting_queue);
    
    // Business logic in service
    const { partnerId, conversationId } = await handleDisconnect({
      socketId: socket.id
    });
    
    // Get socketStore
    let socketStore = {};
    try {
      const req = socket.request as any;
      socketStore = req.app?.get('socketStore') || {};
    } catch (error) {
      logger.error('Không thể lấy socketStore:', error);
    }
    
    // Socket I/O - notify partner if exists
    if (partnerId && conversationId) {
      const partner_socket = io.sockets.sockets.get(partnerId);
      if (partner_socket) {
        partner_socket.emit('partner-disconnected');
        
        // Add partner back to queue
        waiting_queue.push(partner_socket);
        partner_socket.emit('waiting');
        
        update_user_state(partnerId, 'waiting', io, socketStore);
        logger.info(`Đã thông báo cho người dùng ${partnerId} và đưa vào hàng đợi chờ`);
        
        // Try to match immediately
        setTimeout(() => match_all_waiting_users(io), 500);
      }
    }
    
    // Update disconnected user state
    update_user_state(socket.id, null, io, socketStore);
  } catch (error) {
    logger.error('Lỗi khi xử lý ngắt kết nối:', error);
  }
};