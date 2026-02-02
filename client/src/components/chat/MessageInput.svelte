<script lang="ts">
  import { chatState } from '$lib/chat.svelte';
  import { Send, Smile } from 'lucide-svelte';

  let inputText = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let showEmojis = $state(false);
  
  const emojis = ['😊', '😂', '❤️', '👍', '👎', '😍', '😢', '😮', '😡', '🎉', '☕', '🔥', '💯', '🚀', '✨'];

  const handleSendMessage = () => {
    if (inputText.trim()) {
      chatState.send_message(inputText);
      inputText = '';
      showEmojis = false;
    }
  };

  const addEmoji = (emoji: string) => {
    inputText += emoji;
    inputRef?.focus();
  };
</script>

<div class="input-container">
  {#if showEmojis}
    <div class="emoji-picker">
      {#each emojis as emoji (emoji)}
        <button
          onclick={() => addEmoji(emoji)}
          class="emoji-btn"
          aria-label="Add emoji {emoji}"
        >
          {emoji}
        </button>
      {/each}
    </div>
  {/if}

  <div class="input-wrapper">
    <div class="input-field-wrapper">
      <input
        bind:this={inputRef}
        bind:value={inputText}
        type="text"
        placeholder="Nhập tin nhắn..."
        onkeydown={(e) => e.key === 'Enter' && handleSendMessage()}
        disabled={!chatState.is_connected}
        class="input-field"
      />
      
      <button 
        onclick={() => showEmojis = !showEmojis} 
        class="emoji-trigger"
        type="button"
        aria-label="Open emoji picker"
      >
        <Smile size={20} />
      </button>
    </div>
    
    <button 
      onclick={handleSendMessage}
      disabled={!chatState.is_connected || !inputText.trim()}
      class="send-button"
      type="button"
      aria-label="Send message"
    >
      <Send size={16} color="black" />
    </button>
  </div>
</div>
