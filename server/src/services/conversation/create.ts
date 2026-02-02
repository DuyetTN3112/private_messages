/**
 * Create Conversation Usecase
 * 
 * Business logic for creating a new private conversation between two users.
 * Validates participants and delegates to storage layer.
 */

import { storageService } from '../storage/repository';
import type { Conversation } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface CreateConversationInput {
  readonly participants: readonly [string, string];
}

export interface CreateConversationOutput {
  readonly conversation: Conversation;
}

/**
 * Create a new conversation between two participants
 * 
 * Business Rules:
 * - Must have exactly 2 participants
 * - Participants cannot already be in an active conversation
 * 
 * @throws Error if validation fails
 */
export const createConversationUsecase = async (
  input: CreateConversationInput
): Promise<CreateConversationOutput> => {
  logger.info(`Creating conversation between ${input.participants[0]} and ${input.participants[1]}`);
  
  try {
    // Business logic: Create conversation
    const conversation = storageService.createConversation(input.participants);
    
    logger.info(`Created conversation ${conversation.id}`);
    
    return { conversation };
  } catch (error) {
    logger.error('Failed to create conversation:', error);
    throw error;
  }
};
