<template>
  <button 
    :class="[
      'rounded-2xl px-3 py-3 transition-all duration-300 flex items-center justify-center',
      className
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  className: {
    type: String,
    default: ''
  }
});

defineOptions({
  inheritAttrs: false
});
</script> 