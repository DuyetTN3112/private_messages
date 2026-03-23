import { socket } from '../socket';
import { tick } from 'svelte';
import { validate_message, sanitize_message } from '../utils/validators';
import { toggle_reaction_for_user, type MessageReaction } from './reaction-utils';

export interface Message {
  sender_id: string;
  content: string;
  created_at: string;
  reactions: MessageReaction[];
}

interface MatchedData {
  conversation_id: string;
  partner_id: string;
}

interface SocketError {
  message: string;
}

interface UserStats {
  online_users: number;
  waiting_users: number;
}

export class ChatState {
  // State using runes
  socket_id = $state('');
  is_connected = $state(false);
  is_waiting = $state(true);
  is_matched = $state(false);
  partner_disconnected = $state(false);
  messages = $state<Message[]>([]);
  conversation_id = $state('');
  partner_id = $state('');

  // UI state
  toast_message = $state('');
  show_toast = $state(false);
  online_users = $state(0);
  waiting_users = $state(0);
  hoveredMessage = $state<Message | null>(null);
  reactionPickerMessage = $state<Message | null>(null);

  message_container: HTMLElement | null = null;
  quickReactions = ['❤️', '👍', '😂', '😮', '🔥', '👏', '🎉', '💯'];

  constructor() {
    this.initSocket();
  }

  setContainer(el: HTMLElement): void {
    this.message_container = el;
  }

  showToast(msg: string, duration = 3000): void {
    this.toast_message = msg;
    this.show_toast = true;
    setTimeout(() => {
      this.show_toast = false;
    }, duration);
  }

  async scrollToBottom(): Promise<void> {
    await tick();
    if (this.message_container) {
      this.message_container.scrollTop = this.message_container.scrollHeight;
    }
  }

  send_message = (content: string): void => {
    if (content && this.is_connected) {
      try {
        validate_message(content);
        const sanitized_content = sanitize_message(content);
        socket.emit('send-message', { content: sanitized_content });
      } catch (error) {
        if (error instanceof Error) {
          this.showToast(error.message);
        } else {
          this.showToast('Tin nhắn không hợp lệ');
        }
      }
    }
  };

  showReactionPicker = (msg: Message): void => {
    this.reactionPickerMessage = msg;
  };

  addReaction = (msg: Message, emoji: string): void => {
    if (!this.socket_id) {
      return;
    }

    const msgIndex = this.messages.indexOf(msg);
    if (msgIndex !== -1) {
      const originalMsg = this.messages[msgIndex];
      if (originalMsg === undefined) return;

      // Create a properly typed copy
      const currentMsg: Message = {
        sender_id: originalMsg.sender_id,
        content: originalMsg.content,
        created_at: originalMsg.created_at,
        reactions: [...originalMsg.reactions]
      };

      currentMsg.reactions = toggle_reaction_for_user(currentMsg.reactions, emoji, this.socket_id);

      // Reassign to array to trigger update
      this.messages[msgIndex] = currentMsg;

      socket.emit('add-reaction', {
        conversation_id: this.conversation_id,
        message_index: msgIndex,
        emoji
      });

      this.showToast(`Đã thả cảm xúc ${emoji}`, 2000);
    }
    this.reactionPickerMessage = null;
  };

  find_new_partner = (): void => {
    socket.emit('find-new-partner');
    this.is_waiting = true;
    this.partner_disconnected = false;
  };

  private initSocket(): void {
    socket.on('connect', () => {
      this.is_connected = true;
      this.socket_id = socket.id ?? '';
    });

    socket.on('disconnect', () => {
      this.is_connected = false;
      this.is_matched = false;
      this.is_waiting = true;
      this.messages = [];
    });

    socket.on('waiting', () => {
      this.is_waiting = true;
      this.is_matched = false;
      this.partner_disconnected = false;
      this.messages = [];
    });

    socket.on('matched', (data: MatchedData) => {
      this.conversation_id = data.conversation_id;
      this.partner_id = data.partner_id;
      this.is_waiting = false;
      this.is_matched = true;
      this.partner_disconnected = false;
      this.messages = [];
      this.showToast('Đã kết nối với người trò chuyện!');
    });

    socket.on('partner-disconnected', () => {
      this.partner_disconnected = true;
      this.is_matched = false;
      setTimeout(() => {
        if (this.partner_disconnected) {
          this.find_new_partner();
        }
      }, 3000);
    });

    socket.on('conversation-timeout', () => {
      this.partner_disconnected = true;
      this.is_matched = false;
      this.messages = [];
      this.showToast('Cuộc trò chuyện đã kết thúc do không hoạt động trong 1 phút');
      setTimeout(() => {
        this.find_new_partner();
      }, 3000);
    });

    socket.on('receive-message', (msg: { sender?: string; sender_id?: string; content: string; created_at: string; reactions?: MessageReaction[] }) => {
      this.messages = [...this.messages, {
        sender_id: msg.sender ?? msg.sender_id ?? '',
        content: msg.content,
        created_at: msg.created_at,
        reactions: msg.reactions ?? []
      }];
      void this.scrollToBottom();
    });

    socket.on('receive-reaction', (data: {message_index: number, reactions: MessageReaction[]}) => {
      const { message_index, reactions } = data;

      if (message_index >= 0 && message_index < this.messages.length) {
        const current = this.messages[message_index];
        if (current === undefined) {
          return;
        }

        // Clone message for reactivity
        const msg: Message = {
          sender_id: current.sender_id,
          content: current.content,
          created_at: current.created_at,
          reactions: [...reactions]
        };
        this.messages[message_index] = msg;
      }
    });

    socket.on('error', (error: SocketError) => {
      this.showToast(error.message || 'Có lỗi xảy ra');
    });

    socket.on('user-stats', (stats: UserStats) => {
      this.online_users = stats.online_users || 0;
      this.waiting_users = stats.waiting_users || 0;
    });
  }

  cleanup(): void {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('waiting');
    socket.off('matched');
    socket.off('partner-disconnected');
    socket.off('conversation-timeout');
    socket.off('receive-message');
    socket.off('receive-reaction');
    socket.off('error');
    socket.off('user-stats');
  }
}

export const chatState = new ChatState();
