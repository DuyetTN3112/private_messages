/**
 * Add Reaction Service
 * 
 * Business logic for adding emoji reactions to messages.
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';

export interface AddReactionInput {
  readonly socketId: string;
  readonly conversationId: string;
  readonly messageIndex: number;
  readonly emoji: string;
}

export interface AddReactionOutput {
  readonly roomExists: boolean;
  readonly socketWasInRoom: boolean;
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
export const addReaction = (
  input: AddReactionInput,
  socket: Socket,
  io: Server
): AddReactionOutput => {
  logger.info(
    `User ${input.socketId} adding reaction ${input.emoji} to message ${input.messageIndex} in conversation ${input.conversationId}`
  );
  
  // Check room existence
  const room = io.sockets.adapter.rooms.get(input.conversationId);
  const roomExists = !!room;
  
  if (room) {
    logger.debug(`Room ${input.conversationId} exists with ${room.size} members`);
    const socketsInRoom = Array.from(room);
    logger.debug(`Sockets in room ${input.conversationId}: ${socketsInRoom.join(', ')}`);
  } else {
    logger.warn(`Room ${input.conversationId} not found`);
  }
  
  // Check if socket is in room
  const socketWasInRoom = socket.rooms.has(input.conversationId);
  
  // Auto-join if not in room
  if (!socketWasInRoom) {
    logger.debug(`Socket ${input.socketId} not in room ${input.conversationId}, auto-joining`);
    socket.join(input.conversationId);
  }
  
  return {
    roomExists,
    socketWasInRoom
  };
};
