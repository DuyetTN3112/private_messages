<script lang="ts">
  import { chatState } from '$lib/chat.svelte';
</script>

<div 
  onclick={() => chatState.reactionPickerMessage = null}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Escape' && (chatState.reactionPickerMessage = null)}
  class="picker-overlay"
>
  <div 
    onclick={(e) => e.stopPropagation()}
    role="presentation"
    class="picker-content"
  >
    <p class="picker-title">Thả cảm xúc</p>
    <div class="reactions-grid">
      {#each chatState.quickReactions as emoji (emoji)}
        <button
          onclick={() => chatState.reactionPickerMessage && chatState.addReaction(chatState.reactionPickerMessage, emoji)}
          class="reaction-button hover-scale"
        >
          {emoji}
        </button>
      {/each}
    </div>
  </div>
</div>
