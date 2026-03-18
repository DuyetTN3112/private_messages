import { end_conversation_usecase } from '../../services/conversation/end';

/**
 * Controller: End Conversation
 * Thin layer - delegates to usecase
 */
export const end_conversation = (conversation_id: string): boolean => {
  const result = end_conversation_usecase({
    conversation_id: conversation_id
  });
  
  return result.success;
}; 