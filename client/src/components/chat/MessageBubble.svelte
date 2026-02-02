<script lang="ts">
  import { chatState, type Message } from '$lib/chat.svelte';
  import { User, Smile } from 'lucide-svelte';

  interface Props {
    msg: Message;
    index: number;
  }

  let { msg, index }: Props = $props();

  let isMe = $derived(msg.sender_id === chatState.socket_id);
  
  // Format content to linkify URLs
  let formattedContent = $derived.by(() => {
    if (!msg.content) return '';
    const urlRegex = /(@?https?:\/\/[^\s]+)/gi;
    return msg.content.replace(urlRegex, (url: string) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; display: inline-block; max-width: 100%; overflow-wrap: break-word; word-break: break-all;">${url}</a>`;
    });
  });
</script>

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
      role="group"
    >
      <p class="content">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
        aria-label="React to message"
      >
        <Smile size={12} style="color: rgba(255, 255, 255, 0.7);" />
      </button>
    </div>

    {#if msg.reactions && msg.reactions.length > 0}
      <div class="reactions-display" class:is-me={isMe}>
        {#each msg.reactions as reaction (reaction)}
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
