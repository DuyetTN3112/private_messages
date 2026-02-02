import { Server, Socket } from 'socket.io';
import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { sendMessage, SendMessageOutput } from '../../services/socket/send_message';
import { logger } from '../../utils/logger';

export class SendMessageCommand implements ICommand {
  constructor(
    public readonly socket_id: string,
    public readonly content: string,
    public readonly socket: Socket,
    public readonly io: Server
  ) {}
}

export class SendMessageCommandHandler implements ICommandHandler<SendMessageCommand, SendMessageOutput> {
  async execute(command: SendMessageCommand): Promise<SendMessageOutput> {
    try {
      const result = await sendMessage({
        socketId: command.socket_id,
        content: command.content
      });

      // Broadcast message to all participants in the conversation
      command.io.to(result.conversationId).emit('receive-message', result.message);
      
      logger.info(`Broadcasted message ${result.message.id} to room ${result.conversationId}`);

      return result;
    } catch (error: unknown) {
      logger.error(`Error processing message from ${command.socket_id}:`, error);
      // Emit error back to sender
      const error_message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn';
      command.socket.emit('error', { 
        message: error_message
      });
      throw error;
    }
  }
}
