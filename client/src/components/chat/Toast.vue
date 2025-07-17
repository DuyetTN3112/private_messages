<template>
  <div 
    style="position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(0.25rem); padding: 0.75rem 1rem; border-radius: 1rem; color: white; font-size: 0.875rem; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); animation: fadeIn 0.5s ease-out forwards; z-index: 50;"
  >
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps({
  message: {
    type: String,
    required: true
  }
});
</script> 