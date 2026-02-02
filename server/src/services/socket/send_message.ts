/**
 * Send Message Service
 * 
 * Business logic for validating and sending a message in a conversation.
 */

import { getConversationUsecase } from '../conversation/get';
import { saveMessageUsecase } from '../message/save';
import type { Message } from '../storage/repository';
import { logger } from '../../utils/logger';
import { validate_message, sanitize_message } from '../../validators/message_validator';
import { should_rate_limit_message } from '../../middleware/socket_rate_limiter';

export interface SendMessageInput {
  readonly socketId: string;
  readonly content: string;
}

export interface SendMessageOutput {
  readonly message: Message;
  readonly conversationId: string;
}

export class MessageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ConversationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationNotFoundError';
  }
}

/**
 * Send a message in a conversation
 * 
 * Business Rules:
 * - Rate limiting check (max messages per time window)
 * - Message content validation
 * - Message sanitization (XSS prevention)
 * - User must be in an active conversation
 * - Message saved and conversation activity updated
 * 
 * @throws RateLimitError if sending too fast
 * @throws MessageValidationError if content is invalid
 * @throws ConversationNotFoundError if user is not in a conversation
 */
export const sendMessage = async (
  input: SendMessageInput
): Promise<SendMessageOutput> => {
  logger.debug(`Processing message from ${input.socketId}: "${input.content}"`);
  
  // Check rate limit
  if (should_rate_limit_message(input.socketId)) {
    logger.warn(`Rate limit triggered for socket ${input.socketId}`);
    throw new RateLimitError('Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.');
  }
  
  // Validate message content
  try {
    validate_message(input.content);
  } catch (error: any) {
    logger.warn(`Invalid message from socket ${input.socketId}: ${error.message}`);
    throw new MessageValidationError(error.message || 'Nội dung tin nhắn không hợp lệ');
  }
  
  // Sanitize content (XSS prevention)
  const sanitized_content = sanitize_message(input.content);
  
  // Find conversation
  const conversationResult = await getConversationUsecase({
    participantId: input.socketId
  });
  
  if (!conversationResult.conversation) {
    logger.error(`No conversation found for socket ${input.socketId}`);
    throw new ConversationNotFoundError('Không tìm thấy cuộc trò chuyện');
  }
  
  const conversation = conversationResult.conversation;
  logger.debug(`Found conversation ${conversation.id} for socket ${input.socketId}`);
  
  // Save message
  const messageResult = await saveMessageUsecase({
    conversationId: conversation.id,
    senderId: input.socketId,
    content: sanitized_content
  });
  
  logger.debug(`Saved message ${messageResult.message.id} to conversation ${conversation.id}`);
  
  return {
    message: messageResult.message,
    conversationId: conversation.id
  };
};
