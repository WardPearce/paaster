<script lang="ts">
  import sodium from "libsodium-wrappers";
  import { _ } from "svelte-i18n";
  import { closeModal } from "svelte-modals";

  export let isOpen: boolean;
  export let b64EncodedRawKey: string;
  export let loadPasteFunc: Function;

  let accessCode = ["", "", "", ""];

  async function onCodeInputted() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let inputtedCode = document.getElementById("inputtedCode").value;

    if (inputtedCode.includes("-")) {
      accessCode = inputtedCode.split("-");
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
      <form
        on:submit|preventDefault={attemptAccessCode}
        class="generate-pass-form"
      >
        <div class="generate-pass">
          <ul>
            {#each Array(accessCode.length) as _, index}
              <li>
                <input
                  type="text"
                  bind:value={accessCode[index]}
                  autofocus={index === 0}
                  id="inputtedCode"
                  on:input={onCodeInputted}
                />
                <p>-</p>
              </li>
            {/each}
          </ul>
        </div>
        <button type="submit" on:click={attemptAccessCode}
          >{$_("require_access_code_model.button")}</button
        >
      </form>
    </div>
  </div>
{/if}
