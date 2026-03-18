/**
 * Save Message Usecase
 * 
 * Business logic for saving a message to a conversation.
 * Validates message content and sender authorization.
 */

import { storage_service } from '../storage/repository';
import type { Message } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface SaveMessageInput {
  readonly conversation_id: string;
  readonly sender_id: string;
  readonly content: string;
}

export interface SaveMessageOutput {
  readonly message: Message;
}

/**
 * Save a message to a conversation
 * 
 * Business Rules:
 * - Conversation must exist and be active
 * - Sender must be a participant in the conversation
 * - Message content is already validated/sanitized by controller
 * - Automatically updates conversation activity timestamp
 * 
 * @throws Error if conversation doesn't exist
 * @throws Error if conversation is not active
 * @throws Error if sender is not a participant
 */
export const save_message_usecase = (
  input: SaveMessageInput
): SaveMessageOutput => {
  logger.debug(`Saving message to conversation ${input.conversation_id} from ${input.sender_id}`);
  
  try {
    const message = storage_service.save_message(
      input.conversation_id,
      input.sender_id,
      input.content
    );
    
    logger.debug(`Saved message ${message.id} to conversation ${input.conversation_id}`);
    
    return { message };
  } catch (error) {
    logger.error('Failed to save message:', error);
    throw error;
  }
};
