/**
 * Find Partner Service
 * Manages the waiting queue and matching algorithm.
 */

import { Socket, Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { match_users } from './match';
import { update_user_state } from './user_state_broadcaster';
import { SERVER_EVENTS } from '../../constants/socket';

export const waiting_queue: Socket[] = [];
const waiting_socket_ids = new Set<string>();

export interface FindPartnerInput {
  readonly socket: Socket;
  readonly io: Server;
  readonly socket_store: Record<string, 'waiting' | 'matched' | null>;
}

export interface FindPartnerOutput {
  readonly added_to_queue: boolean;
}

export const find_partner = (input: FindPartnerInput): FindPartnerOutput => {
  const { socket, io, socket_store } = input;

  if (waiting_socket_ids.has(socket.id)) {
    return { added_to_queue: false };
  }

  waiting_queue.push(socket);
  waiting_socket_ids.add(socket.id);
  socket.emit(SERVER_EVENTS.WAITING);

  update_user_state(socket.id, 'waiting', io, socket_store);

  match_all_waiting_users(io, socket_store);

  return { added_to_queue: true };
};

export const remove_from_waiting_queue = (socket_id: string): boolean => {
  waiting_socket_ids.delete(socket_id);

  const index = waiting_queue.findIndex(s => s.id === socket_id);
  if (index !== -1) {
    waiting_queue.splice(index, 1);
    return true;
  }
  return false;
};

const match_all_waiting_users = (
  io: Server, 
  socket_store: Record<string, 'waiting' | 'matched' | null>
): void => {
  let matched_count = 0;
  
  while (waiting_queue.length >= 2) {
    const socket1 = waiting_queue.shift();
    const socket2 = waiting_queue.shift();
    
    if (socket1 && socket2) {
      waiting_socket_ids.delete(socket1.id);
      waiting_socket_ids.delete(socket2.id);

      if (!socket1.connected || !socket2.connected) {
        if (socket1.connected) {
          waiting_queue.unshift(socket1);
          waiting_socket_ids.add(socket1.id);
        }
        if (socket2.connected) {
          waiting_queue.unshift(socket2);
          waiting_socket_ids.add(socket2.id);
        }
        continue;
      }

      const success = match_two_users(socket1, socket2, io, socket_store);
      if (success) {
        matched_count++;
      } else {
        waiting_queue.unshift(socket2, socket1);
        waiting_socket_ids.add(socket1.id);
        waiting_socket_ids.add(socket2.id);
        break;
      }
    }
  }

  if (matched_count > 0) {
    logger.debug(`Đã ghép đôi ${String(matched_count)} cặp. Còn lại ${String(waiting_queue.length)} người đang chờ.`);
  }
};

const match_two_users = (
  socket1: Socket, 
  socket2: Socket, 
  io: Server,
  socket_store: Record<string, 'waiting' | 'matched' | null>
): boolean => {
  try {
    const { conversation } = match_users({
      user1_socket_id: socket1.id,
      user2_socket_id: socket2.id
    });
    
    socket1.emit(SERVER_EVENTS.MATCHED, {
      conversation_id: conversation.id,
      partner_id: socket2.id
    });
    
    socket2.emit(SERVER_EVENTS.MATCHED, {
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
    socket1.emit(SERVER_EVENTS.ERROR, { message: 'Có lỗi xảy ra khi ghép đôi' });
    socket2.emit(SERVER_EVENTS.ERROR, { message: 'Có lỗi xảy ra khi ghép đôi' });
    return false;
  }
};
