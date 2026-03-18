/**
 * Socket.IO Event Constants
 * Shared between client and server
 */

// Client -> Server events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SEND_MESSAGE: 'send-message',
  ADD_REACTION: 'add-reaction',
  FIND_NEW_PARTNER: 'find-new-partner',
} as const;

// Server -> Client events
export const SERVER_EVENTS = {
  WAITING: 'waiting',
  MATCHED: 'matched',
  RECEIVE_MESSAGE: 'receive-message',
  RECEIVE_REACTION: 'receive-reaction',
  PARTNER_DISCONNECTED: 'partner-disconnected',
  CONVERSATION_TIMEOUT: 'conversation-timeout',
  USER_STATS: 'user-stats',
  ERROR: 'error',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export type ServerEvent = typeof SERVER_EVENTS[keyof typeof SERVER_EVENTS];
