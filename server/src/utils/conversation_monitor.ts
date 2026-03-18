import { Server } from 'socket.io';
import { logger } from './logger';
import { timeout_idle_conversations } from '../services/conversation/timeout';
import { IDLE_TIMEOUT_MS, IDLE_CHECK_INTERVAL_MS } from '../constants/config';
import { SERVER_EVENTS } from '../constants/socket';

/**
 * Conversation Monitor
 * Thin layer - calls service and handles socket I/O only
 */
export class ConversationMonitor {
  private io: Server;
  private interval_id: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
  }

  start(): void {
    logger.info('Starting idle conversation monitoring');
    
    if (this.interval_id) {
      clearInterval(this.interval_id);
    }
    
    this.interval_id = setInterval(() => {
      this.check_idle_conversations();
    }, IDLE_CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval_id) {
      clearInterval(this.interval_id);
      this.interval_id = null;
      logger.info('Stopped idle conversation monitoring');
    }
  }

  private check_idle_conversations(): void {
    try {
      const { idle_conversations } = timeout_idle_conversations({
        idle_timeout_ms: IDLE_TIMEOUT_MS
      });
      
      for (const conversation of idle_conversations) {
        for (const participant_id of conversation.participants) {
          const socket = this.io.sockets.sockets.get(participant_id);
          if (socket) {
            logger.info(`Notifying user ${participant_id} of timeout`);
            socket.emit(SERVER_EVENTS.CONVERSATION_TIMEOUT, {
              conversation_id: conversation.id,
              message: 'Cuộc trò chuyện đã kết thúc do không hoạt động trong 1 phút'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking idle conversations:', error);
    }
  }
}

export const setup_conversation_monitor = (io: Server): ConversationMonitor => {
  const monitor = new ConversationMonitor(io);
  monitor.start();
  return monitor;
};