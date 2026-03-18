import { get_conversation_usecase } from '../../services/conversation/get';
import type { Conversation } from '../../services/storage/repository';

/**
 * Controller: Get Conversation by Participant
 * Thin layer - delegates to usecase
 */
export const get_conversation_by_participant = (socket_id: string): Conversation | null => {
  const result = get_conversation_usecase({
    participant_id: socket_id
  });
  
  return result.conversation;
}; 