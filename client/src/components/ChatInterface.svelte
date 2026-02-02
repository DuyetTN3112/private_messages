<script lang="ts">
  import { onMount } from 'svelte';
  import { chatState } from '../lib/chat.svelte';
  
  // UI Components
  import Background from './ui/Background.svelte';
  import Toast from './ui/Toast.svelte';
  
  // Chat Components
  import MessageBubble from './chat/MessageBubble.svelte';
  import MessageInput from './chat/MessageInput.svelte';
  import ReactionPicker from './chat/ReactionPicker.svelte';
  import ChatStats from './chat/ChatStats.svelte';
  import WaitingScreen from './chat/WaitingScreen.svelte';
  import DisconnectedModal from './chat/DisconnectedModal.svelte';

  let message_container = $state<HTMLElement | null>(null);

  onMount(() => {
    if (message_container) {
      chatState.setContainer(message_container);
    }
    return () => chatState.cleanup();
  });
</script>

<div class="main-container">
  <Background />

  <div class="content-wrapper">
    <div class="chat-box">
      <div class="header-container">
        <ChatStats />
      </div>

      <div class="messages-area">
        <div bind:this={message_container} class="messages-scroll">
          {#if chatState.is_waiting}
            <WaitingScreen />
          {:else if chatState.is_matched}
            {#each chatState.messages as msg, index (index)}
              <MessageBubble {msg} {index} />
            {/each}
          {/if}
        </div>
      </div>

      <MessageInput />
    </div>
  </div>

  {#if chatState.partner_disconnected}
    <DisconnectedModal />
  {/if}

  {#if chatState.reactionPickerMessage}
    <ReactionPicker />
  {/if}

  {#if chatState.show_toast}
    <Toast />
  {/if}
</div>

