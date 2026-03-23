/**
 * User Stats Service
 * 
 * Business logic for tracking and computing user statistics.
 */

import { Server } from 'socket.io';

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
export const get_user_stats = (io: Server, waiting_users_override?: number): UserStats => {
  const online_users = io.engine.clientsCount;
  const waiting_users = waiting_users_override ?? 0;
  
  return {
    online_users,
    waiting_users
  };
};
