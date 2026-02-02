import { Socket, Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { 
  sendMessage, 
  MessageValidationError, 
  RateLimitError, 
  ConversationNotFoundError 
} from '../../services/socket/send_message';

/**
 * Controller: Handle send message
 * Thin layer - calls service then handles socket I/O
 */
export const handle_send_message = async (socket: Socket, io: Server, content: string) => {
  try {
    // Business logic in service
    const { message, conversationId } = await sendMessage({
      socketId: socket.id,
      content
    });
    
    // Socket I/O only - broadcast to room
    logger.debug(`Broadcasting message to room ${conversationId}`);
    io.to(conversationId).emit('receive-message', {
      sender_id: socket.id,
      content: message.content,
      created_at: message.created_at
    });
    
  } catch (error) {
    // Handle specific errors
    if (error instanceof RateLimitError) {
      socket.emit('error', { message: error.message });
      return;
    }
    
    if (error instanceof MessageValidationError) {
      socket.emit('error', { message: error.message });
      return;
    }
    
    if (error instanceof ConversationNotFoundError) {
      socket.emit('error', { message: error.message });
      return;
    }
    
    // Generic error
    logger.error('Lỗi khi gửi tin nhắn:', error);
    socket.emit('error', { message: 'Có lỗi xảy ra khi gửi tin nhắn' });
  }
};