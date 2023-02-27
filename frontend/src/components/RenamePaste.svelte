<script lang="ts">
  import { closeModal } from "svelte-modals";
  import toast from "svelte-french-toast";
  import { _ } from "svelte-i18n";

  import { getPaste, updatePaste } from "../lib/savedPaste";
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
    await updatePaste(pasteId, { name: newName });
    if (completedEvent) completedEvent(pasteId);
    toast.success($_("paste_actions.rename.success"));
    closeModal();
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <div class="header">
        <h2>{$_("paste_actions.rename.model.header")}</h2>
      </div>
      <form on:submit|preventDefault={nameUpdated} class="inline-form">
        <input
          bind:value={newName}
          type="text"
          placeholder="..."
          autofocus={true}
        />
        <button>{$_("paste_actions.rename.button")}</button>
      </form>
    </div>
  </div>
{/if}
