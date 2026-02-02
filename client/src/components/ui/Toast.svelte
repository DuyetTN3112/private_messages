<script lang="ts">
  import { chatState } from '$lib/chat.svelte';
</script>

<div class="toast-container">
  <div class="toast-content">
    {chatState.toast_message}
  </div>
</div>
