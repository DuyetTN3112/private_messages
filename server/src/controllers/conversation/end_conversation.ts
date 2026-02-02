import { endConversationUsecase } from '../../services/conversation/end';

/**
 * Controller: End Conversation
 * Thin layer - delegates to usecase
 */
export const end_conversation = async (conversation_id: string) => {
  const result = await endConversationUsecase({
    conversationId: conversation_id
  });
  
  return result.success;
}; 