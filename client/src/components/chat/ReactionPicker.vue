<template>
  <div 
    @click="$emit('close')"
    style="
      position: fixed; 
      inset: 0; 
      background: rgba(0, 0, 0, 0.3);
      display: flex; 
      align-items: center; 
      justify-content: center; 
      z-index: 60;
    "
  >
    <div 
      @click.stop
      style="
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(1rem);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        border-radius: 1rem;
        padding: 0.75rem;
        max-width: 16rem;
        width: auto;
        animation: fadeIn 0.2s ease-out;
      "
    >
      <p style="color: rgba(255, 255, 255, 0.7); text-align: center; margin-bottom: 0.5rem; font-size: 0.75rem;">
        Thả cảm xúc
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
        <button
          v-for="(emoji, idx) in reactions"
          :key="idx"
          @click="selectReaction(emoji)"
          style="
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.5rem;
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            cursor: pointer;
            transition: all 0.2s;
          "
          class="hover-scale"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Định nghĩa kiểu dữ liệu cho tin nhắn
interface Message {
  sender_id: string;
  content: string;
  created_at?: string;
  reactions?: string[];
}

// Props
const props = defineProps({
  reactions: {
    type: Array as () => string[],
    default: () => ['❤️', '👍', '😂', '😮', '🔥', '👏', '🎉', '💯']
  },
  message: {
    type: Object as () => Message,
    required: true
  }
});

// Emits
const emit = defineEmits(['select', 'close']);

// Methods
const selectReaction = (emoji: string) => {
  emit('select', props.message, emoji);
};
</script> 