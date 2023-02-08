<script lang="ts">
  import { navigate } from "svelte-navigator";
  import { HighlightAuto, LineNumbers } from "svelte-highlight";
  import rosPine from "svelte-highlight/styles/ros-pine";
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import sodium from "libsodium-wrappers";
  import { acts } from "@tadashi/svelte-loading";
  import toast from "svelte-french-toast";
  import { openModal } from "svelte-modals";
  import Mousetrap from "mousetrap";
  import Select from "svelte-select";

  import { pasteStore } from "../stores";
  import { paasterClient } from "../lib/client";
  import type { PasteModel } from "../lib/client/models/PasteModel";
  import { ApiError } from "../lib/client/core/ApiError";
  import { deletePaste, getPaste, savePaste } from "../lib/client/savedPaste";

  export let pasteId: string;

  let ownerSecret = "";
  let isSaved = false;
  let rawCode = "";
  let pasteCreated: number;
  let timePeriods = [
    { value: -1, label: "being view" },
    { value: 0, label: "never" },
    { value: 0.08333, label: "5 minutes" },
    { value: 0.25, label: "15 minutes" },
    { value: 0.5, label: "30 minutes" },
    { value: 1, label: "1 hour" },
    { value: 2, label: "2 hour" },
    { value: 3, label: "3 hour" },
    { value: 4, label: "4 hour" },
    { value: 5, label: "5 hour" },
    { value: 6, label: "6 hour" },
    { value: 7, label: "7 hour" },
    { value: 8, label: "8 hour" },
    { value: 9, label: "9 hour" },
    { value: 10, label: "10 hour" },
    { value: 11, label: "11 hour" },
    { value: 12, label: "12 hour" },
    { value: 24, label: "1 day" },
    { value: 48, label: "2 days" },
    { value: 72, label: "3 days" },
    { value: 96, label: "4 days" },
    { value: 120, label: "5 days" },
    { value: 144, label: "6 days" },
    { value: 168, label: "1 week" },
    { value: 336, label: "2 weeks" },
    { value: 504, label: "3 weeks" },
    { value: 730, label: "1 month" },
    { value: 1461, label: "2 months" },
    { value: 2192, label: "3 months" },
  ];
  let selectedTime = null;

  acts.show(true);

  function renamePaste() {
    openModal(() => import("../components/RenamePaste.svelte"), {
      pasteId: pasteId,
    });
  }

  async function shareLinkToClipboard() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied");
  }

  async function expireAfter(event: {
    detail: { value: number; label: string };
  }) {
    await toast.promise(
      paasterClient.default.controllerPasteUpdatePaste(pasteId, ownerSecret, {
        expires_in_hours: event.detail.value,
      }),
      {
        loading: "Updating expire after",
        success: `Paste set to expire in ${event.detail.label}`,
        error: "Unable to set expire after",
      }
    );
  }

  async function deletePasteCall() {
    try {
      await toast.promise(
        paasterClient.default.controllerPasteDeletePaste(pasteId, ownerSecret),
        {
          loading: "Deleting paste",
          success: "Paste deleted",
          error: "Paste not found",
        }
      );
      await deletePaste(pasteId);
      navigate("/", { replace: true });
    } catch {
      toast.error("Unable to delete paste");
    }
  }

  async function download() {
    const anchor = document.createElement("a");
    const url = window.URL.createObjectURL(
      new Blob([rawCode], { type: "octet/stream" })
    );
    anchor.href = url;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  async function savePasteLocal() {
    await savePaste(pasteId, location.hash.substring(1), pasteCreated);
    toast.success("Paste saved");
    isSaved = true;
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(rawCode);
    toast.success("Paste copied");
  }

  onMount(async () => {
    try {
      const savedPaste = await getPaste(pasteId);
      if (savedPaste.ownerSecret) ownerSecret = savedPaste.ownerSecret;
      isSaved = true;
    } catch {}

    // If user just created paste,
    // avoid needing to download & decrypt paste for speed reasons.
    let storedPaste = get(pasteStore);
    if (storedPaste !== "") {
      rawCode = storedPaste;
      pasteStore.set("");
      acts.show(false);
      return;
    }

    await sodium.ready;

    if (location.hash === "") {
      toast.error("Paste secret key not provided");
      acts.show(false);
      navigate("/", { replace: true });
      return;
    }

    let rawSecretKey: Uint8Array;
    try {
      rawSecretKey = sodium.from_base64(
        location.hash.substring(1),
        sodium.base64_variants.URLSAFE_NO_PADDING
      );
    } catch {
      toast.error("Invalid Secret key format");
      acts.show(false);
      navigate("/", { replace: true });
      return;
    }

    let paste: PasteModel;
    try {
      paste = await paasterClient.default.controllerPasteGetPaste(pasteId);
    } catch (error) {
      if (error instanceof ApiError) {
        // Delete paste from local storage if no longer exists on server.
        if (error.status === 404) {
          await deletePaste(pasteId);
          toast.error("Paste no longer exists");
        } else {
          toast.error(error.body.detail);
        }
      } else if (error instanceof Error) toast.error(error.toString());
      acts.show(false);
      navigate("/", { replace: true });
      return;
    }

    if (ownerSecret !== "" && paste.expires_in_hours !== null) {
      timePeriods.forEach((time) => {
        if (time.value === paste.expires_in_hours) {
          selectedTime = time;
          return true;
        }
      });
    }

    let response: Response;
    try {
      response = await fetch(paste.download_url);
    } catch {
      toast.error("Unable to download paste from CDN, try again later");
      acts.show(false);
      navigate("/", { replace: true });
      return;
    }

    try {
      rawCode = new TextDecoder("utf8").decode(
        sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null,
          new Uint8Array(await response.arrayBuffer()),
          null,
          sodium.from_base64(
            paste.iv,
            sodium.base64_variants.URLSAFE_NO_PADDING
          ),
          rawSecretKey
        )
      );
    } catch (error) {
      if (error instanceof Error) toast.error(error.toString());
      acts.show(false);
      navigate("/", { replace: true });
      return;
    }

    pasteCreated = Number(paste.created);

    acts.show(false);

    Mousetrap.bind(["command+a", "ctrl+a"], () => {
      copyToClipboard();
      return false;
    });
    Mousetrap.bind(["command+x", "ctrl+x"], () => {
      copyToClipboard();
      return false;
    });
    Mousetrap.bind(["command+s", "ctrl+s"], () => {
      download();
      return false;
    });
  });
