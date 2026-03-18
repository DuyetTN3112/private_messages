/**
 * Handle Disconnect Service
 * 
 * Business logic for handling user disconnection.
 */

import { get_conversation_usecase } from '../conversation/get';
import { end_conversation_usecase } from '../conversation/end';
import { logger } from '../../utils/logger';

export interface HandleDisconnectInput {
  readonly socket_id: string;
}

export interface HandleDisconnectOutput {
  readonly partner_id: string | null;
  readonly conversation_id: string | null;
}

/**
 * Handle user disconnect and cleanup
 * 
 * Business Rules:
 * - Find active conversation for disconnected user
 * - End the conversation
 * - Return partner ID for notification purposes
 */
export const handle_disconnect = (
  input: HandleDisconnectInput
): HandleDisconnectOutput => {
  logger.info(`Handling disconnect for user ${input.socket_id}`);
  
  // Find conversation
  const conversation_result = get_conversation_usecase({
    participant_id: input.socket_id
  });
  
  if (!conversation_result.conversation) {
    logger.debug(`No active conversation found for ${input.socket_id}`);
    return { partner_id: null, conversation_id: null };
  }
  
  const conversation = conversation_result.conversation;
  
  // Find partner
  const partner_id = conversation.participants.find((p: string) => p !== input.socket_id) ?? null;
  
  // End conversation
  end_conversation_usecase({
    conversation_id: conversation.id
  });
  
  logger.info(`Ended conversation ${conversation.id} for disconnected user ${input.socket_id}`);
  
  return {
    partner_id,
    conversation_id: conversation.id
  };
};
