<template>
  <div style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(0.25rem); display: flex; align-items: center; justify-content: center; z-index: 20;">
    <div style="background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(0.75rem); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 1.5rem; padding: 1.5rem; max-width: 24rem; width: 100%; margin: 0 1rem;">
      <h3 style="color: white; text-align: center; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem;">Đã ngắt kết nối</h3>
      <p style="color: rgba(255, 255, 255, 0.8); text-align: center; margin-bottom: 1.5rem;">Người trò chuyện đã ngắt kết nối. Đang tìm người mới...</p>
      <div style="display: flex; justify-content: center;">
        <div style="display: flex; gap: 0.5rem;">
          <div style="width: 0.5rem; height: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 100%; animation: bounce 1s infinite;"></div>
          <div style="width: 0.5rem; height: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 100%; animation: bounce 1s infinite; animation-delay: 0.1s;"></div>
          <div style="width: 0.5rem; height: 0.5rem; background: rgba(255, 255, 255, 0.6); border-radius: 100%; animation: bounce 1s infinite; animation-delay: 0.2s;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component này không cần state hay logic gì thêm
</script> 