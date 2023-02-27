<script lang="ts">
  import { closeModal } from "svelte-modals";
  import sodium from "libsodium-wrappers";
  import { _ } from "svelte-i18n";

  export let isOpen: boolean;
  export let b64EncodedRawKey: string;
  export let loadPasteFunc: Function;

  let givenAccessCode: string;

  async function attemptAccessCode() {
    closeModal();
    await loadPasteFunc(
      sodium.to_base64(
        sodium.crypto_generichash(64, givenAccessCode, b64EncodedRawKey),
        sodium.base64_variants.URLSAFE_NO_PADDING
      )
    );
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <div class="header">
        <h2>{$_("require_access_code_model.header")}</h2>
      </div>
      <form on:submit|preventDefault={attemptAccessCode} class="inline-form">
        <div class="require-access-code">
          <input
            bind:value={givenAccessCode}
            type="password"
            placeholder={$_("require_access_code_model.input")}
            autofocus={true}
          />
        </div>
        <button>{$_("require_access_code_model.button")}</button>
      </form>
    </div>
  </div>
{/if}

<style>
  .require-access-code {
    display: flex;
  }

  .require-access-code input {
    width: 100%;
  }
</style>