</script>

<svelte:head>
  {@html rosPine}
</svelte:head>

{#if ownerSecret !== ""}
  <main>
    <section>
      <h3>owner panel</h3>
      <div class="owner-panel">
        <button on:click={renamePaste}
          ><i class="las la-pencil-alt" />rename</button
        >
        <button on:click={shareLinkToClipboard}
          ><i class="las la-share" />share</button
        >
        <Select
          items={timePeriods}
          clearable={false}
          placeholder="Expire after"
          on:change={expireAfter}
          bind:value={selectedTime}
        />
        <button class="danger" on:click={deletePasteCall}
          ><i class="las la-trash" />delete</button
        >
      </div>
    </section>
  </main>
{/if}

<footer>
  <button on:click={download}><i class="las la-download" />Download</button>
  <button on:click={copyToClipboard}><i class="las la-copy" />Copy</button>

  {#if !isSaved}
    <button on:click={savePasteLocal}><i class="las la-save" />Save</button>
  {/if}
</footer>

{#if rawCode !== ""}
  <div class="content">
    <HighlightAuto code={rawCode} let:highlighted>
      <LineNumbers {highlighted} />
    </HighlightAuto>
  </div>
{/if}

<style>
  .content {
    margin-top: 1em;
    margin-bottom: 20em;
  }

  .owner-panel {
    margin-top: 0.5em;
    display: flex;
    column-gap: 1em;
  }

  @media screen and (max-width: 600px) {
    .owner-panel {
      flex-direction: column;
      row-gap: 1em;
    }
  }
</style>
