<script lang="ts">
  import CryptoJS from 'crypto-js'

  import { HighlightSvelte } from 'svelte-highlight'
  import classicDark from 'svelte-highlight/src/styles/classic-dark'

  import { navigate } from 'svelte-navigator'

  import Fa from 'svelte-fa'
  import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'

  import { acts } from '@tadashi/svelte-loading'
  import { toast } from '@zerodevx/svelte-toast'

  import { useParams } from 'svelte-navigator'

  import Mousetrap from 'mousetrap'
  
  import { getPaste } from '../api/index'

  acts.show(true)

  const params = useParams()
  // Server side paste id.
  const pasteId: string = $params.pasteId
  // Client side generated encryption key.
  const clientSecretKey: string = location.hash.substring(1)
  // Used to delete an existing paste.
  const serverSecret = localStorage.getItem(pasteId)
  let code = ''

  getPaste(pasteId).then(encryptedData => {
    try {
      code = CryptoJS.AES.decrypt(encryptedData, clientSecretKey).toString(CryptoJS.enc.Utf8)
    } catch {
      toast.push('Unable to decrypt paste with provided key.')
      navigate('/')
      acts.show(false)
      return
    }
  })

  function codeToClip() {
    toast.push('Copied to clipboard')
    navigator.clipboard.writeText(code)
    return false
  }

  Mousetrap.bind(
    ['command+a', 'ctrl+a'],
    codeToClip
  )

  acts.show(false)

</script>

<svelte:head>
    {@html classicDark}
</svelte:head>

{#if serverSecret}
  <div class="paste-del">
    <button>
      <Fa icon={faTrashAlt}></Fa>
      Delete
    </button>
  </div>
{/if}

<HighlightSvelte {code} />
