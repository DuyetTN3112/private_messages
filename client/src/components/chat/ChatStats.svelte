<script lang="ts">
  import { chatState } from '$lib/chat.svelte';
</script>

<div class="stats">
  <div>👥 {chatState.online_users} người dùng</div>
  <div>⏳ {chatState.waiting_users} đang chờ</div>
</div>
