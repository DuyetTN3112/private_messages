import { Server } from 'socket.io';
import { logger } from './logger';
import { timeoutIdleConversations } from '../services/conversation/timeout';

/**
 * Idle timeout duration (ms)
 */
const IDLE_TIMEOUT = 60 * 1000; // 1 minute

/**
 * Check interval (ms)
 */
const CHECK_INTERVAL = 10 * 1000; // 10 seconds

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

  /**
   * Start monitoring conversations
   */
  start(): void {
    logger.info('Starting idle conversation monitoring');
    
    if (this.interval_id) {
      clearInterval(this.interval_id);
    }
    
    this.interval_id = setInterval(() => {
      this.check_idle_conversations();
    }, CHECK_INTERVAL);
  }

  /**
   * Stop monitoring conversations
   */
  stop(): void {
    if (this.interval_id) {
      clearInterval(this.interval_id);
      this.interval_id = null;
      logger.info('Stopped idle conversation monitoring');
    }
  }

  /**
   * Check and handle idle conversations
   * Thin layer - calls service then sends socket notifications
   */
  private async check_idle_conversations(): Promise<void> {
    try {
      // Business logic in service
      const { idleConversations } = await timeoutIdleConversations({
        idleTimeoutMs: IDLE_TIMEOUT
      });
      
      // Socket I/O only - notify participants
      for (const conversation of idleConversations) {
        for (const participant_id of conversation.participants) {
          const socket = this.io.sockets.sockets.get(participant_id);
          if (socket) {
            logger.info(`Notifying user ${participant_id} of timeout`);
            socket.emit('conversation-timeout', {
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

/**
 * Create and start conversation monitor
 */
export const setup_conversation_monitor = (io: Server): ConversationMonitor => {
  const monitor = new ConversationMonitor(io);
  monitor.start();
  return monitor;
};