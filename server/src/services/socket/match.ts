/**
 * Match Users Service
 * 
 * Business logic for matching two waiting users into a conversation.
 */

import { createConversationUsecase } from '../conversation/create';
import type { Conversation } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface MatchUsersInput {
  readonly user1SocketId: string;
  readonly user2SocketId: string;
}

export interface MatchUsersOutput {
  readonly conversation: Conversation;
}

/**
 * Match two users and create a conversation
 * 
 * Business Rules:
 * - Exactly 2 users must be provided
 * - Creates a new conversation for the matched pair
 * - Returns conversation details for socket handlers to use
 */
export const matchUsers = async (
  input: MatchUsersInput
): Promise<MatchUsersOutput> => {
  logger.info(`Matching users ${input.user1SocketId} and ${input.user2SocketId}`);
  
  const result = await createConversationUsecase({
    participants: [input.user1SocketId, input.user2SocketId] as const
  });
  
  logger.info(`Successfully matched users into conversation ${result.conversation.id}`);
  
  return { conversation: result.conversation };
};
