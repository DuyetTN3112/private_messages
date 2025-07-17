<template>
  <div
    :style="{
      display: 'flex',
      gap: '0.75rem',
      justifyContent: message.sender_id === currentUserId ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.5s ease-out forwards',
      animationDelay: `${delay * 0.1}s`,
    }"
  >
    <!-- Avatar partner -->
    <div
      v-if="message.sender_id !== currentUserId"
      style="width: 2rem; height: 2rem; background: rgba(255, 255, 255, 0.15); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); flex-shrink: 0;"
    >
      <User style="width: 1rem; height: 1rem; color: white;" />
    </div>

    <!-- Message bubble container -->
    <div :style="{ maxWidth: '75%', order: message.sender_id === currentUserId ? '-1' : '0' }">
      <!-- Message bubble -->
      <div
        @mouseenter="$emit('hoverMessage', message)" 
        @mouseleave="$emit('hoverMessage', null)"
        :style="{
          borderRadius: '1rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(0.25rem)',
          transition: 'all 0.3s',
          position: 'relative',
          ...(message.sender_id === currentUserId 
            ? { 
              background: 'rgba(0, 0, 0, 0.6)', 
              color: 'white', 
              marginLeft: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            } 
            : { 
              background: 'rgba(255, 255, 255, 0.15)', 
              color: 'white', 
              border: '1px solid rgba(255, 255, 255, 0.1)' 
            })
        }"
      >
        <!-- Message content -->
        <p style="white-space: pre-wrap; line-height: 1.5; font-size: 0.875rem; word-break: break-word;">
          <span v-html="formattedContent"></span>
          
          <!-- Hiển thị phản ứng ngay trong nội dung tin nhắn nếu có -->
          <span v-if="message.reactions && message.reactions.length > 0" 
            style="
              display: inline-block;
              margin-left: 0.5rem;
              font-size: 0.875rem;
            "
          >
            {{ message.reactions.join(' ') }}
          </span>
        </p>
        
        <!-- Reaction button icon -->
        <button 
          @click.stop="$emit('showReactionPicker', message)" 
          style="
            position: absolute;
            bottom: -10px;
            right: -5px;
            background: rgba(0, 0, 0, 0.6);
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s;
            z-index: 50;
            padding: 0;
          "
          class="hover-scale"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: rgba(255, 255, 255, 0.7);">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
      </div>

      <!-- Reactions Display -->
      <div 
        v-if="message.reactions && message.reactions.length > 0" 
        :style="{
          display: 'flex', 
          gap: '0.25rem', 
          marginTop: '0.4rem',
          flexWrap: 'wrap', 
          position: 'relative', 
          zIndex: '5',
          justifyContent: message.sender_id === currentUserId ? 'flex-end' : 'flex-start'
        }"
      >
        <div
          v-for="(reaction, idx) in message.reactions"
          :key="idx"
          @click="$emit('addReaction', message, reaction)"
          style="
            background: rgba(0, 0, 0, 0.5); 
            backdrop-filter: blur(0.5rem); 
            border-radius: 9999px; 
            padding: 0.25rem 0.4rem; 
            font-size: 1rem; 
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            transition: all 0.2s;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            animation: fadeIn 0.3s ease-in-out;
          "
          class="hover-scale"
        >
          {{ reaction }}
        </div>
      </div>
    </div>

    <!-- Avatar me -->
    <div
      v-if="message.sender_id === currentUserId"
      style="width: 2rem; height: 2rem; background: rgba(0, 0, 0, 0.6); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); flex-shrink: 0;"
    >
      <User style="width: 1rem; height: 1rem; color: white;" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { User } from 'lucide-vue-next';

// Định nghĩa kiểu dữ liệu cho tin nhắn
interface Message {
  sender_id: string;
  content: string;
  created_at?: string;
  reactions?: string[];
}

// Định nghĩa props
const props = defineProps({
  message: {
    type: Object as () => Message,
    required: true
  },
  currentUserId: {
    type: String,
    required: true
  },
  delay: {
    type: Number,
    default: 0
  }
});

// Định nghĩa emits
defineEmits(['hoverMessage', 'showReactionPicker', 'addReaction']);

// Định dạng nội dung với links
const formattedContent = computed(() => {
  if (!props.message.content) return '';
  
  // Regex để nhận diện URL trong tin nhắn
  const urlRegex = /(@?https?:\/\/[^\s]+)/gi;
  
  // Thay thế URL bằng thẻ HTML với các thuộc tính CSS đặc biệt
  return props.message.content.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; display: inline-block; max-width: 100%; overflow-wrap: break-word; word-break: break-all;">${url}</a>`;
  });
});
</script> 