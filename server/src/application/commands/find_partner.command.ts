import { Socket, Server } from 'socket.io';
import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { logger } from '../../utils/logger';
import { matchUsers } from '../../services/socket/match';
import { update_user_state } from '../../services/socket/user_state_broadcaster';
import { AppRequest, SocketStoreType } from '../../server';

// Singleton queue for matching
// In a real app with multiple instances, this should be Redis
export const waiting_queue: Socket[] = [];

export class FindPartnerCommand implements ICommand {
  constructor(
    public readonly socket: Socket,
    public readonly io: Server
  ) {}
}

export class FindPartnerCommandHandler implements ICommandHandler<FindPartnerCommand, boolean> {
  async execute(command: FindPartnerCommand): Promise<boolean> {
    const { socket, io } = command;
    
    logger.info(`Người dùng mới kết nối: ${socket.id}`);
    
    // Check if user is already in queue
    if (waiting_queue.find(s => s.id === socket.id)) {
      return false;
    }

    // Add user to queue
    waiting_queue.push(socket);
    socket.emit('waiting');
    
    // Update state
    const req = socket.request as AppRequest;
    const socket_store = req.app.get('socketStore') as SocketStoreType | undefined ?? {};
    update_user_state(socket.id, 'waiting', io, socket_store);
    
    logger.info(`Đã thêm người dùng ${socket.id} vào hàng đợi. Tổng số người đang chờ: ${String(waiting_queue.length)}`);
    
    // Try to match users
    await this.match_all_waiting_users(io);
    
    return true;
  }

  private async match_all_waiting_users(io: Server): Promise<void> {
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

        const success = await this.match_users(socket1, socket2, io);
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
  }

  private async match_users(socket1: Socket, socket2: Socket, io: Server): Promise<boolean> {
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
      
      const req = socket1.request as AppRequest;
      const socket_store = req.app.get('socketStore') as SocketStoreType | undefined ?? {};
      update_user_state(socket1.id, 'matched', io, socket_store);
      update_user_state(socket2.id, 'matched', io, socket_store);
      
      return true;
    } catch (error) {
      logger.error('Lỗi khi ghép đôi người dùng:', error);
      socket1.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
      socket2.emit('error', { message: 'Có lỗi xảy ra khi ghép đôi' });
      return false;
    }
  }
}
