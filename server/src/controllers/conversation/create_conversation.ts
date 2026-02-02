import { createConversationUsecase } from '../../services/conversation/create';

/**
 * Controller: Create Conversation
 * Thin layer - delegates to usecase
 */
export const create_conversation = async (socket_ids: readonly [string, string]) => {
  const result = await createConversationUsecase({
    participants: socket_ids
  });
  
  return result.conversation;
}; 