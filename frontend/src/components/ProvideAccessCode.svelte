<script lang="ts">
  import { closeModal } from "svelte-modals";
  import sodium from "libsodium-wrappers";

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
        <h2>enter access code</h2>
      </div>
      <form on:submit|preventDefault={attemptAccessCode} class="inline-form">
        <div class="generate-pass">
          <input
            bind:value={givenAccessCode}
            type="password"
            placeholder="Enter access code"
            autofocus={true}
          />
        </div>
        <button>Submit</button>
      </form>
    </div>
  </div>
{/if}

<style>
  .generate-pass input {
    width: 100%;
  }
</style>
