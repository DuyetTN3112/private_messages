<template>
  <div style="padding: 0.75rem; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(0.5rem); border-top: 1px solid rgba(255, 255, 255, 0.1);">
    <div style="display: flex; gap: 0.75rem; align-items: center;">
      <!-- Input container with glassmorphic effect -->
      <div style="position: relative; flex: 1; margin-right: 0;">
        <input
          ref="inputRef"
          v-model="inputText"
          type="text"
          placeholder="Nhập tin nhắn..."
          @keydown.enter="sendMessage"
          :disabled="!isConnected"
          style="
            width: 100%; 
            background: rgba(255, 255, 255, 0.1); 
            backdrop-filter: blur(0.75rem); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            border-radius: 9999px; 
            padding: 0.75rem 2.5rem 0.75rem 1.5rem; 
            color: white; 
            font-size: 0.875rem;
            outline: none;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          "
        />
        
        <!-- Smiley face icon -->
        <div 
          @click="toggleEmojiPicker" 
          style="
            position: absolute; 
            right: 0.75rem; 
            top: 50%; 
            transform: translateY(-50%); 
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            width: 1.5rem;
            height: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </div>

        <!-- Emoji picker panel -->
        <div
          v-if="showEmojis"
          style="
            position: absolute;
            bottom: 100%;
            left: 0;
            width: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(0.75rem);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.75rem;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 0.5rem;
            z-index: 2;
          "
        >
          <button
            v-for="emoji in emojis"
            :key="emoji"
            @click="addEmoji(emoji)"
            style="
              background: transparent;
              border: none;
              cursor: pointer;
              font-size: 1.25rem;
              padding: 0.25rem;
              border-radius: 0.25rem;
              transition: all 0.2s;
            "
            class="hover:bg-white/10"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
      
      <!-- Send button -->
      <button 
        @click="sendMessage"
        :disabled="!isConnected || !inputText.trim()"
        style="
          width: 2.75rem; 
          height: 2.75rem; 
          min-width: 2.75rem;
          border-radius: 9999px; 
          background: rgba(0, 0, 0, 0.6); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        "
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  isConnected: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['sendMessage', 'showToast']);

// Data
const inputText = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const showEmojis = ref(false);

// Emoji data
const emojis = ['😊', '😂', '❤️', '👍', '👎', '😍', '😢', '😮', '😡', '🎉', '☕', '🔥', '💯', '🚀', '✨'];

// Methods
const sendMessage = () => {
  if (inputText.value.trim() && props.isConnected) {
    emit('sendMessage', inputText.value);
    inputText.value = '';
    showEmojis.value = false;
  }
};

const toggleEmojiPicker = () => {
  showEmojis.value = !showEmojis.value;
};

const addEmoji = (emoji: string) => {
  inputText.value += emoji;
  inputRef.value?.focus();
};
</script> 