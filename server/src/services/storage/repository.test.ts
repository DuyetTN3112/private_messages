/**
 * Unit Tests for Storage Service
 * 
 * These tests verify pure business logic without any external dependencies.
 * No database, no mocking, no setup required - just pure logic testing.
 */

import { StorageService } from './repository';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    // Fresh instance for each test - no shared state
    storage = new StorageService();
  });

  afterEach(() => {
    // Cleanup to prevent memory leaks in test suite
    storage.clear();
  });

  describe('createConversation', () => {
    it('should create a conversation with two participants', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);

      expect(conversation.id).toBeDefined();
      expect(conversation.participants).toEqual(['user1', 'user2']);
      expect(conversation.is_active).toBe(true);
      expect(conversation.created_at).toBeInstanceOf(Date);
      expect(conversation.last_activity).toBeInstanceOf(Date);
    });

    it('should throw error if participants array length is not 2', () => {
      const invalidParticipants = ['user1'] as unknown as readonly [string, string];
      expect(() => storage.createConversation(invalidParticipants)).toThrow(
        'Conversation must have exactly 2 participants'
      );
    });

    it('should throw error if participant is already in a conversation', () => {
      const participants1: readonly [string, string] = ['user1', 'user2'];
      storage.createConversation(participants1);

      const participants2: readonly [string, string] = ['user1', 'user3'];
      expect(() => storage.createConversation(participants2)).toThrow(
        'Participant user1 is already in a conversation'
      );
    });

    it('should create multiple conversations with different participants', () => {
      const conv1 = storage.createConversation(['user1', 'user2']);
      const conv2 = storage.createConversation(['user3', 'user4']);

      expect(conv1.id).not.toBe(conv2.id);
      expect(storage.getStats().total_conversations).toBe(2);
    });
  });

  describe('findConversationByParticipant', () => {
    it('should find conversation by participant socket ID', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const created = storage.createConversation(participants);

      const found1 = storage.findConversationByParticipant('user1');
      const found2 = storage.findConversationByParticipant('user2');

      expect(found1).toEqual(created);
      expect(found2).toEqual(created);
    });

    it('should return null if participant is not in any conversation', () => {
      const found = storage.findConversationByParticipant('nonexistent');
      expect(found).toBeNull();
    });

    it('should return null if conversation is not active', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      
      storage.endConversation(conversation.id);
      
      const found = storage.findConversationByParticipant('user1');
      expect(found).toBeNull();
    });
  });

  describe('saveMessage', () => {
    it('should save a message to a conversation', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);

      const message = storage.saveMessage(conversation.id, 'user1','Hello!');

      expect(message.id).toBeDefined();
      expect(message.conversation_id).toBe(conversation.id);
      expect(message.sender).toBe('user1');
      expect(message.content).toBe('Hello!');
      expect(message.created_at).toBeInstanceOf(Date);
    });

   it('should throw error if conversation does not exist', () => {
      expect(() => {
        storage.saveMessage('nonexistent-id', 'user1', 'Hello');
      }).toThrow('Conversation nonexistent-id not found');
    });

    it('should throw error if conversation is not active', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      storage.endConversation(conversation.id);

      expect(() => {
        storage.saveMessage(conversation.id, 'user1', 'Hello');
      }).toThrow('is not active');
    });

    it('should throw error if sender is not a participant', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);

      expect(() => {
        storage.saveMessage(conversation.id, 'user3', 'Hello');
      }).toThrow('is not a participant');
    });

    it('should update conversation last_activity when message is saved', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      
      const originalActivity = conversation.last_activity;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        storage.saveMessage(conversation.id, 'user1', 'Test');
        expect(conversation.last_activity.getTime()).toBeGreaterThan(
          originalActivity.getTime()
        );
      }, 10);
    });
  });

  describe('getMessagesByConversation', () => {
    it('should return all messages for a conversation', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);

      storage.saveMessage(conversation.id, 'user1', 'Message 1');
      storage.saveMessage(conversation.id, 'user2', 'Message 2');
      storage.saveMessage(conversation.id, 'user1', 'Message 3');

      const messages = storage.getMessagesByConversation(conversation.id);
      expect(messages).toHaveLength(3);
      expect(messages[0]!.content).toBe('Message 1');
      expect(messages[1]!.content).toBe('Message 2');
      expect(messages[2]!.content).toBe('Message 3');
    });

    it('should return empty array if conversation has no messages', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);

      const messages = storage.getMessagesByConversation(conversation.id);
      expect(messages).toEqual([]);
    });

    it('should return empty array for non-existent conversation', () => {
      const messages = storage.getMessagesByConversation('nonexistent');
      expect(messages).toEqual([]);
    });
  });

  describe('endConversation', () => {
    it('should end conversation and cleanup all data', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      storage.saveMessage(conversation.id, 'user1', 'Test message');

      const result = storage.endConversation(conversation.id);

      expect(result).toBe(true);
      expect(storage.findConversationByParticipant('user1')).toBeNull();
      expect(storage.findConversationByParticipant('user2')).toBeNull();
      expect(storage.getMessagesByConversation(conversation.id)).toEqual([]);
    });

    it('should return false if conversation does not exist', () => {
      const result = storage.endConversation('nonexistent');
      expect(result).toBe(false);
    });

    it('should allow participants to join new conversations after ending', () => {
      const participants1: readonly [string, string] = ['user1', 'user2'];
      const conv1 = storage.createConversation(participants1);
      storage.endConversation(conv1.id);

      // Should be able to create new conversation with same participants
      const participants2: readonly [string, string] = ['user1', 'user3'];
      const conv2 = storage.createConversation(participants2);
      expect(conv2.id).toBeDefined();
      expect(conv2.id).not.toBe(conv1.id);
    });
  });

  describe('findIdleConversations', () => {
    it('should find conversations idle before threshold', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);

      // Set threshold to future date
      const threshold = new Date(Date.now() + 60000);
      const idle = storage.findIdleConversations(threshold);

      expect(idle).toHaveLength(1);
      expect(idle[0]!.id).toBe(conversation.id);
    });

    it('should not find conversations active after threshold', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      storage.createConversation(participants);

      // Set threshold to past date
      const threshold = new Date(Date.now() - 60000);
      const idle = storage.findIdleConversations(threshold);

      expect(idle).toHaveLength(0);
    });

    it('should not include inactive conversations', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      storage.endConversation(conversation.id);

      const threshold = new Date(Date.now() + 60000);
      const idle = storage.findIdleConversations(threshold);

      expect(idle).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const participants1: readonly [string, string] = ['user1', 'user2'];
      const participants2: readonly [string, string] = ['user3', 'user4'];
      
      const conv1 = storage.createConversation(participants1);
      const conv2 = storage.createConversation(participants2);

      storage.saveMessage(conv1.id, 'user1', 'Message 1');
      storage.saveMessage(conv1.id, 'user2', 'Message 2');
      storage.saveMessage(conv2.id, 'user3', 'Message 3');

      const stats = storage.getStats();

      expect(stats.total_conversations).toBe(2);
      expect(stats.active_conversations).toBe(2);
      expect(stats.total_messages).toBe(3);
      expect(stats.active_participants).toBe(4);
    });

    it('should reflect ended conversations in stats', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      storage.endConversation(conversation.id);

      const stats = storage.getStats();

      // Conversation still exists but is inactive
      expect(stats.total_conversations).toBe(1);
      expect(stats.active_conversations).toBe(0);
      expect(stats.active_participants).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      storage.saveMessage(conversation.id, 'user1', 'Test');

      storage.clear();

      const stats = storage.getStats();
      expect(stats.total_conversations).toBe(0);
      expect(stats.total_messages).toBe(0);
      expect(stats.active_participants).toBe(0);
    });
  });

  describe('Memory efficiency', () => {
    it('should handle many conversations efficiently', () => {
      const startTime = Date.now();
      
      // Create 100 conversations
      for (let i = 0; i < 100; i++) {
        const participants: readonly [string, string] = [`user${i * 2}`, `user${i * 2 + 1}`];
        storage.createConversation(participants);
      }

      const createTime = Date.now() - startTime;
      expect(createTime).toBeLessThan(100); // Should be very fast

      const stats = storage.getStats();
      expect(stats.total_conversations).toBe(100);
      expect(stats.active_participants).toBe(200);
    });

    it('should cleanup memory when ending conversations', () => {
      const participants: readonly [string, string] = ['user1', 'user2'];
      const conversation = storage.createConversation(participants);
      
      // Add many messages
      for (let i = 0; i < 1000; i++) {
        storage.saveMessage(conversation.id, 'user1', `Message ${i}`);
      }

      const beforeStats = storage.getStats();
      expect(beforeStats.total_messages).toBe(1000);

      // End conversation should free all messages
      storage.endConversation(conversation.id);

      const afterStats = storage.getStats();
      expect(afterStats.total_messages).toBe(0);
    });
  });
});
