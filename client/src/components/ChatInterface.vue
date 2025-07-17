<template>
  <!-- Main container -->
  <div style="background: #000000; min-height: 100vh; position: relative; overflow: hidden;">
    <!-- Background elements -->
    <Background />

    <!-- Main Chat Container -->
    <div style="position: relative; z-index: 10; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem;">
      <div style="width: 100%; max-width: 28rem; height: 85vh; background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(0.75rem); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border-radius: 1.5rem; overflow: hidden;">
        
        <!-- Header Section -->
        <ChatHeader :onlineUsers="online_users" :waitingUsers="waiting_users" />

        <!-- Messages Area -->
        <div style="flex: 1; overflow: hidden; height: calc(85vh - 11rem);">
          <div ref="message_container" style="height: 100%; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem;">
            
            <!-- Waiting Screen -->
            <WaitingScreen v-if="is_waiting" />
            
            <!-- Message Bubbles -->
            <template v-else-if="is_matched">
              <MessageBubble
                v-for="(msg, index) in messages"
                :key="index"
                :message="msg"
                :currentUserId="socket_id"
                :delay="index"
                @hoverMessage="hoveredMessage = $event"
                @showReactionPicker="showReactionPicker"
                @addReaction="addReaction"
              />
            </template>
          </div>
        </div>

        <!-- Input Area -->
        <MessageInput 
          :isConnected="is_connected"
          @sendMessage="send_message"
        />
      </div>
    </div>

    <!-- Partner disconnected notification -->
    <DisconnectedModal v-if="partner_disconnected" />

    <!-- Reaction Picker Modal -->
    <ReactionPicker
      v-if="reactionPickerMessage"
      :message="reactionPickerMessage"
      :reactions="quickReactions"
      @select="addReaction"
      @close="reactionPickerMessage = null"
    />

    <!-- Toast notification -->
    <Toast v-if="show_toast" :message="toast_message" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue';
import { validate_message, sanitize_message } from '../utils/validators';

// Import components
import Background from './chat/Background.vue';
import MessageBubble from './chat/MessageBubble.vue';
import MessageInput from './chat/MessageInput.vue';
import ChatHeader from './chat/ChatHeader.vue';
import WaitingScreen from './chat/WaitingScreen.vue';
import DisconnectedModal from './chat/DisconnectedModal.vue';
import ReactionPicker from './chat/ReactionPicker.vue';
import Toast from './chat/Toast.vue';

// Định nghĩa kiểu dữ liệu cho tin nhắn
interface Message {
  sender_id: string;
  content: string;
  created_at?: string;
  reactions?: string[];
}

// Lấy instance để truy cập globalProperties
const app = getCurrentInstance();
const socket = app!.appContext.config.globalProperties.$socket;

// Socket và conversation state
const socket_id = ref('');
const is_connected = ref(false);
const is_waiting = ref(true);
const is_matched = ref(false);
const partner_disconnected = ref(false);
const messages = reactive<Message[]>([]);
const message_container = ref<HTMLElement | null>(null);
const conversation_id = ref('');
const partner_id = ref('');

// UI state
const toast_message = ref('');
const show_toast = ref(false);
const online_users = ref(0);
const waiting_users = ref(0);
const hoveredMessage = ref<Message | null>(null);
const reactionPickerMessage = ref<Message | null>(null);

// Reaction data
const quickReactions = ['❤️', '👍', '😂', '😮', '🔥', '👏', '🎉', '💯'];

// Scroll to bottom of message container
const scrollToBottom = () => {
  nextTick(() => {
    if (message_container.value) {
      message_container.value.scrollTop = message_container.value.scrollHeight;
    }
  });
};

// Send message
const send_message = (content: string) => {
  if (content && is_connected.value) {
    try {
      // Kiểm tra và làm sạch tin nhắn trước khi gửi
      validate_message(content);
      const sanitized_content = sanitize_message(content);

      // Gửi tin nhắn đã làm sạch đến server
      socket.emit('send-message', { content: sanitized_content });
    } catch (error: any) {
      // Hiển thị thông báo lỗi cho người dùng
      toast_message.value = error.message || 'Tin nhắn không hợp lệ';
      show_toast.value = true;
      setTimeout(() => {
        show_toast.value = false;
      }, 3000);
    }
  }
};

// Show reaction picker for a message
const showReactionPicker = (msg: Message) => {
  reactionPickerMessage.value = msg;
};

