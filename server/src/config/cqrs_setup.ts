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

export const commandBus: ICommandBus = new InMemoryCommandBus();
export const queryBus: IQueryBus = new InMemoryQueryBus();

export const setupCqrs = () => {
  // Register Command Handlers
  commandBus.register(FindPartnerCommand.name, new FindPartnerCommandHandler());
  commandBus.register(SendMessageCommand.name, new SendMessageCommandHandler());
  commandBus.register(DisconnectUserCommand.name, new DisconnectUserCommandHandler());
  commandBus.register(AddReactionCommand.name, new AddReactionCommandHandler());
  commandBus.register(EndConversationCommand.name, new EndConversationCommandHandler());

  // Register Query Handlers
  queryBus.register(GetUserStatsQuery.name, new GetUserStatsQueryHandler());
  queryBus.register(GetConversationQuery.name, new GetConversationQueryHandler());
  
  console.log('CQRS Buses initialized and handlers registered');
};
