/**
 * User Stats Service
 * 
 * Business logic for tracking and computing user statistics.
 */

import { Server } from 'socket.io';
import { logger } from '../../utils/logger';

export interface UserStats {
  readonly online_users: number;
  readonly waiting_users: number;
}

/**
 * Get current user statistics
 * 
 * Business Rules:
 * - Count total connected sockets
 * - Count users in waiting room
 */
export const get_user_stats = (io: Server): UserStats => {
  const online_users = io.engine.clientsCount;
  const waiting_users = Array.from(io.sockets.adapter.rooms.get('waiting') ?? []).length;
  
  logger.info(`Thống kê người dùng: ${String(online_users)} trực tuyến, ${String(waiting_users)} đang chờ`);
  
  return {
    online_users,
    waiting_users
  };
};
