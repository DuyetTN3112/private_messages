import { Socket, Server } from 'socket.io';
import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { logger } from '../../utils/logger';
import { update_user_state } from '../../services/socket/user_state_broadcaster';
import { storageService } from '../../services/storage/repository';
import { waiting_queue } from './find_partner.command';
import { AppRequest, SocketStoreType } from '../../server';

export class DisconnectUserCommand implements ICommand {
  constructor(
    public readonly socket: Socket,
    public readonly io: Server
  ) {}
}

export class DisconnectUserCommandHandler implements ICommandHandler<DisconnectUserCommand> {
  execute(command: DisconnectUserCommand): void {
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
      
      if (typeof partner_id === 'string' && partner_id) {
        io.to(partner_id).emit('partner-disconnected');
        
        // Notify partner to update state
        const req = socket.request as AppRequest;
        const socket_store = req.app.get('socketStore') as SocketStoreType | undefined ?? {};
        update_user_state(partner_id, 'waiting', io, socket_store);
      }
      
      storageService.endConversation(conversation.id);
    }
    
    // Update user state
    const req = socket.request as AppRequest;
    const socket_store = req.app.get('socketStore') as SocketStoreType | undefined ?? {};
    
    if (Object.prototype.hasOwnProperty.call(socket_store, socket.id)) {
      Reflect.deleteProperty(socket_store, socket.id);
      // Trigger stats update
      update_user_state(socket.id, null, io, socket_store); 
    }
  }
}
