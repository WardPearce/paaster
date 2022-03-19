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
  
  import { getPaste, deletePaste } from '../api'
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
  const pasteDetails = localPaste.getPaste()

  const deleteAfterOptions = {
    'being view': 0,
    '1 hour': 1,
    '2 hours': 2,
    '3 hours': 3,
    '4 hours': 4,
    '5 hours': 5,
    '6 hours': 6,
    '7 hours': 7,
    '8 hours': 8,
    '9 hours': 9,
    '10 hours': 10,
    '11 hours': 11,
    '12 hours': 12,
    '1 day': 24,
    '2 day': 48,
    '3 day': 72,
    '4 day': 96,
    '5 day': 120,
    '6 day': 144,
    '1 week': 168,
    '2 weeks': 336,
    '1 month': 730,
    '2 months': 1461,
    '3 months': 2192,
  }

  let code = ''

  getPaste(pasteId).then(encryptedData => {
    try {
      code = CryptoJS.AES.decrypt(
        encryptedData, clientSecretKey
      ).toString(CryptoJS.enc.Utf8)
    } catch {
      toast.push('Unable to decrypt paste with provided key.')
      if (pasteDetails) {
        localPaste.deletePaste()
      }
      navigate('/')
    }

    acts.show(false)
  }).catch(error => {
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

    <select>
      <option disabled selected hidden>Delete after</option>

      {#each Object.entries(deleteAfterOptions) as [title, value]}
        <option>{ title }</option>
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
