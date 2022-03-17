<script lang="ts">
  import CryptoJS from 'crypto-js'

  import { HighlightAuto } from 'svelte-highlight'
  import rosPine from 'svelte-highlight/src/styles/ros-pine'

  import { navigate } from 'svelte-navigator'

  import Fa from 'svelte-fa'
  import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'

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
    toast.push(error.toString())
    navigate('/')
    acts.show(false)
  })

  Mousetrap.bind(
    ['command+a', 'ctrl+a'],
    () => {
      toast.push('Copied code to clipboard!')
      navigator.clipboard.writeText(code)
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
      toast.push('Saving code!')
      saveAs(
        new Blob([code], {type: 'text/plain;charset=utf-8'}),
        `${pasteId}.txt`
      )
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
  <div class="paste-del">
    <button on:click={deletePasteOn}>
      <Fa icon={faTrashAlt}></Fa>
      Delete
    </button>
  </div>
{/if}

<HighlightAuto code={code} />
