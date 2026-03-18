/**
 * Conversation Timeout Service
 * 
 * Business logic for handling idle conversation timeouts.
 */

import { storage_service } from '../storage/repository';
import { end_conversation_usecase } from '../conversation/end';
import { logger } from '../../utils/logger';

export interface TimeoutConversationsInput {
  readonly idle_timeout_ms: number;
}

export interface IdleConversation {
  readonly id: string;
  readonly participants: readonly string[];
}

export interface TimeoutConversationsOutput {
  readonly idle_conversations: readonly IdleConversation[];
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
export const timeout_idle_conversations = (
  input: TimeoutConversationsInput
): TimeoutConversationsOutput => {
  const now = new Date();
  const idle_threshold = new Date(now.getTime() - input.idle_timeout_ms);
  
  // Find idle conversations
  const idle_conversations = storage_service.find_idle_conversations(idle_threshold);
  
  logger.debug(`Found ${String(idle_conversations.length)} idle conversations`);
  
  const conversations_to_notify: IdleConversation[] = [];
  
  // End each idle conversation
  for (const conversation of idle_conversations) {
    try {
      // Store for notification
      conversations_to_notify.push({
        id: conversation.id,
        participants: conversation.participants
      });
      
      // End conversation
      end_conversation_usecase({
        conversation_id: conversation.id
      });
      
      logger.info(`Ended idle conversation ${conversation.id}`);
    } catch (error) {
      logger.error(`Error ending conversation ${conversation.id}:`, error);
    }
  }
  
  return {
    idle_conversations: conversations_to_notify
  };
};
