import { Server, Socket } from 'socket.io';
import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { logger } from '../../utils/logger';
import { addReaction } from '../../services/socket/reaction';

export class AddReactionCommand implements ICommand {
  constructor(
    public readonly socket: Socket,
    public readonly io: Server,
    public readonly conversation_id: string,
    public readonly message_index: number,
    public readonly emoji: string
  ) {}
}

export class AddReactionCommandHandler implements ICommandHandler<AddReactionCommand> {
  async execute(command: AddReactionCommand): Promise<void> {

    await Promise.resolve();
    const { socket, io, conversation_id, message_index, emoji } = command;

    try {
      // Business logic in service
      addReaction({
        socketId: socket.id,
        conversationId: conversation_id,
        messageIndex: message_index,
        emoji
      }, socket, io);
      
      // Socket I/O only - broadcast reaction
      io.to(conversation_id).emit('receive-reaction', {
        message_index: message_index,
        emoji,
        sender_id: socket.id
      });
      
      logger.info(`Broadcasted reaction to room ${conversation_id}`);
    } catch (error) {
      logger.error('Error handling reaction:', error);
      socket.emit('error', { message: 'Có lỗi xảy ra khi xử lý phản ứng' });
    }
  }
}
