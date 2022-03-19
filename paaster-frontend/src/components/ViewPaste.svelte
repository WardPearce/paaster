<script lang="ts">
  import CryptoJS from 'crypto-js'

  import { HighlightAuto } from 'svelte-highlight'
  import rosPine from 'svelte-highlight/src/styles/ros-pine'

  import { navigate } from 'svelte-navigator'

  import Fa from 'svelte-fa'
  import {
    faTrashAlt, faCopy, faDownload
  } from '@fortawesome/free-solid-svg-icons'

  import { acts } from '@tadashi/svelte-loading'
  import { toast } from '@zerodevx/svelte-toast'

  import { useParams } from 'svelte-navigator'

  import Mousetrap from 'mousetrap'
  import { saveAs } from 'file-saver'
  
  import { getPaste, deletePaste, updateDeleteAfter } from '../api'
  import { LocalPaste } from '../helpers/localPastes'

  import hljs from 'highlight.js'
  hljs.highlightAll()

  acts.show(true)


  const params = useParams()
  // Server side paste id.
  const pasteId: string = $params.pasteId
  // Client side generated encryption key.
  const clientSecretKey: string = location.hash.substring(1)

  const localPaste = new LocalPaste(pasteId)
  // Used to delete an existing paste.
  let pasteDetails = localPaste.getPaste()

  const deleteAfterOptions = {
    'never': -1,
    'being viewed': 0,
    '5 mins': 0.08333,
    '15 mins': 0.25,
    '30 mins': 0.5,
    '1 hr': 1,
    '2 hrs': 2,
    '3 hrs': 3,
    '4 hrs': 4,
    '5 hrs': 5,
    '6 hrs': 6,
    '7 hrs': 7,
    '8 hrs': 8,
    '9 hrs': 9,
    '10 hrs': 10,
    '11 hrs': 11,
    '12 hrs': 12,
    '1 day': 24,
    '2 day': 48,
    '3 day': 72,
    '4 day': 96,
    '5 day': 120,
    '6 day': 144,
    '1 wk': 168,
    '2 wks': 336,
    '1 mth': 730,
    '2 mths': 1461,
    '3 mths': 2192
  }
  let selectedHrs = pasteDetails && pasteDetails.deleteAfter ? deleteAfterOptions[pasteDetails.deleteAfter] : -1

  let code = ''

  getPaste(pasteId).then(encryptedData => {
    try {
      code = CryptoJS.AES.decrypt(
        encryptedData, clientSecretKey
      ).toString(CryptoJS.enc.Utf8)
    } catch {
      toast.push('Unable to decrypt paste with provided key.')
      navigate('/')
    }

    acts.show(false)
  }).catch(error => {
    if (pasteDetails) {
      localPaste.deletePaste()
    }

    toast.push(error.toString())
    navigate('/')
    acts.show(false)
  })

  function copyToClip() {
    toast.push('Copied code to clipboard!')
    navigator.clipboard.writeText(code) 
  }

  function downloadCode() {
    toast.push('Saving code!')
    saveAs(
      new Blob([code], {type: 'text/plain;charset=utf-8'}),
      `${pasteId}.txt`
    )
  }

  Mousetrap.bind(
    ['command+a', 'ctrl+a'],
    () => {
      copyToClip()
      return false
    }
  )

  Mousetrap.bind(
    ['command+x', 'ctrl+x'],
    () => {
      toast.push('Copied URL to clipboard!')
      navigator.clipboard.writeText(location.href)
      return false
    }
  )

  Mousetrap.bind(
    ['command+s', 'ctrl+s'],
    () => {
      downloadCode()
      return false
    }
  )

  async function deletePasteOn(): Promise<void> {
    acts.show(true)
    try {
      await deletePaste(pasteId, pasteDetails.serverSecret)
      toast.push('Deleted paste!')
      localPaste.deletePaste()
      navigate('/')
    } catch (error) {
      toast.push(error.toString())
    }
    acts.show(false)
  }

  async function deleteAfter(): Promise<void> {
    try {
      await updateDeleteAfter(pasteId, selectedHrs, pasteDetails.serverSecret)

      // Get human friendly string from hours.
      const humanFriendlyDeleteAfter = Object.keys(
        deleteAfterOptions
      )[Object.values(deleteAfterOptions).indexOf(selectedHrs)]

      const updatedDetails = {
        deleteAfter: humanFriendlyDeleteAfter,
        clientSecret: clientSecretKey,
        pasteId: pasteId,
        serverSecret: pasteDetails.serverSecret,
        created: pasteDetails.created
      }

      // Overwite localStorage paste.
      localPaste.setPaste(updatedDetails)
      pasteDetails = updatedDetails
  
      toast.push(`Paste will be deleted after ${humanFriendlyDeleteAfter}`)
    } catch (error) {
      toast.push(error.toString())
    }
  }
</script>

<svelte:head>
  {@html rosPine}
</svelte:head>

{#if pasteDetails}
  <div class="paste-owner">
    <button on:click={deletePasteOn}>
      <Fa icon={faTrashAlt}></Fa>
      Delete
    </button>

    <label class="delete-after-lab" for="delete-after">delete after</label>
    <select name="delete-after" bind:value={selectedHrs} on:change={async () => deleteAfter()}>
      {#each Object.entries(deleteAfterOptions) as [title, hours]}
        <option value={hours}>{ title }</option>
      {/each}
    </select>
  </div>
{/if}

<HighlightAuto code={code} />

<footer>
  <button
  class="dark-button"
  style="height:80%;"
  on:click={copyToClip}
  ><Fa icon={faCopy} /> Copy all</button>
  <button
  class="dark-button"
  style="height:80%; margin-left:1em;"
  on:click={downloadCode}
  ><Fa icon={faDownload} /> Download</button>
</footer>
