import { Server, Socket } from 'socket.io';
import { handle_new_user, match_all_waiting_users } from './handle_new_user';
import { handle_send_message } from './handle_send_message';
import { handle_user_disconnect } from './handle_user_disconnect';
import { socket_rate_limiter, cleanup_socket_store } from '../../middleware/socket_rate_limiter';
import { logger } from '../../utils/logger';
import { getUserStats } from '../../services/socket/stats';
import { addReaction } from '../../services/socket/reaction';

/**
 * Update and broadcast user statistics
 * Controller function - gets stats from service and broadcasts via socket
 */
const update_user_stats = (io: Server) => {
  const stats = getUserStats(io);
  
  // Socket I/O only
  io.emit('user-stats', {
    online_users: stats.online_users,
    waiting_users: stats.waiting_users
  });
};

/**
 * Update user state in store and trigger stats broadcast
 */
export const update_user_state = (
  socket_id: string, 
  state: 'waiting' | 'matched' | null, 
  io: Server, 
  socketStore: { [socket_id: string]: 'waiting' | 'matched' | null }
) => {
  if (state === null) {
    delete socketStore[socket_id];
  } else {
    socketStore[socket_id] = state;
  }
  update_user_stats(io);
};

/**
 * Handle add reaction
 * Thin controller - calls service then emits socket event
 */
const handle_add_reaction = (
  socket: Socket, 
  io: Server, 
  data: { conversation_id: string, message_index: number, emoji: string }
) => {
  try {
    const { conversation_id, message_index, emoji } = data;
    
    // Business logic in service
    addReaction({
      socketId: socket.id,
      conversationId: conversation_id,
      messageIndex: message_index,
      emoji
    }, socket, io);
    
    // Socket I/O only - broadcast reaction
    io.to(conversation_id).emit('receive-reaction', {
      message_index,
      emoji
    });
    
    logger.info(`Broadcasted reaction to room ${conversation_id}`);
  } catch (error) {
    logger.error('Error handling reaction:', error);
    socket.emit('error', { message: 'Có lỗi xảy ra khi xử lý phản ứng' });
  }
};

/**
 * Setup Socket.IO server with all event handlers
 */
export const setup_socket_server = (
  io: Server, 
  socketStore: { [socket_id: string]: 'waiting' | 'matched' | null }
) => {
  // Update stats every 10 seconds
  setInterval(() => update_user_stats(io), 10000);
  
  // Auto-match waiting users every 3 seconds
  setInterval(() => match_all_waiting_users(io), 3000);
  
  io.on('connection', (socket: Socket) => {
    // Apply rate limiter
    if (socket_rate_limiter(socket)) {
      socket.disconnect();
      return;
    }
    
    logger.info(`User connected: ${socket.id}`);
    
    // Handle new user
    handle_new_user(socket, io);
    
    // Send initial stats
    update_user_stats(io);
    
    // Message handler
    socket.on('send-message', async (message_data: { content: string }) => {
      await handle_send_message(socket, io, message_data.content);
    });
    
    // Reaction handler
    socket.on('add-reaction', (data) => {
      handle_add_reaction(socket, io, data);
    });
    
    // Find new partner handler
    socket.on('find-new-partner', () => {
      logger.info(`User ${socket.id} requesting new partner`);
      handle_new_user(socket, io);
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
      handle_user_disconnect(socket, io);
      cleanup_socket_store(socket.id);
      update_user_state(socket.id, null, io, socketStore);
      
      // Trigger immediate matching
      match_all_waiting_users(io);
    });
  });
};