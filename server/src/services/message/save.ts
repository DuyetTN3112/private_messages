/**
 * Save Message Usecase
 * 
 * Business logic for saving a message to a conversation.
 * Validates message content and sender authorization.
 */

import { storageService } from '../storage/repository';
import type { Message } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface SaveMessageInput {
  readonly conversationId: string;
  readonly senderId: string;
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
export const saveMessageUsecase = async (
  input: SaveMessageInput
): Promise<SaveMessageOutput> => {
  logger.debug(`Saving message to conversation ${input.conversationId} from ${input.senderId}`);
  
  try {
    const message = storageService.saveMessage(
      input.conversationId,
      input.senderId,
      input.content
    );
    
    logger.debug(`Saved message ${message.id} to conversation ${input.conversationId}`);
    
    return { message };
  } catch (error) {
    logger.error('Failed to save message:', error);
    throw error;
  }
};
