<template>
  <div style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(0.25rem); padding: 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: right;">
    <!-- Stats container (simplified) -->
    <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.8);">
      <div>👥 {{ onlineUsers }} người dùng</div>
      <div>⏳ {{ waitingUsers }} đang chờ</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  onlineUsers: {
    type: Number,
    default: 0
  },
  waitingUsers: {
    type: Number,
    default: 0
  }
});
</script> 