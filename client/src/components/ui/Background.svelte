<script lang="ts">
  interface Props {
    numberOfParticles?: number;
  }

  let { numberOfParticles = 15 }: Props = $props();
</script>

<div class="background-container">
  <div class="blobs">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  </div>
  <div class="particles">
    {#each Array(numberOfParticles) as _, i (i)}
      <div
        class="particle"
        style="
          animation-duration: {3 + Math.random() * 4}s;
          animation-delay: {Math.random() * 5}s;
          left: {Math.random() * 100}%;
          top: {Math.random() * 100}%;
        "
      ></div>
    {/each}
  </div>
</div>

<style>
/* Copying styles from original file, assuming they are in global or scoped */
/* Since I don't see styles in the original file view, they might be in index.css or global.
   However, Svelte components usually have <style> blocks.
   The original file view `view_file` output didn't show <style> tag at the end?
   Let me double check the `ChatInterface.svelte` content again.
   Ah, I only viewed the first 281 lines. It might have fewer lines or I missed the style block.
   Wait, the `view_file` said "Showing lines 1 to 281" and "The above content shows the entire, complete file contents".
   So `ChatInterface.svelte` has NO style block? Then the styles must be global.
   If styles are global, I don't need to put them here, BUT it is better to move component-specific styles here.
   However, since I don't see the styles, I will just keep the markup.
   The user said "code quá là loạn", so maybe styles are also messy.
   But for now I'll just move markup and logic.
*/
</style>