// Add reaction to message
const addReaction = (msg: Message, emoji: string) => {
  // Đảm bảo tin nhắn có mảng reactions
  if (!msg.reactions) {
    msg.reactions = [];
  }
  
  const hasReaction = msg.reactions.includes(emoji);
  
  if (hasReaction) {
    msg.reactions = msg.reactions.filter((r: string) => r !== emoji);
  } else {
    msg.reactions.push(emoji);
  }
  
  // Cập nhật trực tiếp vào mảng messages để hiển thị ngay lập tức
  const msgIndex = messages.indexOf(msg);
  if (msgIndex !== -1) {
    if (!messages[msgIndex].reactions) {
      messages[msgIndex].reactions = [];
    }
    
    if (messages[msgIndex].reactions.includes(emoji)) {
      messages[msgIndex].reactions = messages[msgIndex].reactions.filter((r: string) => r !== emoji);
    } else {
      messages[msgIndex].reactions.push(emoji);
    }
  }
  
  // Hide picker after selecting
  reactionPickerMessage.value = null;
  
  // Add socket emit for syncing reactions across users
  socket.emit('add-reaction', { 
    conversation_id: conversation_id.value,
    message_index: msgIndex,
    emoji: emoji
  });
  
  // Hiển thị thông báo thành công
  toast_message.value = `Đã thả cảm xúc ${emoji}`;
  show_toast.value = true;
  setTimeout(() => {
    show_toast.value = false;
  }, 2000);
};

// Hàm để tự động tìm người trò chuyện mới
const find_new_partner = () => {
  // Gửi sự kiện tìm người trò chuyện mới
  socket.emit('find-new-partner');
  is_waiting.value = true;
  partner_disconnected.value = false;
};

onMounted(() => {
  // Xử lý kết nối socket
  socket.on('connect', () => {
    is_connected.value = true;
    socket_id.value = socket.id;
    console.log('Đã kết nối với ID:', socket_id.value);
  });

  socket.on('disconnect', () => {
    is_connected.value = false;
    is_matched.value = false;
    is_waiting.value = true;
    messages.length = 0; // Xóa tất cả tin nhắn
  });

  // Xử lý trạng thái
  socket.on('waiting', () => {
    is_waiting.value = true;
    is_matched.value = false;
    partner_disconnected.value = false;
    messages.length = 0; // Xóa tất cả tin nhắn
  });

  socket.on('matched', (data: any) => {
    conversation_id.value = data.conversation_id;
    partner_id.value = data.partner_id;
    is_waiting.value = false;
    is_matched.value = true;
    partner_disconnected.value = false;
    messages.length = 0; // Xóa tất cả tin nhắn
    
    // Hiển thị thông báo kết nối thành công
    toast_message.value = 'Đã kết nối với người trò chuyện!';
    show_toast.value = true;
    setTimeout(() => {
      show_toast.value = false;
    }, 3000);
  });

  socket.on('partner-disconnected', () => {
    partner_disconnected.value = true;
    is_matched.value = false;
    
    // Tự động tìm người trò chuyện mới sau 3 giây
    setTimeout(() => {
      if (partner_disconnected.value) {
        find_new_partner();
      }
    }, 3000);
  });

  socket.on('conversation-timeout', () => {
    partner_disconnected.value = true;
    is_matched.value = false;
    messages.length = 0;
    
    // Hiển thị thông báo timeout
    toast_message.value = 'Cuộc trò chuyện đã kết thúc do không hoạt động trong 1 phút';
    show_toast.value = true;
    
    // Tự động tìm người trò chuyện mới sau 3 giây
    setTimeout(() => {
      show_toast.value = false;
      find_new_partner();
    }, 3000);
  });

  // Xử lý tin nhắn
  socket.on('receive-message', (msg: Message) => {
    messages.push({
      sender_id: msg.sender_id,
      content: msg.content,
      created_at: msg.created_at,
      reactions: []
    });
    scrollToBottom();
  });
  
  // Xử lý phản ứng từ người dùng khác
  socket.on('receive-reaction', (data: {message_index: number, emoji: string}) => {
    const { message_index, emoji } = data;
    
    if (message_index >= 0 && message_index < messages.length) {
      if (!messages[message_index].reactions) {
        messages[message_index].reactions = [];
      }
      
      const hasReaction = messages[message_index].reactions.includes(emoji);
      
      if (hasReaction) {
        // Nếu reaction đã tồn tại, xóa đi
        messages[message_index].reactions = messages[message_index].reactions.filter((r: string) => r !== emoji);
      } else {
        // Nếu reaction chưa tồn tại, thêm vào
        messages[message_index].reactions.push(emoji);
      }
      
      // Hiển thị thông báo nhỏ khi có người thả cảm xúc vào tin nhắn của mình
      if (messages[message_index].sender_id === socket_id.value) {
        toast_message.value = `Có người đã thả cảm xúc ${emoji}`;
        show_toast.value = true;
        setTimeout(() => {
          show_toast.value = false;
        }, 2000);
      }
    }
  });

  socket.on('error', (error: any) => {
    // Hiển thị thông báo lỗi
    toast_message.value = error.message || 'Có lỗi xảy ra';
    show_toast.value = true;
    
    // Ẩn toast sau 3 giây
    setTimeout(() => {
      show_toast.value = false;
    }, 3000);
  });

  // Lắng nghe thông tin về số người dùng
  socket.on('user-stats', (stats: any) => {
    online_users.value = stats.online_users || 0;
    waiting_users.value = stats.waiting_users || 0;
  });
});

onUnmounted(() => {
  // Ngắt kết nối socket khi component bị hủy
  socket.disconnect();
});
</script> 