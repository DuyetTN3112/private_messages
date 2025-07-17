<template>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
    <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 0.75rem;">Đang chờ người khác tham gia...</p>
    <div style="display: flex; gap: 0.5rem;">
      <div style="width: 0.5rem; height: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 100%; animation: bounce 1s infinite;"></div>
      <div style="width: 0.5rem; height: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 100%; animation: bounce 1s infinite; animation-delay: 0.1s;"></div>
      <div style="width: 0.5rem; height: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 100%; animation: bounce 1s infinite; animation-delay: 0.2s;"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component này không cần state hay logic gì thêm
</script> 