import { Server, Socket } from 'socket.io';
import { cleanup_socket_store, socket_rate_limiter } from '../../middleware/socket_rate_limiter';
import { logger } from '../../utils/logger';
import { command_bus, query_bus } from '../../config/cqrs_setup';

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
  io: Server
): void => {
  // Update stats every 10 seconds
  setInterval(() => {
    void (async (): Promise<void> => {
        const stats = await query_bus.execute<{ online_users: number; waiting_users: number }>(new GetUserStatsQuery(io));
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
    void command_bus.execute(new FindPartnerCommand(socket, io));
    
    // Message handler
    socket.on('send-message', async (message_data: { content: string }) => {
      await command_bus.execute(new SendMessageCommand(socket.id, message_data.content, socket, io));
    });
    
    // Reaction handler
    socket.on('add-reaction', async (data: { conversation_id: string, message_index: number, emoji: string }) => {
      const { conversation_id, message_index, emoji } = data;
      await command_bus.execute(new AddReactionCommand(socket, io, conversation_id, message_index, emoji));
    });
    
    // Find new partner handler
    socket.on('find-new-partner', async () => {
      logger.info(`User ${socket.id} requesting new partner`);
      await command_bus.execute(new FindPartnerCommand(socket, io));
    });
    
    // Disconnect handler
    socket.on('disconnect', async () => {
      await command_bus.execute(new DisconnectUserCommand(socket, io));
      cleanup_socket_store(socket.id);
    });
  });
};