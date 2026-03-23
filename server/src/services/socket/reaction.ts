/**
 * Add Reaction Service
 * 
 * Business logic for adding emoji reactions to messages.
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { storage_service, type MessageReaction } from '../storage/repository';

export interface AddReactionInput {
  readonly socket_id: string;
  readonly conversation_id: string;
  readonly message_index: number;
  readonly emoji: string;
}

export interface AddReactionOutput {
  readonly room_exists: boolean;
  readonly socket_was_in_room: boolean;
  readonly reactions: readonly MessageReaction[];
}

/**
 * Add a reaction to a message
 * 
 * Business Rules:
 * - Verify room exists
 * - Auto-join socket to room if not already in
 * - Broadcast reaction to all room participants
 * 
 * @returns Information about room state for controller
 */
export const add_reaction = (
  input: AddReactionInput,
  socket: Socket,
  io: Server
): AddReactionOutput => {
  logger.info(
    `User ${input.socket_id} adding reaction ${input.emoji} to message ${String(input.message_index)} in conversation ${input.conversation_id}`
  );
  
  // Check room existence
  const room = io.sockets.adapter.rooms.get(input.conversation_id);
  const room_exists = Boolean(room);
  
  if (room) {
    logger.debug(`Room ${input.conversation_id} exists with ${String(room.size)} members`);
    const sockets_in_room = Array.from(room);
    logger.debug(`Sockets in room ${input.conversation_id}: ${sockets_in_room.join(', ')}`);
  } else {
    logger.warn(`Room ${input.conversation_id} not found`);
  }
  
  // Check if socket is in room
  const socket_was_in_room = socket.rooms.has(input.conversation_id);
  
  // Auto-join if not in room
  if (!socket_was_in_room) {
    logger.debug(`Socket ${input.socket_id} not in room ${input.conversation_id}, auto-joining`);
    void socket.join(input.conversation_id);
  }
  
  const reactions = storage_service.toggle_message_reaction(
    input.conversation_id,
    input.message_index,
    input.emoji,
    input.socket_id
  );

  return {
    room_exists,
    socket_was_in_room,
    reactions
  };
};
