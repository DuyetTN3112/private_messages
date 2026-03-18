/**
 * End Conversation Usecase
 * 
 * Business logic for ending a conversation and cleaning up resources.
 */

import { storage_service } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface EndConversationInput {
  readonly conversation_id: string;
}

export interface EndConversationOutput {
  readonly success: boolean;
}

/**
 * End a conversation and cleanup all associated data
 * 
 * Business Rules:
 * - Marks conversation as inactive
 * - Removes participant indexes so they can join new conversations
 * - Deletes all messages to free memory
 * - Returns false if conversation doesn't exist
 */
export const end_conversation_usecase = (
  input: EndConversationInput
): EndConversationOutput => {
  logger.info(`Ending conversation ${input.conversation_id}`);
  
  try {
    const success = storage_service.end_conversation(input.conversation_id);
    
    if (success) {
      logger.info(`Successfully ended conversation ${input.conversation_id}`);
    } else {
      logger.warn(`Conversation ${input.conversation_id} not found`);
    }
    
    return { success };
  } catch (error) {
    logger.error('Failed to end conversation:', error);
    throw error;
  }
};
