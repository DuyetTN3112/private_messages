import { Server, Socket } from 'socket.io';
import { cleanup_socket_store, socket_rate_limiter } from '../../middleware/socket_rate_limiter';
import { logger } from '../../utils/logger';

import { find_partner, remove_from_waiting_queue, waiting_queue } from '../../services/socket/find_partner';
import { send_message } from '../../services/socket/send_message';
import { add_reaction } from '../../services/socket/reaction';
import { get_user_stats } from '../../services/socket/stats';
import { update_user_state } from '../../services/socket/user_state_broadcaster';
import { storage_service } from '../../services/storage/repository';
import { AppRequest, SocketStoreType } from '../../server';
import { SOCKET_EVENTS, SERVER_EVENTS } from '../../constants/socket';
import { STATS_BROADCAST_INTERVAL_MS } from '../../constants/config';

/**
 * Setup Socket.IO server with direct service calls
 */
export const setup_socket_server = (
  io: Server
): { cleanup: () => void } => {
  const stats_interval = setInterval(() => {
    const stats = get_user_stats(io, waiting_queue.length);
    io.emit(SERVER_EVENTS.USER_STATS, {
      online_users: stats.online_users,
      waiting_users: stats.waiting_users
    });
  }, STATS_BROADCAST_INTERVAL_MS);
  
  io.on('connection', (socket: Socket) => {
    if (socket_rate_limiter(socket)) {
      socket.disconnect();
      return;
    }
    
    logger.debug(`User connected: ${socket.id}`);
    
    const req = socket.request as AppRequest;
    const socket_store = req.app.get('socketStore') as SocketStoreType | undefined ?? {};
    
    find_partner({ socket, io, socket_store });
    
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (message_data: { content: string }) => {
      try {
        const result = send_message({
          socket_id: socket.id,
          content: message_data.content
        });
        
        io.to(result.conversation_id).emit(SERVER_EVENTS.RECEIVE_MESSAGE, result.message);
        logger.debug(`Broadcasted message ${result.message.id} to room ${result.conversation_id}`);
      } catch (error: unknown) {
        logger.error(`Error processing message from ${socket.id}:`, error);
        const error_message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn';
        socket.emit(SERVER_EVENTS.ERROR, { message: error_message });
      }
    });
    
    socket.on(SOCKET_EVENTS.ADD_REACTION, (data: { conversation_id: string, message_index: number, emoji: string }) => {
      const { conversation_id, message_index, emoji } = data;
      
      try {
        const result = add_reaction({
          socket_id: socket.id,
          conversation_id,
          message_index,
          emoji
        }, socket, io);
        
        io.to(conversation_id).emit(SERVER_EVENTS.RECEIVE_REACTION, {
          message_index,
          reactions: result.reactions
        });
      } catch (error) {
        logger.error('Error handling reaction:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Có lỗi xảy ra khi xử lý phản ứng' });
      }
    });
    
    socket.on(SOCKET_EVENTS.FIND_NEW_PARTNER, () => {
      logger.debug(`User ${socket.id} requesting new partner`);
      find_partner({ socket, io, socket_store });
    });
    
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      logger.debug(`Người dùng ngắt kết nối: ${socket.id}`);
      
      remove_from_waiting_queue(socket.id);
      
      const conversation = storage_service.find_conversation_by_participant(socket.id);
      if (conversation) {
        const partner_id = conversation.participants.find(p => p !== socket.id);
        
        if (typeof partner_id === 'string' && partner_id) {
          io.to(partner_id).emit(SERVER_EVENTS.PARTNER_DISCONNECTED);
          update_user_state(partner_id, 'waiting', io, socket_store);
        }
        
        storage_service.end_conversation(conversation.id);
      }
      
      if (Object.prototype.hasOwnProperty.call(socket_store, socket.id)) {
        Reflect.deleteProperty(socket_store, socket.id);
        update_user_state(socket.id, null, io, socket_store);
      }
      
      cleanup_socket_store(socket.id);
    });
  });

  return {
    cleanup: (): void => {
      clearInterval(stats_interval);
    }
  };
};