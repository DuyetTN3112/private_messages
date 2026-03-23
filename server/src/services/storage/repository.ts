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
  reactions: MessageReaction[];
}

export interface MessageReaction {
  readonly emoji: string;
  readonly sender_id: string;
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
  private participant_index: Map<string, string>;
  private messages: Map<string, Message[]>;
  private id_counter: number;

  constructor() {
    this.conversations = new Map();
    this.participant_index = new Map();
    this.messages = new Map();
    this.id_counter = 0;
  }

  /**
   * Generate unique ID
   * Combines timestamp + counter for uniqueness and sortability
   */
  private generate_id(): string {
    this.id_counter++;
    return `${String(Date.now())}-${String(this.id_counter)}`;
  }

  /**
   * Create a new conversation between two participants
   * 
   * @throws Error if either participant is already in an active conversation
   */
  create_conversation(participants: readonly [string, string]): Conversation {
    const [participant1, participant2] = participants;

    // Check if participants are already in conversations
    if (this.participant_index.has(participant1)) {
      throw new Error(`Participant ${participant1} is already in a conversation`);
    }
    if (this.participant_index.has(participant2)) {
      throw new Error(`Participant ${participant2} is already in a conversation`);
    }

    // Create conversation
    const id = this.generate_id();
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
    this.participant_index.set(participant1, id);
    this.participant_index.set(participant2, id);

    // Initialize empty messages array
    this.messages.set(id, []);

    return conversation;
  }

  /**
   * Find active conversation by participant socket ID
   * Returns null if participant is not in any active conversation
   */
  find_conversation_by_participant(socket_id: string): Conversation | null {
    const conversation_id = this.participant_index.get(socket_id);
    if (conversation_id === undefined || conversation_id === '') {
      return null;
    }

    const conversation = this.conversations.get(conversation_id);
    if (!conversation) {
      // Cleanup stale index if conversation doesn't exist
      this.participant_index.delete(socket_id);
      return null;
    }

    return conversation.is_active ? conversation : null;
  }

  /**
   * Update conversation's last activity timestamp
   * Used when messages are sent or other activity occurs
   */
  update_conversation_activity(conversation_id: string): void {
    const conversation = this.conversations.get(conversation_id);
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
  save_message(conversation_id: string, sender: string, content: string): Message {
    const conversation = this.conversations.get(conversation_id);
    if (!conversation) {
      throw new Error(`Conversation ${conversation_id} not found`);
    }

    if (!conversation.is_active) {
      throw new Error(`Conversation ${conversation_id} is not active`);
    }

    // Validate sender is a participant
    if (!conversation.participants.includes(sender)) {
      throw new Error(`Sender ${sender} is not a participant in conversation ${conversation_id}`);
    }

    const message: Message = {
      id: this.generate_id(),
      conversation_id: conversation_id,
      sender,
      content,
      created_at: new Date(),
      reactions: [],
    };

    // Store message
    const conversation_messages = this.messages.get(conversation_id);
    if (conversation_messages) {
      conversation_messages.push(message);
    }

    // Update activity
    this.update_conversation_activity(conversation_id);

    return message;
  }

  /**
   * Toggle a reaction for a specific message by participant.
   * Returns the updated reactions list for that message.
   */
  toggle_message_reaction(
    conversation_id: string,
    message_index: number,
    emoji: string,
    sender_id: string
  ): readonly MessageReaction[] {
    const conversation = this.conversations.get(conversation_id);
    if (!conversation) {
      throw new Error(`Conversation ${conversation_id} not found`);
    }

    if (!conversation.is_active) {
      throw new Error(`Conversation ${conversation_id} is not active`);
    }

    if (!conversation.participants.includes(sender_id)) {
      throw new Error(`Sender ${sender_id} is not a participant in conversation ${conversation_id}`);
    }

    const conversation_messages = this.messages.get(conversation_id);
    if (!conversation_messages) {
      throw new Error(`No messages found for conversation ${conversation_id}`);
    }

    if (message_index < 0 || message_index >= conversation_messages.length) {
      throw new Error(`Message index ${String(message_index)} is out of range`);
    }

    const message = conversation_messages[message_index];
    if (!message) {
      throw new Error(`Message at index ${String(message_index)} not found`);
    }

    const has_reaction = message.reactions.some(
      (reaction) => reaction.emoji === emoji && reaction.sender_id === sender_id
    );

    if (has_reaction) {
      message.reactions = message.reactions.filter(
        (reaction) => !(reaction.emoji === emoji && reaction.sender_id === sender_id)
      );
    } else {
      message.reactions = [...message.reactions, { emoji, sender_id }];
    }

    this.update_conversation_activity(conversation_id);

    return message.reactions;
  }

  /**
   * Get all messages for a conversation
   * Returns empty array if conversation has no messages
   */
  get_messages_by_conversation(conversation_id: string): readonly Message[] {
    return this.messages.get(conversation_id) ?? [];
  }

  /**
   * End a conversation and cleanup all associated data
   * Returns true if conversation was found and ended, false otherwise
   * 
   * Note: Conversation object is kept (marked inactive) for stats/history,
   * but messages are deleted to free memory.
   */
  end_conversation(conversation_id: string): boolean {
    const conversation = this.conversations.get(conversation_id);
    if (!conversation) {
      return false;
    }

    // Mark as inactive
    conversation.is_active = false;

    // Remove participant indexes so they can join new conversations
    conversation.participants.forEach((participant_id) => {
      this.participant_index.delete(participant_id);
    });

    // Delete messages to free memory
    this.messages.delete(conversation_id);

    // Keep conversation object for stats (but inactive)
    // Don't delete from conversations Map

    return true;
  }

  /**
   * Find all idle conversations
   * Used by conversation monitor to cleanup stale conversations
   * 
   * @param idle_threshold - Date before which conversations are considered idle
   */
  find_idle_conversations(idle_threshold: Date): readonly Conversation[] {
    const idle: Conversation[] = [];

    this.conversations.forEach((conversation) => {
      if (conversation.is_active && conversation.last_activity < idle_threshold) {
        idle.push(conversation);
      }
    });

    return idle;
  }

  /**
   * Get storage statistics
   * Useful for monitoring and debugging
   */
  get_stats(): StorageStats {
    const active_conversations = Array.from(this.conversations.values()).filter(
      (c) => c.is_active
    ).length;

    const total_messages = Array.from(this.messages.values()).reduce(
      (sum, msgs) => sum + msgs.length,
      0
    );

    return {
      total_conversations: this.conversations.size,
      active_conversations: active_conversations,
      total_messages: total_messages,
      active_participants: this.participant_index.size,
    };
  }

  /**
   * Clear all data
   * Useful for testing and cleanup
   */
  clear(): void {
    this.conversations.clear();
    this.participant_index.clear();
    this.messages.clear();
    this.id_counter = 0;
  }
}

// Export singleton instance
export const storage_service = new StorageService();
