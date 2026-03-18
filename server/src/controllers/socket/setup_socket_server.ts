import { Server, Socket } from 'socket.io';
import { cleanup_socket_store, socket_rate_limiter } from '../../middleware/socket_rate_limiter';
import { logger } from '../../utils/logger';

// Services - Direct calls (no CQRS overhead)
import { find_partner, remove_from_waiting_queue } from '../../services/socket/find_partner';
import { send_message } from '../../services/socket/send_message';
import { add_reaction } from '../../services/socket/reaction';
import { get_user_stats } from '../../services/socket/stats';
import { update_user_state } from '../../services/socket/user_state_broadcaster';
import { storage_service } from '../../services/storage/repository';
import { AppRequest, SocketStoreType } from '../../server';

/**
 * Setup Socket.IO server with direct service calls
 * Optimized for speed - no CQRS middleware layer
 */
export const setup_socket_server = (
  io: Server
): void => {
  // Update stats every 10 seconds
  setInterval(() => {
    const stats = get_user_stats(io);
    io.emit('user-stats', {
      online_users: stats.online_users,
      waiting_users: stats.waiting_users
    });
  }, 10000);
  
  io.on('connection', (socket: Socket) => {
    // Apply rate limiter
    if (socket_rate_limiter(socket)) {
      socket.disconnect();
      return;
    }
    
    logger.info(`User connected: ${socket.id}`);
    
    // Get socket store from app
    const req = socket.request as AppRequest;
    const socket_store = req.app.get('socketStore') as SocketStoreType | undefined ?? {};
    
    // Handle new user -> Find partner directly
    find_partner({ socket, io, socket_store });
    
    // Message handler - Direct service call
    socket.on('send-message', (message_data: { content: string }) => {
      try {
        const result = send_message({
          socket_id: socket.id,
          content: message_data.content
        });
        
        // Broadcast message to all participants
        io.to(result.conversation_id).emit('receive-message', result.message);
        logger.info(`Broadcasted message ${result.message.id} to room ${result.conversation_id}`);
      } catch (error: unknown) {
        logger.error(`Error processing message from ${socket.id}:`, error);
        const error_message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn';
        socket.emit('error', { message: error_message });
      }
    });
    
    // Reaction handler - Direct service call
    socket.on('add-reaction', (data: { conversation_id: string, message_index: number, emoji: string }) => {
      const { conversation_id, message_index, emoji } = data;
      
      try {
        add_reaction({
          socket_id: socket.id,
          conversation_id,
          message_index,
          emoji
        }, socket, io);
        
        // Broadcast reaction
        io.to(conversation_id).emit('receive-reaction', {
          message_index,
          emoji,
          sender_id: socket.id
        });
        
        logger.info(`Broadcasted reaction to room ${conversation_id}`);
      } catch (error) {
        logger.error('Error handling reaction:', error);
        socket.emit('error', { message: 'Có lỗi xảy ra khi xử lý phản ứng' });
      }
    });
    
    // Find new partner handler
    socket.on('find-new-partner', () => {
      logger.info(`User ${socket.id} requesting new partner`);
      find_partner({ socket, io, socket_store });
    });
    
    // Disconnect handler - Direct logic
    socket.on('disconnect', () => {
      logger.info(`Người dùng ngắt kết nối: ${socket.id}`);
      
      // Remove from waiting queue
      remove_from_waiting_queue(socket.id);
      
      // Handle conversation cleanup
      const conversation = storage_service.find_conversation_by_participant(socket.id);
      if (conversation) {
        const partner_id = conversation.participants.find(p => p !== socket.id);
        
        if (typeof partner_id === 'string' && partner_id) {
          io.to(partner_id).emit('partner-disconnected');
          update_user_state(partner_id, 'waiting', io, socket_store);
        }
        
        storage_service.end_conversation(conversation.id);
      }
      
      // Cleanup socket store
      if (Object.prototype.hasOwnProperty.call(socket_store, socket.id)) {
        Reflect.deleteProperty(socket_store, socket.id);
        update_user_state(socket.id, null, io, socket_store);
      }
      
      cleanup_socket_store(socket.id);
    });
  });
};