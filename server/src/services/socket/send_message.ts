/**
 * Send Message Service
 * 
 * Business logic for validating and sending a message in a conversation.
 */

import { get_conversation_usecase } from '../conversation/get';
import { save_message_usecase } from '../message/save';
import type { Message } from '../storage/repository';
import { logger } from '../../utils/logger';
import { validate_message, sanitize_message } from '../../validators/message_validator';
import { should_rate_limit_message } from '../../middleware/socket_rate_limiter';

export interface SendMessageInput {
  readonly socket_id: string;
  readonly content: string;
}

export interface SendMessageOutput {
  readonly message: Message;
  readonly conversation_id: string;
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
export const send_message = (
  input: SendMessageInput
): SendMessageOutput => {
  logger.debug(`Processing message from ${input.socket_id}: "${input.content}"`);
  
  // Check rate limit
  if (should_rate_limit_message(input.socket_id)) {
    logger.warn(`Rate limit triggered for socket ${input.socket_id}`);
    throw new RateLimitError('Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.');
  }
  
  // Validate message content
  try {
    validate_message(input.content);
  } catch (error: unknown) {
    const error_msg = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`Invalid message from socket ${input.socket_id}: ${error_msg}`);
    throw new MessageValidationError(error_msg !== '' ? error_msg : 'Nội dung tin nhắn không hợp lệ');
  }
  
  // Sanitize content (XSS prevention)
  const sanitized_content = sanitize_message(input.content);
  
  // Find conversation
  const conversation_result = get_conversation_usecase({
    participant_id: input.socket_id
  });
  
  if (!conversation_result.conversation) {
    logger.error(`No conversation found for socket ${input.socket_id}`);
    throw new ConversationNotFoundError('Không tìm thấy cuộc trò chuyện');
  }
  
  const conversation = conversation_result.conversation;
  logger.debug(`Found conversation ${conversation.id} for socket ${input.socket_id}`);
  
  // Save message
  const message_result = save_message_usecase({
    conversation_id: conversation.id,
    sender_id: input.socket_id,
    content: sanitized_content
  });
  
  logger.debug(`Saved message ${message_result.message.id} to conversation ${conversation.id}`);
  
  return {
    message: message_result.message,
    conversation_id: conversation.id
  };
};
