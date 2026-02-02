/**
 * Get Messages Usecase
 * 
 * Business logic for retrieving messages from a conversation.
 */

import { storageService } from '../storage/repository';
import type { Message } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface GetMessagesInput {
  readonly conversationId: string;
}

export interface GetMessagesOutput {
  readonly messages: readonly Message[];
}

/**
 * Retrieve all messages for a conversation
 * 
 * Business Rules:
 * - Returns messages in chronological order (by created_at)
 * - Returns empty array if conversation has no messages
 * - Returns empty array if conversation doesn't exist
 */
export const getMessagesUsecase = async (
  input: GetMessagesInput
): Promise<GetMessagesOutput> => {
  logger.debug(`Retrieving messages for conversation ${input.conversationId}`);
  
  try {
    const messages = storageService.getMessagesByConversation(input.conversationId);
    
    logger.debug(`Retrieved ${messages.length} messages for conversation ${input.conversationId}`);
    
    return { messages };
  } catch (error) {
    logger.error('Failed to get messages:', error);
    throw error;
  }
};
