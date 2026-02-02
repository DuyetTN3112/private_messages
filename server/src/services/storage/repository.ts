/**
 * In-Memory Storage Service
 * 
 * Pure business logic for managing conversations and messages.
 * Zero external dependencies - all data stored in JavaScript Maps.
 * Designed for easy testing without mocking.
 * 
 * Memory & CPU optimizations:
 * - O(1) lookups using Maps
 * - Participant index for fast conversation finding
 * - Efficient cleanup to prevent memory leaks
 */

export interface Conversation {
  readonly id: string;
  readonly participants: readonly [string, string]; // Exactly 2 participants
  is_active: boolean;
  last_activity: Date;
  readonly created_at: Date;
}

export interface Message {
  readonly id: string;
  readonly conversation_id: string;
  readonly sender: string;
  readonly content: string;
  readonly created_at: Date;
}

export interface StorageStats {
  readonly total_conversations: number;
  readonly active_conversations: number;
  readonly total_messages: number;
  readonly active_participants: number;
}

/**
 * Storage Service Class
 * 
 * Implements all business logic for conversation and message management.
 * All methods are pure and deterministic - easy to test.
 */
export class StorageService {
  private conversations: Map<string, Conversation>;
  private participantIndex: Map<string, string>; // socketId -> conversationId
  private messages: Map<string, Message[]>; // conversationId -> messages
  private idCounter: number;

  constructor() {
    this.conversations = new Map();
    this.participantIndex = new Map();
    this.messages = new Map();
    this.idCounter = 0;
  }

  /**
   * Generate unique ID
   * Combines timestamp + counter for uniqueness and sortability
   */
  private generateId(): string {
    this.idCounter++;
    return `${Date.now()}-${this.idCounter}`;
  }

  /**
   * Create a new conversation between two participants
   * 
   * @throws Error if participants array doesn't contain exactly 2 members
   * @throws Error if either participant is already in an active conversation
   */
  createConversation(participants: readonly [string, string]): Conversation {
    // Validate input
    if (participants.length !== 2) {
      throw new Error('Conversation must have exactly 2 participants');
    }

    const [participant1, participant2] = participants;

    // Check if participants are already in conversations
    if (this.participantIndex.has(participant1)) {
      throw new Error(`Participant ${participant1} is already in a conversation`);
    }
    if (this.participantIndex.has(participant2)) {
      throw new Error(`Participant ${participant2} is already in a conversation`);
    }

    // Create conversation
    const id = this.generateId();
    const conversation: Conversation = {
      id,
      participants: [participant1, participant2],
      is_active: true,
      last_activity: new Date(),
      created_at: new Date(),
    };

    // Store conversation
    this.conversations.set(id, conversation);

    // Index participants for O(1) lookup
    this.participantIndex.set(participant1, id);
    this.participantIndex.set(participant2, id);

    // Initialize empty messages array
    this.messages.set(id, []);

    return conversation;
  }

  /**
   * Find active conversation by participant socket ID
   * Returns null if participant is not in any active conversation
   */
  findConversationByParticipant(socketId: string): Conversation | null {
    const conversationId = this.participantIndex.get(socketId);
    if (!conversationId) {
      return null;
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      // Cleanup stale index if conversation doesn't exist
      this.participantIndex.delete(socketId);
      return null;
    }

    return conversation.is_active ? conversation : null;
  }

  /**
   * Update conversation's last activity timestamp
   * Used when messages are sent or other activity occurs
   */
  updateConversationActivity(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.last_activity = new Date();
    }
  }

  /**
   * Save a new message to a conversation
   * Automatically updates conversation activity timestamp
   * 
   * @throws Error if conversation doesn't exist
   */
  saveMessage(conversationId: string, sender: string, content: string): Message {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    if (!conversation.is_active) {
      throw new Error(`Conversation ${conversationId} is not active`);
    }

    // Validate sender is a participant
    if (!conversation.participants.includes(sender)) {
      throw new Error(`Sender ${sender} is not a participant in conversation ${conversationId}`);
    }

    const message: Message = {
      id: this.generateId(),
      conversation_id: conversationId,
      sender,
      content,
      created_at: new Date(),
    };

    // Store message
    const conversationMessages = this.messages.get(conversationId);
    if (conversationMessages) {
      conversationMessages.push(message);
    }

    // Update activity
    this.updateConversationActivity(conversationId);

    return message;
  }

  /**
   * Get all messages for a conversation
   * Returns empty array if conversation has no messages
   */
  getMessagesByConversation(conversationId: string): readonly Message[] {
    return this.messages.get(conversationId) ?? [];
  }

  /**
   * End a conversation and cleanup all associated data
   * Returns true if conversation was found and ended, false otherwise
   * 
   * Note: Conversation object is kept (marked inactive) for stats/history,
   * but messages are deleted to free memory.
   */
  endConversation(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    // Mark as inactive
    conversation.is_active = false;

    // Remove participant indexes so they can join new conversations
    conversation.participants.forEach((participantId) => {
      this.participantIndex.delete(participantId);
    });

    // Delete messages to free memory
    this.messages.delete(conversationId);

    // Keep conversation object for stats (but inactive)
    // Don't delete from conversations Map

    return true;
  }

  /**
   * Find all idle conversations
   * Used by conversation monitor to cleanup stale conversations
   * 
   * @param idleThreshold - Date before which conversations are considered idle
   */
  findIdleConversations(idleThreshold: Date): readonly Conversation[] {
    const idle: Conversation[] = [];

    this.conversations.forEach((conversation) => {
      if (conversation.is_active && conversation.last_activity < idleThreshold) {
        idle.push(conversation);
      }
    });

    return idle;
  }

  /**
   * Get storage statistics
   * Useful for monitoring and debugging
   */
  getStats(): StorageStats {
    const activeConversations = Array.from(this.conversations.values()).filter(
      (c) => c.is_active
    ).length;

    const totalMessages = Array.from(this.messages.values()).reduce(
      (sum, msgs) => sum + msgs.length,
      0
    );

    return {
      total_conversations: this.conversations.size,
      active_conversations: activeConversations,
      total_messages: totalMessages,
      active_participants: this.participantIndex.size,
    };
  }

  /**
   * Clear all data
   * Useful for testing and cleanup
   */
  clear(): void {
    this.conversations.clear();
    this.participantIndex.clear();
    this.messages.clear();
    this.idCounter = 0;
  }
}

// Export singleton instance
export const storageService = new StorageService();
