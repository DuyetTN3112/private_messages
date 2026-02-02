import { Server } from 'socket.io';
import { getUserStats } from './stats';

/**
 * Update and broadcast user statistics
 */
export const update_user_stats = (io: Server) => {
  const stats = getUserStats(io);
  
  // Socket I/O only
  io.emit('user-stats', {
    online_users: stats.online_users,
    waiting_users: stats.waiting_users
  });
};

/**
 * Update user state in store and trigger stats broadcast
 */
export const update_user_state = (
  socket_id: string, 
  state: 'waiting' | 'matched' | null, 
  io: Server, 
  socketStore: { [socket_id: string]: 'waiting' | 'matched' | null }
) => {
  if (state === null) {
    delete socketStore[socket_id];
  } else {
    socketStore[socket_id] = state;
  }
  update_user_stats(io);
};
