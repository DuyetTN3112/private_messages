import { Server } from 'socket.io';
import { get_user_stats } from './stats';

export type SocketStore = Record<string, 'waiting' | 'matched' | null>;

/**
 * Update and broadcast user statistics
 */
export const update_user_stats = (io: Server): void => {
  const stats = get_user_stats(io);
  
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
  socket_store: SocketStore
): void => {
  if (state === null) {
    // Use Reflect.deleteProperty to avoid dynamic delete lint error
    Reflect.deleteProperty(socket_store, socket_id);
  } else {
    socket_store[socket_id] = state;
  }
  update_user_stats(io);
};
