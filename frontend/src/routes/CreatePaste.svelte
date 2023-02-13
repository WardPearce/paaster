<script lang="ts">
  import sodium from "libsodium-wrappers";
  import { acts } from "@tadashi/svelte-loading";
  import toast from "svelte-french-toast";
  import { filedrop } from "filedrop-svelte";
  import { navigate } from "svelte-navigator";

  import { pasteStore } from "../stores";
  import { ApiError } from "../lib/client/core/ApiError";
  import { savePaste } from "../lib/client/savedPaste";
  import type { PasteCreatedModel } from "../lib/client/models/PasteCreatedModel";

  let isLoading = false;
  let pastedCode = "";

  async function onFileDrop(event: CustomEvent) {
    pastedCode = await event.detail.files.accepted[0].text();
    await pasteSubmit(true);
  }

  async function pasteSubmit(pastePrefilled = false) {
    isLoading = true;
    acts.show(true);

    if (pastedCode === "") {
      // Adds support for Chrome and Webkit
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      pastedCode = document.getElementById("pastedCode").value;
    } else if (!pastePrefilled) {
      // Handle how mobile sends input events for each line
      // of inputted code.
      return;
    }

    await sodium.ready;

    let createdPaste: PasteCreatedModel;
    let rawUrlSafeKey: string;

    try {
      const rawKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();
      const rawIv = sodium.randombytes_buf(
        sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES
      );

      const cipherArray = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        new TextEncoder().encode(pastedCode),
        null,
        null,
        rawIv,
        rawKey
      );
      rawUrlSafeKey = sodium.to_base64(
        rawKey,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );
      const rawUrlSafeIv = sodium.to_base64(
        rawIv,
        sodium.base64_variants.URLSAFE_NO_PADDING
      );

      // Not supported by OpenAPI.
      let response = await fetch(
        `${import.meta.env.VITE_API_URL}/controller/paste/${rawUrlSafeIv}`,
        {
          method: "POST",
          body: new Blob([cipherArray.buffer]),
        }
      );
      createdPaste = await response.json();
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.body.detail);
      else if (error instanceof Error) toast.error(error.toString());
      return;
    }
    pasteStore.set(pastedCode);

    isLoading = false;
    acts.show(false);

    await savePaste(
      createdPaste._id,
      rawUrlSafeKey,
      createdPaste.created,
      createdPaste.owner_secret
    );

    navigate(`/${createdPaste._id}#${rawUrlSafeKey}`, { replace: true });
  }
</script>

<div
  use:filedrop={{ fileLimit: 1, clickToUpload: false, windowDrop: true }}
  on:filedrop={onFileDrop}
/>

<main>
  <textarea
    on:input={pasteSubmit}
    value=""
    placeholder="paste or drag & drop your code here"
    name="create-paste"
    disabled={isLoading}
    id="pastedCode"
  />

  <section>
    <h3>how we protect your privacy.</h3>
    <p>
      Paaster utilizes end-to-end encryption for storing and sharing pastes,
      meaning even the server can't view what you save here.
    </p>
    <p>
      Our source code is completely open source and can be reviewed on <a
        href="https://github.com/WardPearce/paaster"
        referrerpolicy="no-referrer">Github</a
      >.
    </p>
  </section>
</main>
