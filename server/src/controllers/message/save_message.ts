import { saveMessageUsecase } from '../../services/message/save';

/**
 * Controller: Save Message
 * Thin layer - delegates to usecase
 */
export const save_message = async (conversation_id: string, sender: string, content: string) => {
  const result = await saveMessageUsecase({
    conversationId: conversation_id,
    senderId: sender,
    content
  });
  
  return result.message;
}; 