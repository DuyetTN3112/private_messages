/**
 * Match Users Service
 * 
 * Business logic for matching two waiting users into a conversation.
 */

import { create_conversation_usecase } from '../conversation/create';
import type { Conversation } from '../storage/repository';
import { logger } from '../../utils/logger';

export interface MatchUsersInput {
  readonly user1_socket_id: string;
  readonly user2_socket_id: string;
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
export const match_users = (
  input: MatchUsersInput
): MatchUsersOutput => {
  logger.debug(`Matching users ${input.user1_socket_id} and ${input.user2_socket_id}`);
  
  const result = create_conversation_usecase({
    participants: [input.user1_socket_id, input.user2_socket_id] as const
  });
  
  logger.debug(`Successfully matched users into conversation ${result.conversation.id}`);
  
  return { conversation: result.conversation };
};
