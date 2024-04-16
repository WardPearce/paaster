<script lang="ts">
  import sodium from "libsodium-wrappers-sumo";
  import toast from "svelte-french-toast";
  import { _ } from "svelte-i18n";
  import { closeModal } from "svelte-modals";

  import { paasterClient } from "../lib/client";
  import { generatePassphrase } from "../lib/niceware";

  export let pasteId: string;
  export let ownerSecret: string;
  export let b64EncodedRawKey: string;
  export let isOpen: boolean;

  let accessCode = ["", "", "", ""];
  let codeString = "";

  async function generateAccessCode() {
    accessCode = generatePassphrase(8);
    codeString = accessCode.join("-").toLowerCase();

    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const opsLimit = sodium.crypto_pwhash_OPSLIMIT_MODERATE;
    const memLimit = sodium.crypto_pwhash_MEMLIMIT_MODERATE;

    const derivedCode = sodium.crypto_pwhash(
      32,
      codeString,
      salt,
      opsLimit,
      memLimit,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    await toast.promise(
      paasterClient.default.controllerPastePasteIdOwnerSecretUpdatePaste(
        pasteId,
        ownerSecret,
        {
          access_code: {
            code: sodium.to_base64(derivedCode),
            mem_limit: memLimit,
            ops_limit: opsLimit,
            salt: sodium.to_base64(salt),
          },
        }
      ),
      {
        loading: $_("paste_actions.access_code.loading"),
        success: $_("paste_actions.access_code.success"),
        error: $_("paste_actions.access_code.error"),
      }
    );
  }

  async function copyCodeToClipboard() {
    try {
      await navigator.clipboard.writeText(codeString);
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
      <form
        on:submit|preventDefault={generateAccessCode}
        class="generate-pass-form"
      >
        <div class="generate-pass">
          <ul>
            {#each accessCode as code}
              <li>
                <input type="text" bind:value={code} disabled={true} />
                <p>-</p>
              </li>
            {/each}
          </ul>
        </div>
        {#if !codeString}
          <button type="submit"
            ><i class="las la-redo-alt" />
            {$_("paste_actions.access_code.model.tooltip")}</button
          >
        {:else}
          <button type="button" on:click={copyCodeToClipboard}
            ><i class="las la-copy" />{$_(
              "paste_actions.access_code.model.button"
            )}</button
          >
        {/if}
      </form>
    </div>
  </div>
{/if}
