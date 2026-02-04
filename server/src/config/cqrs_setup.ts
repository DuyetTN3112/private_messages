import { ICommandBus, IQueryBus } from '../application/interfaces/bus.interface';
import { InMemoryCommandBus } from '../infrastructure/in_memory_command_bus';
import { InMemoryQueryBus } from '../infrastructure/in_memory_query_bus';

// Commands
import { FindPartnerCommand, FindPartnerCommandHandler } from '../application/commands/find_partner.command';
import { SendMessageCommand, SendMessageCommandHandler } from '../application/commands/send_message.command';
import { DisconnectUserCommand, DisconnectUserCommandHandler } from '../application/commands/disconnect_user.command';
import { AddReactionCommand, AddReactionCommandHandler } from '../application/commands/add_reaction.command';
import { EndConversationCommand, EndConversationCommandHandler } from '../application/commands/end_conversation.command';

// Queries
import { GetUserStatsQuery, GetUserStatsQueryHandler } from '../application/queries/get_user_stats.query';
import { GetConversationQuery, GetConversationQueryHandler } from '../application/queries/get_conversation.query';

export const command_bus: ICommandBus = new InMemoryCommandBus();
export const query_bus: IQueryBus = new InMemoryQueryBus();

export const setup_cqrs = (): void => {
  // Register Command Handlers
  command_bus.register(FindPartnerCommand.name, new FindPartnerCommandHandler());
  command_bus.register(SendMessageCommand.name, new SendMessageCommandHandler());
  command_bus.register(DisconnectUserCommand.name, new DisconnectUserCommandHandler());
  command_bus.register(AddReactionCommand.name, new AddReactionCommandHandler());
  command_bus.register(EndConversationCommand.name, new EndConversationCommandHandler());

  // Register Query Handlers
  query_bus.register(GetUserStatsQuery.name, new GetUserStatsQueryHandler());
  query_bus.register(GetConversationQuery.name, new GetConversationQueryHandler());
  
  console.log('CQRS Buses initialized and handlers registered');
};
