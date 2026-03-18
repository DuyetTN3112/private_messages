import { save_message_usecase } from '../../services/message/save';
import type { Message } from '../../services/storage/repository';

/**
 * Controller: Save Message
 * Thin layer - delegates to usecase
 */
export const save_message = (conversation_id: string, sender: string, content: string): Message => {
  const result = save_message_usecase({
    conversation_id: conversation_id,
    sender_id: sender,
    content
  });
  
  return result.message;
}; 