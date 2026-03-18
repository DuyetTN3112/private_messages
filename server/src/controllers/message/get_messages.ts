import { get_messages_usecase } from '../../services/message/get';
import type { Message } from '../../services/storage/repository';

/**
 * Controller: Get Messages by Conversation
 * Thin layer - delegates to usecase
 */
export const get_messages_by_conversation = (conversation_id: string): readonly Message[] => {
  const result = get_messages_usecase({
    conversation_id: conversation_id
  });
  
  return result.messages;
}; 