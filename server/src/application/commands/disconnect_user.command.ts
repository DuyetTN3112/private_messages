import { Socket, Server } from 'socket.io';
import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { logger } from '../../utils/logger';
import { update_user_state } from '../../services/socket/user_state_broadcaster';
import { storageService } from '../../services/storage/repository';
import { waiting_queue } from './find_partner.command';

export class DisconnectUserCommand implements ICommand {
  constructor(
    public readonly socket: Socket,
    public readonly io: Server
  ) {}
}

export class DisconnectUserCommandHandler implements ICommandHandler<DisconnectUserCommand> {
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute(command: DisconnectUserCommand): Promise<void> {
    const { socket, io } = command;
    logger.info(`Người dùng ngắt kết nối: ${socket.id}`);

    // Remove from waiting queue if present
    const index = waiting_queue.findIndex(s => s.id === socket.id);
    if (index !== -1) {
      waiting_queue.splice(index, 1);
      logger.info(`Đã xóa người dùng ${socket.id} khỏi hàng đợi`);
    }

    // Handle conversation cleanup if user was in one
    const conversation = storageService.findConversationByParticipant(socket.id);
    if (conversation) {
      const partner_id = conversation.participants.find(p => p !== socket.id);
      
      if (partner_id) {
        io.to(partner_id).emit('partner-disconnected');
        
        // Notify partner to update state
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = socket.request as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const socket_store = req.app?.get('socketStore') || {};
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        update_user_state(partner_id, 'waiting', io, socket_store);
      }
      
      storageService.endConversation(conversation.id);
    }
    
    // Update user state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = socket.request as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const socket_store = req.app?.get('socketStore') || {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (socket_store[socket.id]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/no-unsafe-member-access
      delete socket_store[socket.id];
      // Trigger stats update
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      update_user_state(socket.id, null, io, socket_store); 
    }
  }
}
