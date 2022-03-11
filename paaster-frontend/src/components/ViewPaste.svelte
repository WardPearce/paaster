<script lang="ts">
  import { HighlightSvelte } from 'svelte-highlight'
  import classicDark from 'svelte-highlight/src/styles/classic-dark'

  import Fa from 'svelte-fa'
  import { faTrashAlt } from '@fortawesome/free-solid-svg-icons'

  import { toast } from '@zerodevx/svelte-toast'

  import { useParams } from 'svelte-navigator'

  import Mousetrap from 'mousetrap'

  const code: string = `import os
print(f"{os.path.join('greg', 'mike')}")`

  function codeToClip() {
    toast.push('Copied to clipboard')
    navigator.clipboard.writeText(code)
    return false
  }

  Mousetrap.bind(
    ['command+a', 'ctrl+a'],
    codeToClip
  )

  const params = useParams()
  // Server side paste id.
  const pasteId: string = $params.pasteId
  // Client side generated encryption key.
  const clientSecretKey: string = location.hash.substring(1)
  // Used to delete an existing paste.
  const serverSecret = localStorage.getItem(pasteId)
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
