<script lang="ts">
  import { chatState, type Message } from '$lib/chat.svelte';
  import { summarize_reactions_by_emoji } from '$lib/reaction-utils';
  import { User, Smile } from 'lucide-svelte';

  interface Props {
    msg: Message;
    index: number;
  }

  const { msg, index }: Props = $props();

  const isMe = $derived(msg.sender_id === chatState.socket_id);

  const reactionSummary = $derived.by(() => {
    return summarize_reactions_by_emoji(msg.reactions);
  });
  
  // Format content to linkify URLs
  const formattedContent = $derived.by(() => {
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
        

      </p>
      
      <button 
        class="reaction-trigger hover-scale"
        onclick={(e) => { e.stopPropagation(); chatState.showReactionPicker(msg); }}
        aria-label="React to message"
      >
        <Smile size={12} style="color: rgba(255, 255, 255, 0.7);" />
      </button>
    </div>

    {#if msg.reactions.length > 0}
      <div class="reactions-display" class:is-me={isMe}>
        {#each reactionSummary as reactionItem (`${reactionItem.emoji}-${reactionItem.count}`)}
          <div
            class="reaction-item hover-scale"
            role="button"
            tabindex="0"
            onclick={() => chatState.addReaction(msg, reactionItem.emoji)}
            onkeydown={(e) => e.key === 'Enter' && chatState.addReaction(msg, reactionItem.emoji)}
          >
            {reactionItem.emoji}{reactionItem.count > 1 ? ` ${reactionItem.count}` : ''}
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
