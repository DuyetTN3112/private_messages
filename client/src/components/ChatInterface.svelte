<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { chatState } from '../lib/chat.svelte';
  import { User, Smile, Send } from 'lucide-svelte';

  let message_container = $state<HTMLElement | null>(null);
  let inputText = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let showEmojis = $state(false);
  const emojis = ['😊', '😂', '❤️', '👍', '👎', '😍', '😢', '😮', '😡', '🎉', '☕', '🔥', '💯', '🚀', '✨'];

  onMount(() => {
    if (message_container) {
      chatState.setContainer(message_container);
    }
    return () => chatState.cleanup();
  });

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

  // Snippets
  
  {#snippet Background(numberOfParticles = 15)}
    <div class="background-container">
      <div class="blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>
      <div class="particles">
        {#each Array(numberOfParticles) as _, i}
          <div
            class="particle"
            style="
              animation-duration: {3 + Math.random() * 4}s;
              animation-delay: {Math.random() * 5}s;
              left: {Math.random() * 100}%;
              top: {Math.random() * 100}%;
            "
          ></div>
        {/each}
      </div>
    </div>
  {/snippet}

  {#snippet MessageBubble(msg: any, index: number)}
    {@const isMe = msg.sender_id === chatState.socket_id}
    {@const formattedContent = (() => {
      if (!msg.content) return '';
      const urlRegex = /(@?https?:\/\/[^\s]+)/gi;
      return msg.content.replace(urlRegex, (url: string) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; display: inline-block; max-width: 100%; overflow-wrap: break-word; word-break: break-all;">${url}</a>`;
      });
    })()}

    <div
      class="message-container"
      class:is-me={isMe}
      style="animation-delay: {index * 0.1}s;"
    >
      {#if !isMe}
        <div class="avatar avatar-partner">
          <User size={16} color="white" />
        </div>
      {/if}

      <div class="bubble-wrapper" style="order: {isMe ? '-1' : '0'};">
        <div
          class="bubble"
          class:me={isMe}
          class:partner={!isMe}
          onmouseenter={() => chatState.hoveredMessage = msg}
          onmouseleave={() => chatState.hoveredMessage = null}
        >
          <p class="content">
            {@html formattedContent}
            
            {#if msg.reactions && msg.reactions.length > 0}
              <span class="inline-reactions">
                {msg.reactions.join(' ')}
              </span>
            {/if}
          </p>
          
          <button 
            class="reaction-trigger hover-scale"
            onclick={(e) => { e.stopPropagation(); chatState.showReactionPicker(msg); }}
          >
            <Smile size={12} style="color: rgba(255, 255, 255, 0.7);" />
          </button>
        </div>

        {#if msg.reactions && msg.reactions.length > 0}
          <div class="reactions-display" class:is-me={isMe}>
            {#each msg.reactions as reaction}
              <div
                class="reaction-item hover-scale"
                role="button"
                tabindex="0"
                onclick={() => chatState.addReaction(msg, reaction)}
                onkeydown={(e) => e.key === 'Enter' && chatState.addReaction(msg, reaction)}
              >
                {reaction}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if isMe}
        <div class="avatar avatar-me">
          <User size={16} color="white" />
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet MessageInput()}
    <div class="input-container">
      {#if showEmojis}
        <div class="emoji-picker">
          {#each emojis as emoji}
            <button
              onclick={() => addEmoji(emoji)}
              class="emoji-btn"
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
          >
            <Smile size={20} />
          </button>
        </div>
        
        <button 
          onclick={handleSendMessage}
          disabled={!chatState.is_connected || !inputText.trim()}
          class="send-button"
          type="button"
        >
          <Send size={16} color="white" />
        </button>
      </div>
    </div>
  {/snippet}

  {#snippet WaitingScreen()}
    <div class="waiting-container">
      <p class="waiting-text">Đang chờ người khác tham gia...</p>
      <div class="dots">
        <div class="dot"></div>
        <div class="dot" style="animation-delay: 0.1s;"></div>
        <div class="dot" style="animation-delay: 0.2s;"></div>
      </div>
    </div>
  {/snippet}

  {#snippet DisconnectedModal()}
    <div class="modal-overlay">
      <div class="modal-content">
        <h3 class="modal-title">Đã ngắt kết nối</h3>
        <p class="modal-text">Người trò chuyện đã ngắt kết nối. Đang tìm người mới...</p>
        <div class="spinner">
          <div class="dots">
            <div class="dot"></div>
            <div class="dot" style="animation-delay: 0.1s;"></div>
            <div class="dot" style="animation-delay: 0.2s;"></div>
          </div>
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet ReactionPicker()}
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
          {#each chatState.quickReactions as emoji}
            <button
              onclick={() => chatState.addReaction(chatState.reactionPickerMessage!, emoji)}
              class="reaction-button hover-scale"
            >
              {emoji}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/snippet}

  {#snippet Toast()}
    <div class="toast-container">
      <div class="toast-content">
        {chatState.toast_message}
      </div>
    </div>
  {/snippet}
</script>

<div class="main-container">
  {@render Background()}

  <div class="content-wrapper">
    <div class="chat-box">
      <div class="header-container">
        <div class="stats">
          <div>👥 {chatState.online_users} người dùng</div>
          <div>⏳ {chatState.waiting_users} đang chờ</div>
        </div>
      </div>

      <div class="messages-area">
        <div bind:this={message_container} class="messages-scroll">
          {#if chatState.is_waiting}
            {@render WaitingScreen()}
          {:else if chatState.is_matched}
            {#each chatState.messages as msg, index}
              {@render MessageBubble(msg, index)}
            {/each}
          {/if}
        </div>
      </div>

      {@render MessageInput()}
    </div>
  </div>

  {#if chatState.partner_disconnected}
    {@render DisconnectedModal()}
  {/if}

  {#if chatState.reactionPickerMessage}
    {@render ReactionPicker()}
  {/if}

  {#if chatState.show_toast}
    {@render Toast()}
  {/if}
</div>
