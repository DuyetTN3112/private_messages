/**
 * Find Partner Service
 * 
 * Business logic for matching users into conversations.
 * Manages the waiting queue and matching algorithm.
 */

import { Socket, Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { matchUsers } from './match';
import { update_user_state } from './user_state_broadcaster';

// Singleton queue for matching
// In a real app with multiple instances, this should be Redis
export const waiting_queue: Socket[] = [];

export interface FindPartnerInput {
  readonly socket: Socket;
  readonly io: Server;
  readonly socket_store: Record<string, 'waiting' | 'matched' | null>;
}

export interface FindPartnerOutput {
  readonly added_to_queue: boolean;
}

/**
 * Find a partner for the user
 * 
 * Business Rules:
 * - Add user to waiting queue if not already in
 * - Emit 'waiting' event to user
 * - Try to match with another waiting user
 */
export const find_partner = async (input: FindPartnerInput): Promise<FindPartnerOutput> => {
  const { socket, io, socket_store } = input;
  
  logger.info(`Người dùng mới kết nối: ${socket.id}`);
  
  // Check if user is already in queue
  if (waiting_queue.find(s => s.id === socket.id)) {
    return { added_to_queue: false };
  }

  // Add user to queue
  waiting_queue.push(socket);
  socket.emit('waiting');
  
  // Update state
  update_user_state(socket.id, 'waiting', io, socket_store);
  
  logger.info(`Đã thêm người dùng ${socket.id} vào hàng đợi. Tổng số người đang chờ: ${String(waiting_queue.length)}`);
  
  // Try to match users
  await match_all_waiting_users(io, socket_store);
  
  return { added_to_queue: true };
};

/**
 * Remove user from waiting queue
 */
export const remove_from_waiting_queue = (socket_id: string): boolean => {
  const index = waiting_queue.findIndex(s => s.id === socket_id);
  if (index !== -1) {
    waiting_queue.splice(index, 1);
    logger.info(`Đã xóa người dùng ${socket_id} khỏi hàng đợi`);
    return true;
  }
  return false;
};

/**
 * Match all waiting users in the queue
 */
const match_all_waiting_users = async (
  io: Server, 
  socket_store: Record<string, 'waiting' | 'matched' | null>
): Promise<void> => {
  logger.debug(`Bắt đầu ghép đôi tất cả người dùng. Hàng đợi hiện có ${String(waiting_queue.length)} người.`);
  let matched_count = 0;
  
  while (waiting_queue.length >= 2) {
    const socket1 = waiting_queue.shift();
    const socket2 = waiting_queue.shift();
    
    if (socket1 && socket2) {
      if (!socket1.connected || !socket2.connected) {
        if (socket1.connected) waiting_queue.unshift(socket1);
        if (socket2.connected) waiting_queue.unshift(socket2);
        continue;
      }

      const success = await match_two_users(socket1, socket2, io, socket_store);
      if (success) {
        matched_count++;
      } else {
        waiting_queue.unshift(socket2, socket1);
        break;
      }
    }
  }
  
  if (matched_count > 0) {
    logger.debug(`Đã ghép đôi ${String(matched_count)} cặp. Còn lại ${String(waiting_queue.length)} người đang chờ.`);
  }
};

/**
 * Match two specific users
 */
const match_two_users = async (
  socket1: Socket, 
  socket2: Socket, 
  io: Server,
  socket_store: Record<string, 'waiting' | 'matched' | null>
): Promise<boolean> => {
  try {
    const { conversation } = await matchUsers({
      user1SocketId: socket1.id,
      user2SocketId: socket2.id
    });
    
    socket1.emit('matched', {
      conversation_id: conversation.id,
      partner_id: socket2.id
    });
    
    socket2.emit('matched', {
      conversation_id: conversation.id,
      partner_id: socket1.id
    });
    
    void socket1.join(conversation.id);
    void socket2.join(conversation.id);
    
    update_user_state(socket1.id, 'matched', io, socket_store);
    update_user_state(socket2.id, 'matched', io, socket_store);
    
    return true;
  } catch (error) {
    logger.error('Lỗi khi ghép đôi người dùng:', error);
    socket1.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
    socket2.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
    return false;
  }
};
