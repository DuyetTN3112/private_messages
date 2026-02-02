/**
 * Conversation Timeout Service
 * 
 * Business logic for handling idle conversation timeouts.
 */

import { storageService } from '../storage/repository';
import { endConversationUsecase } from '../conversation/end';
import { logger } from '../../utils/logger';

export interface TimeoutConversationsInput {
  readonly idleTimeoutMs: number;
}

export interface IdleConversation {
  readonly id: string;
  readonly participants: readonly string[];
}

export interface TimeoutConversationsOutput {
  readonly idleConversations: readonly IdleConversation[];
}

/**
 * Find and end idle conversations
 * 
 * Business Rules:
 * - Calculate idle threshold based on current time
 * - Find all conversations inactive beyond threshold
 * - End each idle conversation
 * - Return conversation details for notification purposes
 */
export const timeoutIdleConversations = async (
  input: TimeoutConversationsInput
): Promise<TimeoutConversationsOutput> => {
  const now = new Date();
  const idle_threshold = new Date(now.getTime() - input.idleTimeoutMs);
  
  // Find idle conversations
  const idle_conversations = storageService.findIdleConversations(idle_threshold);
  
  logger.debug(`Found ${idle_conversations.length} idle conversations`);
  
  const conversationsToNotify: IdleConversation[] = [];
  
  // End each idle conversation
  for (const conversation of idle_conversations) {
    try {
      // Store for notification
      conversationsToNotify.push({
        id: conversation.id,
        participants: conversation.participants
      });
      
      // End conversation
      await endConversationUsecase({
        conversationId: conversation.id
      });
      
      logger.info(`Ended idle conversation ${conversation.id}`);
    } catch (error) {
      logger.error(`Error ending conversation ${conversation.id}:`, error);
    }
  }
  
  return {
    idleConversations: conversationsToNotify
  };
};
