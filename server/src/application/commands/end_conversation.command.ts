import { ICommand, ICommandHandler } from '../interfaces/command.interface';
import { storageService } from '../../services/storage/repository';

export class EndConversationCommand implements ICommand {
  constructor(public readonly conversation_id: string) {}
}

export class EndConversationCommandHandler implements ICommandHandler<EndConversationCommand, boolean> {
  execute(command: EndConversationCommand): boolean {
    return storageService.endConversation(command.conversation_id);
  }
}
