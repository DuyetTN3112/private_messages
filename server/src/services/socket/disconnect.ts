/**
 * Handle Disconnect Service
 * 
 * Business logic for handling user disconnection.
 */

import { getConversationUsecase } from '../conversation/get';
import { endConversationUsecase } from '../conversation/end';
import { logger } from '../../utils/logger';

export interface HandleDisconnectInput {
  readonly socketId: string;
}

export interface HandleDisconnectOutput {
  readonly partnerId: string | null;
  readonly conversationId: string | null;
}

/**
 * Handle user disconnect and cleanup
 * 
 * Business Rules:
 * - Find active conversation for disconnected user
 * - End the conversation
 * - Return partner ID for notification purposes
 */
export const handleDisconnect = async (
  input: HandleDisconnectInput
): Promise<HandleDisconnectOutput> => {
  logger.info(`Handling disconnect for user ${input.socketId}`);
  
  // Find conversation
  const conversationResult = await getConversationUsecase({
    participantId: input.socketId
  });
  
  if (!conversationResult.conversation) {
    logger.debug(`No active conversation found for ${input.socketId}`);
    return { partnerId: null, conversationId: null };
  }
  
  const conversation = conversationResult.conversation;
  
  // Find partner
  const partnerId = conversation.participants.find((p: string) => p !== input.socketId) ?? null;
  
  // End conversation
  await endConversationUsecase({
    conversationId: conversation.id
  });
  
  logger.info(`Ended conversation ${conversation.id} for disconnected user ${input.socketId}`);
  
  return {
    partnerId,
    conversationId: conversation.id
  };
};
