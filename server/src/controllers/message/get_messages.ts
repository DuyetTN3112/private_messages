import { getMessagesUsecase } from '../../services/message/get';

/**
 * Controller: Get Messages by Conversation
 * Thin layer - delegates to usecase
 */
export const get_messages_by_conversation = async (conversation_id: string) => {
  const result = await getMessagesUsecase({
    conversationId: conversation_id
  });
  
  return result.messages;
}; 