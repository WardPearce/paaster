<script lang="ts">
  import { tooltip } from "@svelte-plugins/tooltips";
  import sodium from "libsodium-wrappers";
  import toast from "svelte-french-toast";
  import { closeModal } from "svelte-modals";
  import { _ } from "svelte-i18n";

  import { paasterClient } from "../lib/client";

  export let pasteId: string;
  export let ownerSecret: string;
  export let b64EncodedRawKey: string;
  export let isOpen: boolean;

  let accessCode = "";

  function generateAccessCode() {
    accessCode = sodium.to_base64(
      sodium.randombytes_buf(16),
      sodium.base64_variants.URLSAFE_NO_PADDING
    );
  }

  async function setAccessCode() {
    if (accessCode.length < 6) {
      toast.error(
        $_("paste_actions.access_code.access_code_len", {
          values: { max_length: 6 },
        })
      );
      return;
    }
    await toast.promise(
      paasterClient.default.controllerPasteUpdatePaste(pasteId, ownerSecret, {
        access_code: sodium.to_base64(
          sodium.crypto_generichash(64, accessCode, b64EncodedRawKey),
          sodium.base64_variants.URLSAFE_NO_PADDING
        ),
      }),
      {
        loading: $_("paste_actions.access_code.loading"),
        success: $_("paste_actions.access_code.success"),
        error: $_("paste_actions.access_code.error"),
      }
    );

    try {
      await navigator.clipboard.writeText(accessCode);
      toast.success(
        $_("paste_actions.access_code.success_copied_to_clipboard")
      );
    } catch {}

    closeModal();
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <div class="header">
        <h2>{$_("paste_actions.access_code.model.header")}</h2>
      </div>
      <form on:submit|preventDefault={setAccessCode} class="inline-form">
        <div class="generate-pass">
          <input
            bind:value={accessCode}
            type="text"
            placeholder={$_("paste_actions.access_code.model.input")}
            autofocus={true}
          />
          <button
            on:click={generateAccessCode}
            type="button"
            use:tooltip={{
              content: $_("paste_actions.access_code.model.tooltip"),
            }}><i class="las la-redo-alt" /></button
          >
        </div>
        <button>{$_("paste_actions.access_code.model.button")}</button>
      </form>
    </div>
  </div>
{/if}

<style>
  .generate-pass {
    display: flex;
  }

  .generate-pass button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    width: 20%;
  }

  .generate-pass input {
    width: 80%;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
</style>
