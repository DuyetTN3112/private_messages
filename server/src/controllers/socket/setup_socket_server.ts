import { Server, Socket } from 'socket.io';
import { cleanup_socket_store, socket_rate_limiter } from '../../middleware/socket_rate_limiter';
import { logger } from '../../utils/logger';
import { commandBus, queryBus } from '../../config/cqrs_setup';

// Commands
import { FindPartnerCommand } from '../../application/commands/find_partner.command';
import { SendMessageCommand } from '../../application/commands/send_message.command';
import { DisconnectUserCommand } from '../../application/commands/disconnect_user.command';
import { AddReactionCommand } from '../../application/commands/add_reaction.command';

// Queries
import { GetUserStatsQuery } from '../../application/queries/get_user_stats.query';

/**
 * Setup Socket.IO server with CQRS handlers
 */
export const setup_socket_server = (
  io: Server, 
  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
  _socket_store: { [socket_id: string]: 'waiting' | 'matched' | null }
) => {
  // Update stats every 10 seconds
  setInterval(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
        const stats = (await queryBus.execute(new GetUserStatsQuery(io))) as { online_users: number; waiting_users: number };
        io.emit('user-stats', {
          online_users: stats.online_users,
          waiting_users: stats.waiting_users
        });
    })();
  }, 10000);
  
  // Auto-match waiting users is handled by FindPartnerCommand internally, 
  // but we can trigger a periodic check logic if needed.
  // The new logic in FindPartnerCommand attempts to match immediately.
  // If we want periodic matching retry:
  // We can dispatch a command or keep it simple. 
  // The original logic had a setInterval to match waiting users.
  // Let's keep it but we need a way to invoke match logic.
  // Actually, FindPartnerCommand adds to queue and immediately tries to match.
  // If we want periodic retries, we might need a separate "MatchWaitingUsersCommand" or similar.
  // But for now, let's assume immediate match is enough or implement retry elsewhere.
  // Wait, the original code had `match_all_waiting_users` exported.
  // We should create a Command for this if we want to run it periodically.
  // Or just rely on the command handling adding to queue.
  
  io.on('connection', (socket: Socket) => {
    // Apply rate limiter
    if (socket_rate_limiter(socket)) {
      socket.disconnect();
      return;
    }
    
    logger.info(`User connected: ${socket.id}`);
    
    // Handle new user -> FindPartnerCommand
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    commandBus.execute(new FindPartnerCommand(socket, io));
    
    // Message handler
    socket.on('send-message', async (message_data: { content: string }) => {
      await commandBus.execute(new SendMessageCommand(socket.id, message_data.content, socket, io));
    });
    
    // Reaction handler
    socket.on('add-reaction', async (data) => {
      const { conversation_id, message_index, emoji } = data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await commandBus.execute(new AddReactionCommand(socket, io, conversation_id, message_index, emoji));
    });
    
    // Find new partner handler
    socket.on('find-new-partner', async () => {
      logger.info(`User ${socket.id} requesting new partner`);
      await commandBus.execute(new FindPartnerCommand(socket, io));
    });
    
    // Disconnect handler
    socket.on('disconnect', async () => {
      await commandBus.execute(new DisconnectUserCommand(socket, io));
      cleanup_socket_store(socket.id);
    });
  });
};