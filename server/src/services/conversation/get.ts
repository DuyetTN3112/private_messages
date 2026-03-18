/**
 * Get Conversation Usecase
 * 
 * Business logic for retrieving a conversation by participant.
 */

import { storage_service } from '../storage/repository';
import type { Conversation } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface GetConversationInput {
  readonly participant_id: string;
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
export const get_conversation_usecase = (
  input: GetConversationInput
): GetConversationOutput => {
  logger.debug(`Finding conversation for participant ${input.participant_id}`);
  
  try {
    const conversation = storage_service.find_conversation_by_participant(input.participant_id);
    
    if (conversation) {
      logger.debug(`Found conversation ${conversation.id} for participant ${input.participant_id}`);
    } else {
      logger.debug(`No active conversation found for participant ${input.participant_id}`);
    }
    
    return { conversation };
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    throw error;
  }
};
