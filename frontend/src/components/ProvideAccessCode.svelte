<script lang="ts">
  import { closeModal } from "svelte-modals";
  import sodium from "libsodium-wrappers";
  import { _ } from "svelte-i18n";

  export let isOpen: boolean;
  export let b64EncodedRawKey: string;
  export let loadPasteFunc: Function;

  let accessCode = ["", "", "", ""];

  async function onCodeInputted(event) {
    if (event.data === null) return;

    if (event.data.includes("-")) {
      accessCode = event.data.split("-");
      await attemptAccessCode();
    }
  }

  async function attemptAccessCode() {
    await loadPasteFunc(
      sodium.to_base64(
        sodium.crypto_generichash(
          64,
          accessCode.join("-").toLowerCase(),
          b64EncodedRawKey
        ),
        sodium.base64_variants.URLSAFE_NO_PADDING
      )
    );
    closeModal();
  }
</script>

{#if isOpen}
  <div role="dialog" class="modal">
    <div class="contents">
      <div class="header">
        <h2>{$_("require_access_code_model.header")}</h2>
      </div>
      <form on:submit|preventDefault={() => {}} class="generate-pass-form">
        <div class="generate-pass">
          <ul>
            {#each Array(accessCode.length) as _, index}
              <li>
                <input
                  type="text"
                  bind:value={accessCode[index]}
                  autofocus={index === 0}
                  on:input={onCodeInputted}
                />
                <p>-</p>
              </li>
            {/each}
          </ul>
        </div>
        <button type="button" on:click={attemptAccessCode}
          >{$_("require_access_code_model.button")}</button
        >
      </form>
    </div>
  </div>
{/if}
