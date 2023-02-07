<script lang="ts">
  import { closeModal } from "svelte-modals";
  import toast from "svelte-french-toast";

  import { getPaste, setPasteName } from "../lib/client/savedPaste";
  import { onMount } from "svelte";

  export let isOpen: boolean;
  export let pasteId: string;
  export let completedEvent: Function | null = null;

  let newName: string = "";

  onMount(async () => {
    const paste = await getPaste(pasteId);
    if (paste.name) newName = paste.name;
  });

  async function nameUpdated() {
    await setPasteName(pasteId, newName);
    if (completedEvent) completedEvent(pasteId);
    toast.success("Name updated");
    closeModal();
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <div class="header">
        <h2>rename paste</h2>
        <button on:click={closeModal}><i class="las la-times" /></button>
      </div>
      <form
        on:submit|preventDefault={nameUpdated}
        style="display: flex;justify-content: center;column-gap: 1em;"
      >
        <input bind:value={newName} type="text" placeholder="..." />
        <button>rename</button>
      </form>
    </div>
  </div>
{/if}
