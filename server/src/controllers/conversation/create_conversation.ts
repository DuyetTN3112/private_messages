import { create_conversation_usecase } from '../../services/conversation/create';
import type { Conversation } from '../../services/storage/repository';

/**
 * Controller: Create Conversation
 * Thin layer - delegates to usecase
 */
export const create_conversation = (socket_ids: readonly [string, string]): Conversation => {
  const result = create_conversation_usecase({
    participants: socket_ids
  });
  
  return result.conversation;
}; 