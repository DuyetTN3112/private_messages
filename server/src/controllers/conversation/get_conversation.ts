import { getConversationUsecase } from '../../services/conversation/get';

/**
 * Controller: Get Conversation by Participant
 * Thin layer - delegates to usecase
 */
export const get_conversation_by_participant = async (socket_id: string) => {
  const result = await getConversationUsecase({
    participantId: socket_id
  });
  
  return result.conversation;
}; 