<script lang="ts">
  import { HighlightSvelte } from 'svelte-highlight'
  import classicDark from 'svelte-highlight/src/styles/classic-dark'
  import { useParams } from 'svelte-navigator'

  const code: string = `import os
print(f"{os.path.join('greg', 'mike')}")`
  const params = useParams()
  const pasteId: string = $params.pasteId
  const pasteSecret: string = location.hash.substring(1)
</script>

<svelte:head>
    {@html classicDark}
</svelte:head>

<HighlightSvelte {code} />
