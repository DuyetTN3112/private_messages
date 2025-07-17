<template>
  <div>
    <!-- Animated Background Blobs -->
    <div style="position: absolute; inset: 0;">
      <div style="position: absolute; top: 25%; left: 25%; width: 16rem; height: 16rem; background: rgba(255, 255, 255, 0.03); border-radius: 100%; filter: blur(3rem); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
      <div style="position: absolute; bottom: 25%; right: 25%; width: 16rem; height: 16rem; background: rgba(255, 255, 255, 0.03); border-radius: 100%; filter: blur(3rem); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; animation-delay: 1s;"></div>
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 16rem; height: 16rem; background: rgba(255, 255, 255, 0.03); border-radius: 100%; filter: blur(3rem); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; animation-delay: 2s;"></div>
    </div>

    <!-- Floating Particles -->
    <div style="position: absolute; inset: 0; overflow: hidden; pointer-events: none;">
      <div
        v-for="i in numberOfParticles"
        :key="i"
        :style="{
          position: 'absolute',
          width: '0.25rem',
          height: '0.25rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '100%',
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: Math.random() * 5 + 's',
          left: Math.random() * 100 + '%',
          top: Math.random() * 100 + '%',
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  numberOfParticles: {
    type: Number,
    default: 15
  }
});
</script> 