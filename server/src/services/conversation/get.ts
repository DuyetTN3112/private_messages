/**
 * Get Conversation Usecase
 * 
 * Business logic for retrieving a conversation by participant.
 */

import { storageService } from '../storage/repository';
import type { Conversation } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface GetConversationInput {
  readonly participantId: string;
}

export interface GetConversationOutput {
  readonly conversation: Conversation | null;
}

/**
 * Find active conversation for a participant
 * 
 * Business Rules:
 * - Returns null if participant is not in any active conversation
 * - Only returns active conversations
 */
export const getConversationUsecase = async (
  input: GetConversationInput
): Promise<GetConversationOutput> => {
  logger.debug(`Finding conversation for participant ${input.participantId}`);
  
  try {
    const conversation = storageService.findConversationByParticipant(input.participantId);
    
    if (conversation) {
      logger.debug(`Found conversation ${conversation.id} for participant ${input.participantId}`);
    } else {
      logger.debug(`No active conversation found for participant ${input.participantId}`);
    }
    
    return { conversation };
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    throw error;
  }
};
