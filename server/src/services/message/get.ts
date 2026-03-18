/**
 * Get Messages Usecase
 * 
 * Business logic for retrieving messages from a conversation.
 */

import { storage_service } from '../storage/repository';
import type { Message } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface GetMessagesInput {
  readonly conversation_id: string;
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
export const get_messages_usecase = (
  input: GetMessagesInput
): GetMessagesOutput => {
  logger.debug(`Retrieving messages for conversation ${input.conversation_id}`);
  
  try {
    const messages = storage_service.get_messages_by_conversation(input.conversation_id);
    
    logger.debug(`Retrieved ${String(messages.length)} messages for conversation ${input.conversation_id}`);
    
    return { messages };
  } catch (error) {
    logger.error('Failed to get messages:', error);
    throw error;
  }
};
