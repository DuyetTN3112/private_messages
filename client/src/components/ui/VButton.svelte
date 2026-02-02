<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  
  interface Props extends HTMLButtonAttributes {
    className?: string;
    children?: import('svelte').Snippet;
  }

  let { className = '', children, ...rest }: Props = $props();
</script>

<button 
  class="v-button {className}"
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</button>

<style>
  .v-button {
    border-radius: 1rem;
    padding: 0.75rem;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    background: transparent;
  }

  .v-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
