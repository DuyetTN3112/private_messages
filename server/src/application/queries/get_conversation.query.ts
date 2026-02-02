import { IQuery, IQueryHandler } from '../interfaces/query.interface';
import { storageService, Conversation } from '../../services/storage/repository';

export class GetConversationQuery implements IQuery {
  constructor(public readonly participantId: string) {}
}

export class GetConversationQueryHandler implements IQueryHandler<GetConversationQuery, Conversation | null> {
  execute(query: GetConversationQuery): Conversation | null {
    return storageService.findConversationByParticipant(query.participantId);
  }
}
