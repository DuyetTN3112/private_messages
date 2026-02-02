/**
 * End Conversation Usecase
 * 
 * Business logic for ending a conversation and cleaning up resources.
 */

import { storageService } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface EndConversationInput {
  readonly conversationId: string;
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
export const endConversationUsecase = async (
  input: EndConversationInput
): Promise<EndConversationOutput> => {
  logger.info(`Ending conversation ${input.conversationId}`);
  
  try {
    const success = storageService.endConversation(input.conversationId);
    
    if (success) {
      logger.info(`Successfully ended conversation ${input.conversationId}`);
    } else {
      logger.warn(`Conversation ${input.conversationId} not found`);
    }
    
    return { success };
  } catch (error) {
    logger.error('Failed to end conversation:', error);
    throw error;
  }
};
