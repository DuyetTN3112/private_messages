import { IQuery, IQueryHandler } from '../interfaces/query.interface';
import { storageService, Conversation } from '../../services/storage/repository';

export class GetConversationQuery implements IQuery {
  constructor(public readonly participant_id: string) {}
}

export class GetConversationQueryHandler implements IQueryHandler<GetConversationQuery, Conversation | null> {
  execute(query: GetConversationQuery): Conversation | null {
    return storageService.findConversationByParticipant(query.participant_id);
  }
}
